from sqlalchemy.orm import Session
from .models import Question

def seed_basic(db: Session):
    if db.query(Question).count() > 0:
        return
    samples = [
        dict(subject="算数", topic="割合", text="仕入れ値に20%の利益で販売価格は1,200円。仕入れ値は？", hint="販売=仕入×1.2", correct="1000", unit="円"),
        dict(subject="算数", topic="割合（応用）", text="原価の25%利益で販売1,250円。原価は？", hint="販売=原価×1.25", correct="1000", unit="円"),
    ]
    for s in samples:
        db.add(Question(**s))
    db.commit()


