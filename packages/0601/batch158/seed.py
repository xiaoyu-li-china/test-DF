from app.database import engine, SessionLocal, Base
from app.models import Animal

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if db.query(Animal).count() == 0:
    seed = [
        Animal(name="大黄", species="犬", breed="中华田园犬", age="3岁", description="性格温顺，已绝育驱虫"),
        Animal(name="咪咪", species="猫", breed="橘猫", age="2岁", description="亲人爱撒娇，已绝育"),
        Animal(name="小黑", species="犬", breed="拉布拉多", age="1岁", description="精力旺盛，适合有院子的家庭"),
        Animal(name="花花", species="猫", breed="三花猫", age="4岁", description="安静乖巧，适合安静的家庭"),
        Animal(name="豆豆", species="兔", breed="荷兰侏儒兔", age="1岁", description="小巧可爱，适合室内饲养"),
    ]
    db.add_all(seed)
    db.commit()
    print(f"已插入 {len(seed)} 条动物数据")
else:
    print("动物数据已存在，跳过种子数据插入")

db.close()
