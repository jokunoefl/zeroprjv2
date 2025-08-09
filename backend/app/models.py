from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, func, Float, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped
from .db import Base

class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = Column(Integer, primary_key=True, autoincrement=True)
    subject: Mapped[str] = Column(String(32))
    topic: Mapped[str] = Column(String(128))
    text: Mapped[str] = Column(Text)
    hint: Mapped[str] = Column(String(256))
    correct: Mapped[str] = Column(String(64))
    unit: Mapped[str] = Column(String(16))

class Attempt(Base):
    __tablename__ = "attempts"
    id: Mapped[int] = Column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = Column(Integer, index=True)
    question_id: Mapped[int] = Column(Integer, ForeignKey("questions.id"))
    user_answer: Mapped[str] = Column(String(128))
    correct: Mapped[bool] = Column(Boolean, default=False)
    time_sec: Mapped[int] = Column(Integer, default=0)
    mistake_type: Mapped[str] = Column(String(32), nullable=True)
    created_at: Mapped[str] = Column(DateTime(timezone=True), server_default=func.now())


class Mastery(Base):
    __tablename__ = "mastery"
    id: Mapped[int] = Column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = Column(Integer, index=True)
    topic: Mapped[str] = Column(String(128), index=True)
    value: Mapped[float] = Column(Float, default=0.5)  # 0..1 推定正答率
    consecutive_correct: Mapped[int] = Column(Integer, default=0)
    stability: Mapped[float] = Column(Float, default=1.0)
    last_review_at: Mapped[str] = Column(DateTime(timezone=True), nullable=True)
    next_review_at: Mapped[str] = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint('student_id', 'topic', name='uq_mastery_student_topic'),
    )


class MathTopic(Base):
    __tablename__ = "math_topics"
    id: Mapped[int] = Column(Integer, primary_key=True)
    name: Mapped[str] = Column(String(255), nullable=False)
    difficulty: Mapped[str] = Column(String(16), nullable=False)  # 基礎 / 応用 / 発展


