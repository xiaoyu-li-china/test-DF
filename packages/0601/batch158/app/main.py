from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import engine, Base, get_db
from app.models import Animal, Application, ApplicationStatus, HomeVisitStatus
from app.schemas import (
    ApplicationCreate,
    ApplicationReview,
    ApplicationResponse,
    ApplicationProgress,
    AnimalCreate,
    AnimalResponse,
    HomeVisitSchedule,
    LivingPhotoUpload,
    AvailableTimeSlot,
)
from app.email_service import (
    get_email_service,
    build_approval_email,
    build_rejection_email,
    build_home_visit_scheduled_email,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="流浪动物救助站 - 领养申请审核系统",
    description="申请人提交领养申请，工作人员审核，申请人查询进度",
    version="1.1.0",
    lifespan=lifespan,
)


def photos_str_to_list(photos_str: str | None) -> list[str] | None:
    if not photos_str:
        return None
    return [p.strip() for p in photos_str.split("|") if p.strip()]


def photos_list_to_str(photo_list: list[str]) -> str:
    return "|".join(photo_list)


def enrich_application_photos(app: Application) -> Application:
    app.living_photos = photos_str_to_list(app.living_photos)
    return app


@app.post("/animals", response_model=AnimalResponse, status_code=201, tags=["动物管理"])
def create_animal(body: AnimalCreate, db: Session = Depends(get_db)):
    animal = Animal(**body.model_dump())
    db.add(animal)
    db.commit()
    db.refresh(animal)
    return animal


@app.get("/animals", response_model=list[AnimalResponse], tags=["动物管理"])
def list_animals(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Animal).offset(skip).limit(limit).all()


@app.post("/applications", response_model=ApplicationResponse, status_code=201, tags=["领养申请"])
def submit_application(body: ApplicationCreate, db: Session = Depends(get_db)):
    animal = db.query(Animal).filter(Animal.id == body.animal_id).first()
    if not animal:
        raise HTTPException(status_code=404, detail=f"意向动物 ID={body.animal_id} 不存在")
    if not animal.adoptable:
        raise HTTPException(status_code=409, detail=f"动物 ID={body.animal_id} 已被领养，无法申请")
    application = Application(**body.model_dump())
    db.add(application)
    db.commit()
    db.refresh(application)
    application.animal = animal
    enrich_application_photos(application)
    return application


@app.get("/applications/pending", response_model=list[ApplicationResponse], tags=["领养申请"])
def list_pending(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    rows = (
        db.query(Application)
        .options(joinedload(Application.animal))
        .filter(Application.status == ApplicationStatus.PENDING)
        .order_by(Application.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    for r in rows:
        enrich_application_photos(r)
    return rows


@app.get("/applications/available-slots", response_model=list[AvailableTimeSlot], tags=["家访预约"])
def get_available_time_slots(days_ahead: int = 7):
    slots = []
    today = datetime.now().date()
    for i in range(1, days_ahead + 1):
        date = today + timedelta(days=i)
        if date.weekday() < 5:
            time_slots = ["09:00-11:00", "14:00-16:00", "16:00-18:00"]
        else:
            time_slots = ["10:00-12:00", "14:00-16:00"]
        slots.append(AvailableTimeSlot(date=date.isoformat(), time_slots=time_slots))
    return slots


@app.post(
    "/applications/{application_id}/home-visit",
    response_model=ApplicationResponse,
    tags=["家访预约"],
)
def schedule_home_visit(
    application_id: int, body: HomeVisitSchedule, db: Session = Depends(get_db)
):
    application = (
        db.query(Application)
        .options(joinedload(Application.animal))
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="申请不存在")
    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(status_code=400, detail="仅待审核申请可预约家访")
    application.home_visit_status = HomeVisitStatus.SCHEDULED
    application.home_visit_scheduled_at = body.scheduled_at
    application.home_visit_note = body.note
    db.commit()
    db.refresh(application)
    enrich_application_photos(application)
    if application.applicant_email:
        email_svc = get_email_service()
        email = build_home_visit_scheduled_email(
            application.applicant_name,
            application.animal.name if application.animal else "意向动物",
            body.scheduled_at.strftime("%Y年%m月%d日 %H:%M"),
            body.note,
        )
        email.to_email = application.applicant_email
        email_svc.send(email)
    return application


@app.post(
    "/applications/{application_id}/photos",
    response_model=ApplicationResponse,
    tags=["居住环境照片"],
)
def upload_living_photos(
    application_id: int, body: LivingPhotoUpload, db: Session = Depends(get_db)
):
    application = (
        db.query(Application)
        .options(joinedload(Application.animal))
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="申请不存在")
    existing = photos_str_to_list(application.living_photos) or []
    all_photos = existing + body.photo_urls
    application.living_photos = photos_list_to_str(all_photos)
    db.commit()
    db.refresh(application)
    enrich_application_photos(application)
    return application


@app.patch("/applications/{application_id}", response_model=ApplicationResponse, tags=["领养申请"])
def review_application(application_id: int, body: ApplicationReview, db: Session = Depends(get_db)):
    try:
        application = (
            db.query(Application)
            .filter(Application.id == application_id)
            .with_for_update(nowait=True)
            .first()
        )
        if not application:
            db.rollback()
            raise HTTPException(status_code=404, detail="申请不存在")
        if application.status != ApplicationStatus.PENDING:
            db.rollback()
            raise HTTPException(status_code=400, detail="该申请已被审核，无法重复操作")
        if body.status == ApplicationStatus.PENDING:
            db.rollback()
            raise HTTPException(status_code=400, detail="审核状态不能设为 pending")
        application.status = body.status
        application.reviewer_note = body.reviewer_note
        application.reviewed_at = datetime.utcnow()
        animal = None
        if body.status == ApplicationStatus.APPROVED:
            animal = db.query(Animal).filter(Animal.id == application.animal_id).first()
            if animal:
                animal.adoptable = False
        db.commit()
        application = (
            db.query(Application)
            .options(joinedload(Application.animal))
            .filter(Application.id == application_id)
            .first()
        )
        enrich_application_photos(application)
        if application.applicant_email:
            email_svc = get_email_service()
            animal_name = application.animal.name if application.animal else "意向动物"
            if body.status == ApplicationStatus.APPROVED:
                email = build_approval_email(application.applicant_name, animal_name)
            else:
                email = build_rejection_email(
                    application.applicant_name, animal_name, body.reviewer_note
                )
            email.to_email = application.applicant_email
            email_svc.send(email)
        return application
    except Exception:
        db.rollback()
        raise


@app.get("/applications/me", response_model=list[ApplicationProgress], tags=["领养申请"])
def query_my_applications(
    applicant_name: str = Query(..., description="申请人姓名"),
    applicant_phone: str = Query(..., description="申请人电话"),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Application)
        .options(joinedload(Application.animal))
        .filter(
            Application.applicant_name == applicant_name,
            Application.applicant_phone == applicant_phone,
        )
        .order_by(Application.created_at.desc())
        .all()
    )
    for r in rows:
        enrich_application_photos(r)
    return rows
