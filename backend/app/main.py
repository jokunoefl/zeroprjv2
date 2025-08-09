from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from .models import Question, Attempt, Mastery, MathTopic
from .seed import seed_basic, seed_math_topics, seed_science_topics
from datetime import datetime, timedelta

app = FastAPI(title="ZeroBasics API (Mock)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnswerIn(BaseModel):
    user_answer: str
    time_sec: Optional[int] = None
    mistake_type: Optional[str] = None


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db_gen = get_db()
    db = next(db_gen)
    try:
        seed_basic(db)
        seed_math_topics(db)
        seed_science_topics(db)
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


@app.get("/health")
def health(db: Session = Depends(get_db)):
    return {"ok": True}


@app.post("/questions/{question_id}/answer")
def submit_answer(question_id: int, body: AnswerIn, db: Session = Depends(get_db)):
    numeric = "".join([c for c in body.user_answer if c.isdigit()])
    is_correct = numeric == "1000"
    db.add(Attempt(student_id=1, question_id=question_id, user_answer=body.user_answer, correct=is_correct, time_sec=body.time_sec or 0, mistake_type=body.mistake_type))
    db.commit()

    # Mastery更新（簡易）: topic単位で正答率の移動平均 + 連続正解カウント + 次回復習
    q = db.query(Question).get(question_id)
    m = db.query(Mastery).filter(Mastery.student_id==1, Mastery.topic==q.topic).first()
    if not m:
        m = Mastery(student_id=1, topic=q.topic, value=0.5, consecutive_correct=0, stability=1.0)
        db.add(m)
    # 簡易EMA
    alpha = 0.6
    m.value = alpha*(1.0 if is_correct else 0.0) + (1-alpha)*m.value
    m.consecutive_correct = (m.consecutive_correct + 1) if is_correct else 0
    # スケジュール: 1,3,7,14日。誤答で翌日。
    now = datetime.utcnow()
    if is_correct:
        if m.consecutive_correct >= 2:
            days = 14
        elif m.consecutive_correct == 1:
            days = 3
        else:
            days = 1
    else:
        days = 1
    m.last_review_at = now
    m.next_review_at = now + timedelta(days=days)
    db.commit()
    return {"is_correct": is_correct, "correct_answer": "1000"}


class ExplainIn(BaseModel):
    question_id: int
    user_answer: str


@app.post("/ai/explain")
def explain(_: ExplainIn):
    return {"explanation": "利益率20%は1.2倍。1200÷1.2=1000。式: 販売=原価×1.2"}


class GenerateVariantIn(BaseModel):
    topic_id: int
    difficulty: int = 1


@app.post("/ai/generate-variant")
def generate_variant(_: GenerateVariantIn, db: Session = Depends(get_db)):
    q = Question(subject="算数", topic="割合（類題）", text="みかんを原価の25%の利益で売ると販売価格は1,250円。原価は？", hint="販売=原価×1.25", correct="1000", unit="円")
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"question": {"id": q.id, "subject": q.subject, "topic": q.topic, "text": q.text, "hint": q.hint, "correct": q.correct, "unit": q.unit}}


@app.get("/questions/{question_id}")
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).get(question_id)
    if not q:
        return {"detail": "not found"}
    return {"id": q.id, "subject": q.subject, "topic": q.topic, "text": q.text, "hint": q.hint, "correct": q.correct, "unit": q.unit}


@app.get("/next-question")
def next_question(db: Session = Depends(get_db)):
    # 優先ロジック（簡易）: 期日が近い/過ぎたトピック優先→該当なければ先頭
    due = db.query(Mastery).filter(Mastery.student_id==1, Mastery.next_review_at!=None).order_by(Mastery.next_review_at.asc()).first()
    q = None
    if due:
        q = db.query(Question).filter(Question.topic==due.topic).first()
    if not q:
        q = db.query(Question).first()
    if not q:
        seed_basic(db)
        q = db.query(Question).first()
    return {"id": q.id, "subject": q.subject, "topic": q.topic, "text": q.text, "hint": q.hint, "correct": q.correct, "unit": q.unit}


