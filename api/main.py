from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, delete, update
from typing import List, Optional
from pydantic import BaseModel
from database import get_db, engine, Base
from models import Product, Webhook
import shutil
import os
import uuid
import uvicorn
import httpx
from celery import Celery
from pathlib import Path
from worker import celery_app, process_csv_upload, delete_all_products_task


app = FastAPI(Title="Acme Product Importer")

# Mount static files for the UI
app.mount("/static", StaticFiles(directory="./../app/static"), name="static")

# Startup: Create Tables
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# --- Pydantic Models ---
class ProductRead(BaseModel):
    id: int
    sku: str
    name: str
    description: Optional[str]
    is_active: bool

class ProductCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str]
    is_active: bool = True

class WebhookCreate(BaseModel):
    url: str
    event_type: str
    is_active: bool = True


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/", response_class=HTMLResponse)
async def root():
    with open("./../app/static/index.html", "r", encoding="utf-8") as f:
        return f.read()

# 1. CSV Upload Endpoint
@app.post("/api/upload")
async def upload_products(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type")

    # Ensure shared directory exists
    shared_dir = Path("./shared")
    shared_dir.mkdir(parents=True, exist_ok=True)
    
    # Use a fixed filename that will be overwritten on each upload
    file_path = shared_dir / "latest_upload.csv"

    # Remove existing file if it exists
    if file_path.exists():
        file_path.unlink()
    
    # Save the uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Convert Path to string before passing to Celery task
    task = process_csv_upload.delay(str(file_path))

    return {"task_id": task.id, "message": "Upload processing started"}
    #return {"message": "Upload Started"}

# 2. Task Status Check (Polling)
@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    task_result = celery_app.AsyncResult(task_id)
    
    response = {
        "state": task_result.state,
        "progress": 0,
        "info": ""
    }
    
    if task_result.state == 'PROGRESS':
        response["progress"] = task_result.info.get('percent', 0)
        response["info"] = f"Processed {task_result.info.get('current')} rows..."
    elif task_result.state == 'SUCCESS':
        response["progress"] = 100
        response["info"] = "Import Complete"
    elif task_result.state == 'FAILURE':
        response["info"] = str(task_result.info)
        
    return response

# 3. Product Management (CRUD)
@app.get("/api/products", response_model=dict)
async def list_products(
    page: int = 1, 
    limit: int = 20, 
    search: Optional[str] = None, 
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    query = select(Product).order_by(Product.id.desc()).offset(offset).limit(limit)
    
    if search:
        # Simple filter by SKU or Name
        query = query.filter(
            (Product.sku.ilike(f"%{search}%")) | 
            (Product.name.ilike(f"%{search}%"))
        )
    
    try:
        result = await db.execute(query)
        products = result.scalars().all()
        
        # Convert SQLAlchemy models to dictionaries
        products_data = [{
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "description": p.description,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None
        } for p in products]
        
        return {"data": products_data, "page": page, "limit": limit}
    except Exception as e:
        print(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products")
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db)):
    # Ensure SKU is unique/lower
    product.sku = product.sku.lower().strip()
    new_prod = Product(**product.dict())
    db.add(new_prod)
    try:
        await db.commit()
        await db.refresh(new_prod)
        return new_prod
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="SKU already exists")

@app.delete("/api/products/bulk")
async def delete_all_products():
    # Async task for bulk delete
    task = delete_all_products_task.delay()
    return {"message": "Bulk delete initiated", "task_id": task.id}


@app.delete("/api/products/{id}")
async def delete_product(id: int, db: AsyncSession = Depends(get_db)):
    query = delete(Product).where(Product.id == id)
    await db.execute(query)
    await db.commit()
    return {"message": "Deleted"}

# 4. Webhook Management
@app.get("/api/webhooks")
async def get_webhooks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Webhook))
    return result.scalars().all()

@app.post("/api/webhooks")
async def create_webhook(webhook: WebhookCreate, db: AsyncSession = Depends(get_db)):
    new_hook = Webhook(**webhook.dict())
    db.add(new_hook)
    await db.commit()
    return new_hook

@app.put("/api/webhooks/{id}")
async def update_webhook(
        id: int,
        webhook: WebhookCreate,     # reuse schema, or define a separate one if you prefer partial updates
        db: AsyncSession = Depends(get_db)
):
    query = select(Webhook).where(Webhook.id == id)
    result = await db.execute(query)
    hook = result.scalar_one_or_none()
    if not hook:
        raise HTTPException(status_code=404, detail="Not found")

    for key, value in webhook.dict().items():
        setattr(hook, key, value)
    await db.commit()
    await db.refresh(hook)
    return hook

@app.delete("/api/webhooks/{id}")
async def delete_webhook(id: int, db: AsyncSession = Depends(get_db)):
    query = delete(Webhook).where(Webhook.id == id)
    result = await db.execute(query)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await db.commit()
    return {"message": "Deleted"}

@app.patch("/api/webhooks/{id}/toggle")
async def toggle_webhook(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Webhook).where(Webhook.id == id))
    hook = result.scalar_one_or_none()
    if not hook:
        raise HTTPException(status_code=404, detail="Not found")

    hook.is_active = not hook.is_active
    await db.commit()
    await db.refresh(hook)
    return hook

@app.post("/api/webhooks/test")
async def test_webhook(url: str = Query(..., description="The URL to test")):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json={"test": True})
        return {
            "status_code": response.status_code,
            "elapsed_ms": response.elapsed.total_seconds() * 1000,
        }
    except httpx.RequestError as exc:
        raise HTTPException(status_code=400, detail=f"Request failed: {exc}")


#Run Server
if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)