from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import engine, Base
from app.routes.bookings import router as bookings_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="场地预订系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bookings_router)


@app.get("/")
def root():
    return {"message": "场地预订系统 API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
