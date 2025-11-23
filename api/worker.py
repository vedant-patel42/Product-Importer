import os
import asyncio
import pandas as pd
from celery import Celery
from models import Product, Base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Celery Setup
# Update the Celery configuration at the top of worker.py
celery_app = Celery(
    "worker",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

# # Database setup for Worker (Needs its own engine instance)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://acme_user:acme_password@localhost/acme_db")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def process_chunk(session, chunk_data):
    """
    Perform bulk upsert for a chunk of data.
    PostgreSQL ON CONFLICT is used to handle duplicates (Update on Duplicate).
    """
    insert_stmt = insert(Product).values(chunk_data)
    
    # Update existing record if SKU matches
    do_update_stmt = insert_stmt.on_conflict_do_update(
        index_elements=['sku'],
        set_={
            'name': insert_stmt.excluded.name,
            'description': insert_stmt.excluded.description,
            # 'is_active': insert_stmt.excluded.is_active # Optional: if CSV contains status
        }
    )
    try:
        await session.execute(do_update_stmt)
        await session.commit()
    except (IntegrityError, DBAPIError) as err:
        # Print the exact PostgreSQL error
        print("DB-API error:", err.orig)        # ← real reason
        print("SQLAlchemy stmt:", err.statement)
        print("Params example:", err.params[:1])  # show one row
        await session.rollback()
        raise

@celery_app.task(bind=True)
def process_csv_upload(self, file_path):
    """
    Reads a CSV file and imports it into the DB asynchronously.
    Updates task state for UI progress bar.
    """
    # Run async code in sync Celery task
    loop = asyncio.get_event_loop()
    
    try:
        # 1. Read CSV efficiently using Pandas
        # We read in chunks to avoid loading 500k rows into RAM at once
        chunk_size = 1000 
        total_rows = sum(1 for _ in open(file_path)) - 1 # Rough count (minus header)
        
        self.update_state(state='STARTED', meta={'current': 0, 'total': total_rows})
        
        processed_count = 0

        logger.info(f"Processing CSV in chunks of {chunk_size} rows")
        
        # Use pandas to iterate
        with pd.read_csv(file_path, chunksize=chunk_size) as reader:
            loop.run_until_complete(setup_db_context_if_needed())
            
            for chunk in reader:
                # Normalize data
                chunk.columns = [c.lower() for c in chunk.columns]

                # Drop duplicate SKUs within the chunk to avoid ON CONFLICT double-update error
                chunk = chunk.drop_duplicates(subset=["sku"], keep="last")
            
                # Check for required columns
                required_columns = {'sku'}
                missing_columns = required_columns - set(chunk.columns)
                if missing_columns:
                    raise ValueError(f"Missing required columns in CSV: {missing_columns}")
                # Transform to list of dicts for SQLAlchemy
                # Ensure SKU is lowercase for case-insensitive matching logic
                records = []
                for _, row in chunk.iterrows():
                    records.append({
                        "sku": str(row['sku']).lower().strip(),
                        "name": row.get('name', 'Unknown'),
                        "description": row.get('description', ''),
                        "is_active": True # Default as per spec
                    })
                
                # Async DB Write
                async def write_batch():
                    async with AsyncSessionLocal() as session:
                        await process_chunk(session, records)
                
                loop.run_until_complete(write_batch())
                
                processed_count += len(records)
                
                # Update Progress
                self.update_state(state='PROGRESS', meta={
                    'current': processed_count,
                    'total': total_rows,
                    'percent': int((processed_count / total_rows) * 100)
                })

        # Clean up file
        os.remove(file_path)
        return {'current': total_rows, 'total': total_rows, 'status': 'Import Complete'}

    except Exception as e:
        # self.update_state(state='FAILURE', meta={'error': str(e)})
        raise e

@celery_app.task
def delete_all_products_task():
    loop = asyncio.get_event_loop()
    
    async def run_delete():
        async with AsyncSessionLocal() as session:
            await session.execute(text("TRUNCATE TABLE products RESTART IDENTITY;"))
            await session.commit()
            
    loop.run_until_complete(run_delete())
    return "Deleted All"

async def setup_db_context_if_needed():
    # Helper to ensure tables exist if worker starts before web (race condition handling)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)