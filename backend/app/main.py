import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.presentation.api.v1.auth import router as auth_router
from app.presentation.api.v1.catalog import products_router, services_router
from app.presentation.api.v1.customers import router as customers_router
from app.presentation.api.v1.expenses_dashboard import dashboard_router, expenses_router
from app.presentation.api.v1.invoices import router as invoices_router
from app.presentation.api.v1.payments import router as payments_router
from app.presentation.api.v1.reports import router as reports_router
from app.presentation.api.v1.supporting import router as supporting_router

settings = get_settings()
logging.basicConfig(
    level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
logger = logging.getLogger("bizpilot")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("BizPilot API starting", extra={"environment": settings.app_env})
    yield
    logger.info("BizPilot API stopped")


app = FastAPI(
    title="BizPilot API",
    version="1.0.0",
    description="Clean Architecture REST API for BizPilot",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled request error", extra={"path": request.url.path, "method": request.method}
    )
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred"})


@app.get("/health", tags=["system"])
def health():
    return {"status": "healthy", "service": "bizpilot-api"}


docs_enabled = settings.app_env.lower() != "production"
api = FastAPI(
    title="BizPilot v1",
    version="1.0.0",
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
)
api.include_router(auth_router)
api.include_router(customers_router)
api.include_router(products_router)
api.include_router(services_router)
api.include_router(supporting_router)
api.include_router(invoices_router)
api.include_router(payments_router)
api.include_router(reports_router)
api.include_router(expenses_router)
api.include_router(dashboard_router)
app.mount("/api/v1", api)
