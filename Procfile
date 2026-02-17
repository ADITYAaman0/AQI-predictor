# Procfile for Railway/Heroku deployment
# Defines different process types for your application

# Web process - FastAPI backend
web: uvicorn src.api.main:app --host 0.0.0.0 --port $PORT --workers 2

# Worker process - Celery background tasks
worker: celery -A src.tasks.celery_app worker --loglevel=info --concurrency=2

# Beat scheduler - Celery periodic tasks
beat: celery -A src.tasks.celery_app beat --loglevel=info

# Streamlit dashboard (if deploying separately)
dashboard: streamlit run app.py --server.port $PORT --server.address 0.0.0.0 --server.headless true
