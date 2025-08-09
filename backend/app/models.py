from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped
from typing import Optional

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    role: Mapped[str] = Column(String, default="child") # "child", "parent", "teacher"
    parent_id: Mapped[Optional[int]] = Column(Integer, ForeignKey("users.id"), nullable=True)
    grade: Mapped[Optional[int]] = Column(Integer)

class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    name: Mapped[str] = Column(String, index=True)
    subject: Mapped[str] = Column(String)
    grade: Mapped[int] = Column(Integer)
    prerequisites: Mapped[Optional[dict]] = Column(JSON) # JSONB for PostgreSQL, JSON for SQLite

class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    subject: Mapped[str] = Column(String)
    topic: Mapped[str] = Column(String) # Can be linked to MathTopic/ScienceTopic ID or name
    stem: Mapped[str] = Column(Text)
    assets: Mapped[Optional[dict]] = Column(JSON, nullable=True) # For images, diagrams
    choices: Mapped[Optional[dict]] = Column(JSON, nullable=True)
    answer: Mapped[dict] = Column(JSON) # Store correct answer and variants
    explanation: Mapped[Optional[str]] = Column(Text, nullable=True)
    difficulty: Mapped[float] = Column(Float)
    source: Mapped[Optional[str]] = Column(String, nullable=True)
    school: Mapped[Optional[str]] = Column(String, nullable=True)
    year: Mapped[Optional[int]] = Column(Integer, nullable=True)
    meta: Mapped[Optional[dict]] = Column(JSON, nullable=True) # For specific question types (e.g., kanji_read, homophone)

class Attempt(Base):
    __tablename__ = "attempts"
    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = Column(Integer, ForeignKey("users.id"))
    question_id: Mapped[int] = Column(Integer, ForeignKey("questions.id"))
    correct: Mapped[bool] = Column(Boolean)
    seconds: Mapped[Optional[int]] = Column(Integer, nullable=True)
    cause: Mapped[Optional[str]] = Column(String, nullable=True) # calc_mistake, concept_gap, memory_lapse
    created_at: Mapped[DateTime] = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    question = relationship("Question")

class Mastery(Base):
    __tablename__ = "mastery"
    user_id: Mapped[int] = Column(Integer, ForeignKey("users.id"), primary_key=True)
    question_id: Mapped[int] = Column(Integer, ForeignKey("questions.id"), primary_key=True) # Or skill_id
    value: Mapped[float] = Column(Float, default=0.0) # 0.0 to 1.0
    consecutive_correct: Mapped[int] = Column(Integer, default=0)
    stability: Mapped[float] = Column(Float, default=1.0) # FSRS-like stability factor
    last_review_at: Mapped[Optional[DateTime]] = Column(DateTime(timezone=True), nullable=True)
    next_review_at: Mapped[Optional[DateTime]] = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
    question = relationship("Question")

class MathTopic(Base):
    __tablename__ = "math_topics"
    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    name: Mapped[str] = Column(String, unique=True, index=True)
    difficulty: Mapped[str] = Column(String) # 基礎/応用/発展

class ScienceTopic(Base):
    __tablename__ = "science_topics"
    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    domain: Mapped[str] = Column(String(32), nullable=False)  # 物理/化学/生物/地学/総合
    name: Mapped[str] = Column(String(255), nullable=False)
    difficulty: Mapped[str] = Column(String(16), nullable=False)  # 基礎/応用/発展

class SocialTopic(Base):
    __tablename__ = "social_topics"
    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    domain: Mapped[str] = Column(String(32), nullable=False)  # 地理/歴史/公民/総合
    name: Mapped[str] = Column(String(255), nullable=False)
    difficulty: Mapped[str] = Column(String(16), nullable=False)  # 基礎/応用/発展

class MathDependency(Base):
    __tablename__ = "math_dependencies"
    id: Mapped[int] = Column(Integer, primary_key=True)
    topic_name: Mapped[str] = Column(String(255), nullable=False)  # 単元名
    prerequisite_topic: Mapped[Optional[str]] = Column(String(255), nullable=True)  # 前提単元（NULL=前提なし）
    next_topic: Mapped[Optional[str]] = Column(String(255), nullable=True)  # 次に学ぶ単元（NULL=最終単元）
    topic_id: Mapped[Optional[int]] = Column(Integer, ForeignKey("math_topics.id"), nullable=True)  # math_topicsとの紐付け

    # リレーション
    math_topic = relationship("MathTopic", back_populates="dependencies")

class ScienceDependency(Base):
    __tablename__ = "science_dependencies"
    id: Mapped[int] = Column(Integer, primary_key=True)
    domain: Mapped[str] = Column(String(32), nullable=False)  # 物理/化学/生物/地学/総合
    topic_name: Mapped[str] = Column(String(255), nullable=False)  # 単元名
    prerequisite_topics: Mapped[Optional[str]] = Column(Text, nullable=True)  # 前提単元（セミコロン区切り、NULL=前提なし）
    next_topics: Mapped[Optional[str]] = Column(Text, nullable=True)  # 次に学ぶ単元（セミコロン区切り、NULL=最終単元）
    topic_id: Mapped[Optional[int]] = Column(Integer, ForeignKey("science_topics.id"), nullable=True)  # science_topicsとの紐付け

    # リレーション
    science_topic = relationship("ScienceTopic", back_populates="dependencies")

# MathTopicにリレーションを追加
MathTopic.dependencies = relationship("MathDependency", back_populates="math_topic")

# ScienceTopicにリレーションを追加
ScienceTopic.dependencies = relationship("ScienceDependency", back_populates="science_topic")


