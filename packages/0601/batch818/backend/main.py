from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db, init_db, User, ProtectedResource
from auth import (
    authenticate_user, create_access_token, create_refresh_token,
    get_current_user, refresh_access_token, create_default_user,
    REFRESH_TOKEN_EXPIRE_DAYS
)
from schemas import (
    Token, LoginRequest, RefreshTokenRequest, UserResponse,
    ResourceCreate, ResourceResponse
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()
    db = next(get_db())
    create_default_user(db)


@app.post("/auth/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
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


@app.post("/auth/refresh", response_model=Token)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    return refresh_access_token(db, request.refresh_token)


@app.post("/auth/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.refresh_token = None
    current_user.refresh_token_expires_at = None
    db.commit()
    return {"message": "Logged out successfully"}


@app.get("/auth/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/protected-resources", response_model=list[ResourceResponse])
def get_resources(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resources = db.query(ProtectedResource).filter(
        ProtectedResource.user_id == current_user.id
    ).all()
    return resources


@app.post("/api/protected-resources", response_model=ResourceResponse)
def create_resource(
    resource: ResourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_resource = ProtectedResource(
        name=resource.name,
        content=resource.content,
        user_id=current_user.id
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
