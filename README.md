# Product Importer - Deployment Guide

## Application Overview
A FastAPI-based product import system with CSV upload, product management, and webhook functionality.

### Features
- CSV file upload with async processing
- Product CRUD operations
- Webhook management and testing
- Bulk product operations
- Real-time task progress tracking

## Deployment on Render

### Prerequisites
- Render account (free tier available)
- GitHub repository with this code

### Quick Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **Deploy on Render**
   - Go to [render.com](https://render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

3. **Services Created**
   - **Web Service**: FastAPI application
   - **Worker Service**: Celery background tasks
   - **PostgreSQL Database**: Product data storage
   - **Redis**: Message queue and caching

### Environment Variables
Render automatically configures these from `render.yaml`:
- `DATABASE_URL`: PostgreSQL connection string
- `CELERY_BROKER_URL`: Redis connection for tasks
- `CELERY_RESULT_BACKEND`: Redis for task results
- `REDIS_URL`: Redis connection

### Manual Environment Variables (if needed)
Add these in Render dashboard:
- `PYTHONPATH=/app`

## Testing the Deployment

Once deployed, your app will be available at:
- Main app: `https://your-app-name.onrender.com`
- Health check: `https://your-app-name.onrender.com/health`

### Test Features
1. **CSV Upload**: Upload a CSV with columns `sku`, `name`, `description`
2. **Product Management**: Create, view, delete products
3. **Webhooks**: Add/test webhook endpoints
4. **Bulk Operations**: Delete all products

## Free Tier Limitations
- Render free tier: 750 hours/month
- PostgreSQL: 256MB storage
- Redis: 256MB storage
- Auto-sleeps after 15 minutes inactivity

## Alternative Platforms
If Render doesn't work, consider:
- **Railway**: Similar deployment, also free tier
- **Fly.io**: More complex but powerful
- **Heroku**: Requires paid plan for background workers

## Local Development
```bash
# Setup
cd api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start services (requires PostgreSQL and Redis)
uvicorn main:app --reload
celery -A worker.celery_app worker --loglevel=info
```
