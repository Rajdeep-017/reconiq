"""API v1 router — aggregates all v1 endpoint routers."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.partners import router as partners_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.mappings import router as mappings_router
from app.api.v1.reconciliation import router as reconciliation_router
from app.api.v1.discrepancies import router as discrepancies_router
from app.api.v1.claims import router as claims_router
from app.api.v1.dashboard import router as dashboard_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(partners_router)
api_v1_router.include_router(uploads_router)
api_v1_router.include_router(mappings_router)
api_v1_router.include_router(reconciliation_router)
api_v1_router.include_router(discrepancies_router)
api_v1_router.include_router(claims_router)
api_v1_router.include_router(dashboard_router)
