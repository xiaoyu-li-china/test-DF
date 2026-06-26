from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app import models, crud, schemas
from app.models import UserRole

Base.metadata.create_all(bind=engine)


def init_test_data():
    db = SessionLocal()
    try:
        admin_user = crud.get_user_by_username(db, "admin")
        if not admin_user:
            crud.create_user(
                db,
                schemas.UserCreate(
                    username="admin",
                    full_name="系统管理员",
                    password="admin123",
                    role=UserRole.ADMIN
                )
            )
            print("创建管理员用户: admin / admin123")

        surveyor_user = crud.get_user_by_username(db, "surveyor001")
        if not surveyor_user:
            crud.create_user(
                db,
                schemas.UserCreate(
                    username="surveyor001",
                    full_name="查勘员张三",
                    password="123456",
                    role=UserRole.SURVEYOR
                )
            )
            print("创建查勘员用户: surveyor001 / 123456")

        test_policy = crud.get_policy_by_number(db, "NX2024000001")
        if not test_policy:
            crud.create_policy(
                db,
                schemas.PolicyCreate(
                    policy_number="NX2024000001",
                    policy_holder_name="李农民",
                    insurance_type="水稻种植保险",
                    insured_amount=50000.0
                )
            )
            print("创建测试保单: NX2024000001")

        print("数据初始化完成!")
    finally:
        db.close()


if __name__ == "__main__":
    init_test_data()
