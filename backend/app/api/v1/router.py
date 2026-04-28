from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, individual_searches, dashboard

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(users.sub_router)
api_router.include_router(individual_searches.router)
api_router.include_router(dashboard.router)
