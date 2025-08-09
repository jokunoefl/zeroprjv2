from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from .db import SessionLocal, engine, Base
from .models import Question, Attempt, Mastery, MathTopic, ScienceTopic, SocialTopic, MathDependency, ScienceDependency, SocialDependency
from .seed import seed_basic, seed_math_topics, seed_science_topics, seed_social_topics, seed_math_dependencies, seed_science_dependencies, seed_social_dependencies
import json
import random
from datetime import datetime, timedelta

app = FastAPI(title="ZeroBasics API")

# CORS settings
origins = ["*"] # Adjust for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    # Create all tables first
    Base.metadata.create_all(bind=engine)
    
    # Ensure tables are created by checking table existence
    import asyncio
    await asyncio.sleep(0.5)  # Increased delay
    
    # Verify table creation by attempting a simple query
    db = SessionLocal()
    try:
        # Test if tables exist by checking if we can query them
        db.execute("SELECT 1 FROM questions LIMIT 1")
        db.commit()
    except Exception:
        # Tables don't exist yet, wait a bit more
        await asyncio.sleep(1.0)
        db.rollback()
    finally:
        db.close()
    
    # Now proceed with seeding
    db = SessionLocal()
    try:
        seed_basic(db)
        seed_math_topics(db)
        seed_science_topics(db)
        seed_social_topics(db)
        seed_math_dependencies(db)
        seed_science_dependencies(db)
        seed_social_dependencies(db)
    except Exception as e:
        print(f"Error during seeding: {e}")
        # Continue startup even if seeding fails
    finally:
        db.close()

class AnswerIn(BaseModel):
    user_answer: str
    time_sec: Optional[int] = None
    mistake_type: Optional[str] = None # calc_mistake | concept_gap | memory_lapse

class NextQuestionReq(BaseModel):
    user_id: int = 1 # Dummy user_id for now
    subject: Optional[str] = None
    mode: str = "practice"

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/questions/{question_id}/answer")
def grade_answer(question_id: int, answer_in: AnswerIn, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    correct_answer_data = json.loads(question.answer)
    is_correct = str(answer_in.user_answer).strip() == str(correct_answer_data["primary"]).strip()

    # Save attempt
    attempt = Attempt(
        user_id=1, # Dummy user_id
        question_id=question.id,
        correct=is_correct,
        seconds=answer_in.time_sec,
        cause=answer_in.mistake_type,
        created_at=datetime.now()
    )
    db.add(attempt)

    # Update mastery (simplified FSRS-like logic)
    mastery = db.query(Mastery).filter(Mastery.user_id == 1, Mastery.question_id == question.id).first()
    if not mastery:
        mastery = Mastery(user_id=1, question_id=question.id, value=0.5, consecutive_correct=0, stability=1.0, next_review_at=datetime.now())
        db.add(mastery)

    if is_correct:
        mastery.value = min(1.0, mastery.value + 0.1) # Simple EMA-like update
        mastery.consecutive_correct += 1
        if mastery.consecutive_correct >= 2: # 2 consecutive correct answers for "understood"
            mastery.stability = max(1.0, mastery.stability * 1.5 + 0.3) # Increase stability
            interval_days = min(14, round(mastery.stability * 3)) # Max 14 days
            mastery.next_review_at = datetime.now() + timedelta(days=interval_days)
        else:
            mastery.next_review_at = datetime.now() + timedelta(days=1) # Next day for first correct
    else:
        mastery.value = max(0.0, mastery.value - 0.2)
        mastery.consecutive_correct = 0
        mastery.stability = 0.7 # Reset stability
        mastery.next_review_at = datetime.now() + timedelta(days=1) # Next day for incorrect

    db.commit()
    db.refresh(mastery)

    return {"is_correct": is_correct, "correct_answer": correct_answer_data["primary"], "ai_explain": None}

@app.post("/ai/explain")
def ai_explain(question_id: int, user_answer: str):
    # Dummy AI explanation
    return {"explanation": "利益率20%は1.2倍。1,200÷1.2=1,000。式は 販売=仕入×1.2"}

@app.post("/ai/generate-variant")
def generate_variant(topic_id: int, difficulty: int = 1, db: Session = Depends(get_db)):
    # Dummy variant generation: create a new question and return it
    new_question = Question(
        subject="算数",
        topic="割合（類題）",
        stem=f"みかんを原価の{random.randint(20,30)}%の利益で売ったところ、販売価格は{random.randint(1200,1500)}円でした。原価はいくらですか？ (ID: {random.randint(2000, 9999)})",
        choices=None,
        answer=json.dumps({"primary": "1000", "variants": ["1000"]}),
        explanation="原価をXとすると、X * (1 + 利益率/100) = 販売価格",
        difficulty=difficulty,
        source="AI生成",
        school=None,
        year=None,
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return {"created": True, "question": new_question}

@app.get("/questions/{question_id}")
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@app.post("/next-question")
def next_question(req: NextQuestionReq, db: Session = Depends(get_db)):
    # Prioritize questions due for review
    due_masteries = db.query(Mastery).filter(
        Mastery.user_id == req.user_id,
        Mastery.next_review_at <= datetime.now()
    ).order_by(Mastery.next_review_at.asc()).all()

    if due_masteries:
        # Pick a random question from the due ones
        mastery = random.choice(due_masteries)
        question = db.query(Question).filter(Question.id == mastery.question_id).first()
        if question:
            return {"question": question}

    # If no due questions, pick a random question not yet mastered or with low mastery
    # For simplicity, just pick a random one from the seed data
    questions = db.query(Question).all()
    if questions:
        return {"question": random.choice(questions)}
    
    return {"question": None}

# 算数の学習依存関係を活用したAPI
@app.get("/math/prerequisites/{topic_name}")
def get_prerequisites(topic_name: str, db: Session = Depends(get_db)):
    """指定された単元の前提単元を取得"""
    dependency = db.query(MathDependency).filter(MathDependency.topic_name == topic_name).first()
    if not dependency:
        return {"prerequisites": [], "message": "単元が見つかりません"}
    
    prerequisites = []
    current_topic = dependency.prerequisite_topic
    
    # 前提単元を遡って取得
    while current_topic:
        prereq_dep = db.query(MathDependency).filter(MathDependency.topic_name == current_topic).first()
        if prereq_dep:
            prerequisites.append({
                "topic_name": current_topic,
                "topic_id": prereq_dep.topic_id
            })
            current_topic = prereq_dep.prerequisite_topic
        else:
            break
    
    return {
        "target_topic": topic_name,
        "prerequisites": prerequisites,
        "prerequisite_chain": [p["topic_name"] for p in prerequisites]
    }

@app.get("/math/learning-path/{topic_name}")
def get_learning_path(topic_name: str, db: Session = Depends(get_db)):
    """指定された単元の学習パス（前提→目標→次）を取得"""
    dependency = db.query(MathDependency).filter(MathDependency.topic_name == topic_name).first()
    if not dependency:
        return {"message": "単元が見つかりません"}
    
    # 前提単元を取得
    prerequisites = []
    current_topic = dependency.prerequisite_topic
    while current_topic:
        prereq_dep = db.query(MathDependency).filter(MathDependency.topic_name == current_topic).first()
        if prereq_dep:
            prerequisites.append(current_topic)
            current_topic = prereq_dep.prerequisite_topic
        else:
            break
    
    # 次に学ぶ単元を取得
    next_topics = []
    current_topic = dependency.next_topic
    while current_topic:
        next_dep = db.query(MathDependency).filter(MathDependency.topic_name == current_topic).first()
        if next_dep:
            next_topics.append(current_topic)
            current_topic = next_dep.next_topic
        else:
            break
    
    return {
        "prerequisites": prerequisites,
        "target_topic": topic_name,
        "next_topics": next_topics,
        "learning_path": prerequisites + [topic_name] + next_topics
    }

# 理科の学習依存関係を活用したAPI
@app.get("/science/prerequisites/{topic_name}")
def get_science_prerequisites(topic_name: str, db: Session = Depends(get_db)):
    """指定された理科単元の前提単元を取得（複数前提対応）"""
    dependency = db.query(ScienceDependency).filter(ScienceDependency.topic_name == topic_name).first()
    if not dependency:
        return {"prerequisites": [], "message": "単元が見つかりません"}
    
    # セミコロン区切りの前提単元を分割
    prerequisite_list = []
    if dependency.prerequisite_topics:
        prerequisite_topics = [t.strip() for t in dependency.prerequisite_topics.split(";") if t.strip()]
        
        for prereq_topic in prerequisite_topics:
            prereq_dep = db.query(ScienceDependency).filter(ScienceDependency.topic_name == prereq_topic).first()
            if prereq_dep:
                prerequisite_list.append({
                    "topic_name": prereq_topic,
                    "domain": prereq_dep.domain,
                    "topic_id": prereq_dep.topic_id
                })
    
    return {
        "target_topic": topic_name,
        "domain": dependency.domain,
        "prerequisites": prerequisite_list,
        "prerequisite_topics": [p["topic_name"] for p in prerequisite_list]
    }

@app.get("/science/learning-path/{topic_name}")
def get_science_learning_path(topic_name: str, db: Session = Depends(get_db)):
    """指定された理科単元の学習パス（前提→目標→次）を取得（複数対応）"""
    dependency = db.query(ScienceDependency).filter(ScienceDependency.topic_name == topic_name).first()
    if not dependency:
        return {"message": "単元が見つかりません"}
    
    # 前提単元を取得（複数対応）
    all_prerequisites = []
    if dependency.prerequisite_topics:
        prerequisite_topics = [t.strip() for t in dependency.prerequisite_topics.split(";") if t.strip()]
        
        for prereq_topic in prerequisite_topics:
            prereq_dep = db.query(ScienceDependency).filter(ScienceDependency.topic_name == prereq_topic).first()
            if prereq_dep:
                all_prerequisites.append(prereq_topic)
    
    # 次に学ぶ単元を取得（複数対応）
    all_next_topics = []
    if dependency.next_topics:
        next_topics = [t.strip() for t in dependency.next_topics.split(";") if t.strip()]
        
        for next_topic in next_topics:
            next_dep = db.query(ScienceDependency).filter(ScienceDependency.topic_name == next_topic).first()
            if next_dep:
                all_next_topics.append(next_topic)
    
    return {
        "prerequisites": all_prerequisites,
        "target_topic": topic_name,
        "domain": dependency.domain,
        "next_topics": all_next_topics,
        "learning_path": all_prerequisites + [topic_name] + all_next_topics
    }


