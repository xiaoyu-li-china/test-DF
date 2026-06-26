from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from database import (
    get_db,
    init_db,
    SessionLocal,
    ProtectedResource,
)
from auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
    get_current_user,
    create_default_user,
    refresh_access_token,
)
from schemas import (
    Token,
    LoginRequest,
    RefreshTokenRequest,
    UserResponse,
    ProtectedResourceCreate,
    ProtectedResourceResponse,
)

app = FastAPI(title="Auth Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()
    db = SessionLocal()
    create_default_user(db)
    db.close()


@app.post(
    "/auth/login",
    response_model=Token,
    tags=["Auth"],
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Invalid credentials"},
    },
)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=1)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    refresh_token = create_refresh_token()
    user.refresh_token = refresh_token
    user.refresh_token_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@app.post(
    "/auth/refresh",
    response_model=Token,
    tags=["Auth"],
    responses={
        200: {"description": "Token refreshed successfully"},
        401: {"description": "Invalid or expired refresh token"},
    },
)
async def refresh_token_endpoint(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    return refresh_access_token(db, request.refresh_token)


@app.post(
    "/auth/logout",
    tags=["Auth"],
    responses={
        200: {"description": "Logged out successfully"},
    },
)
async def logout(db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    user = db.query(type(current_user)).filter(type(current_user).id == current_user.id).first()
    if user:
        user.refresh_token = None
        user.refresh_token_expires_at = None
        db.commit()
    return {"message": "Logged out successfully"}


@app.get(
    "/auth/me",
    response_model=UserResponse,
    tags=["Auth"],
)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user


@app.get(
    "/api/protected-resources",
    response_model=List[ProtectedResourceResponse],
    tags=["Protected"],
)
async def list_resources(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    return db.query(ProtectedResource).filter(
        ProtectedResource.owner_id == current_user.id
    ).all()


@app.post(
    "/api/protected-resources",
    response_model=ProtectedResourceResponse,
    tags=["Protected"],
)
async def create_resource(
    resource: ProtectedResourceCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    db_resource = ProtectedResource(
        name=resource.name,
        content=resource.content,
        owner_id=current_user.id,
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
