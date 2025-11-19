from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI(Title="Acme Product Importer")

# Mount static files for the UI
app.mount("/static", StaticFiles(directory="./../app/static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    with open("./../app/static/index.html", "r") as f:
        return f.read()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

#Run Server
if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

