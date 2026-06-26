from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, crud, models
from ..auth import get_current_user

router = APIRouter(prefix="/policies", tags=["保单管理"])


@router.post("/", response_model=schemas.PolicyResponse)
def create_policy(
    policy: schemas.PolicyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_policy = crud.get_policy_by_number(db, policy_number=policy.policy_number)
    if db_policy:
        raise HTTPException(status_code=400, detail="保单号已存在")
    return crud.create_policy(db=db, policy=policy)


@router.get("/{policy_number}", response_model=schemas.PolicyResponse)
def get_policy(
    policy_number: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_policy = crud.get_policy_by_number(db, policy_number=policy_number)
    if not db_policy:
        raise HTTPException(status_code=404, detail="保单不存在")
    return db_policy
