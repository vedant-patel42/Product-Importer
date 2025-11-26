# Product Importer - Deployment Guide

## Application Overview
A FastAPI-based  web application that can import product rom a CSV file (approximately 500,000 records) into a SQL database. The app is designed  for scalability and optimized performance when handling large datasets.
### Features
- Large CSV file upload with async processing
- Product CRUD operations
- Webhook management and testing
- Bulk product operations
- Real-time task progress tracking

## Deployment on fly.io

### Prerequisites
- fly.io account (free tier available)
- GitHub repository with this code

### Quick Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **Deploy on Fly.io**
   - Go to [fly.io](https://fly.io)
   - Connect your GitHub repository
   - fly.io will automatically create `fly.toml`

3. **Alternatively, deploy through terminal**
   - Install flyctl from homebrew
   - Run flyctl deploy -a product-importer

4. **Services Created**
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

## Testing the Deployment

Once deployed, your app will be available at:
- Main app: `https://product-importer.fly.dev/`
- Health check: `https://product-importer.fly.dev/health`

### Test Features
1. **CSV Upload**: Upload a CSV with columns `sku`, `name`, `description`
2. **Product Management**: Create, view, delete products
3. **Webhooks**: Add/test webhook endpoints
4. **Bulk Operations**: Delete all products

## Alternative Platforms
If fly.io doesn't work, consider:
- **Railway**: Similar deployment, also free tier
- **Heroku**: Requires paid plan for background workers

## Local Development
```bash
# Setup
cd api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start services (requires PostgreSQL and Redis), Run from directory
uvicorn api.main:app --reload 
celery -A api.worker.celery_app worker --loglevel=info
```