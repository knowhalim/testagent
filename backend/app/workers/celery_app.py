from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "testagent",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=600,
    task_time_limit=660,
    task_routes={
        "app.workers.uat_task.run_uat_test": {"queue": "uat"},
        "app.workers.ui_audit_task.run_ui_audit": {"queue": "audit"},
        "app.workers.ux_audit_task.run_ux_audit": {"queue": "audit"},
    },
)

celery_app.autodiscover_tasks(["app.workers"])
