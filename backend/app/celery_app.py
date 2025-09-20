from celery import Celery
import os

# Get Redis URL from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Initialize Celery
celery_app = Celery(
    "pdf_manager",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.ocr_tasks"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Task expiration
    result_expires=3600,
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

print(f"✅ Celery initialized with broker: {REDIS_URL}")

if __name__ == "__main__":
    celery_app.start()