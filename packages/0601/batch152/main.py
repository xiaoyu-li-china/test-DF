from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, policies, images

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="农险理赔现场拍照上传系统 API",
    description="查勘员现场照片上传、保单影像管理系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(policies.router)
app.include_router(images.router)


@app.get("/", tags=["根路径"])
async def root():
    return {
        "message": "农险理赔现场拍照上传系统 API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["健康检查"])
async def health_check():
    return {"status": "healthy"}
