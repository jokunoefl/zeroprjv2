from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import os
import tempfile
import shutil
from .db import SessionLocal, engine, Base
from .models import Question, Attempt, Mastery, MathTopic, ScienceTopic, SocialTopic, MathDependency, ScienceDependency, SocialDependency, TestResult, TestResultDetail
from .seed import seed_basic, seed_math_topics, seed_science_topics, seed_social_topics, seed_math_dependencies, seed_science_dependencies, seed_social_dependencies
from .test_analyzer import TestResultAnalyzer
import json
import random
from datetime import datetime, timedelta

app = FastAPI(title="ZeroBasics API")

@app.get("/")
def root():
    """ルートエンドポイント"""
    return {
        "message": "ZeroBasics API is running",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }
    }

@app.get("/debug")
def debug():
    """デバッグ情報エンドポイント"""
    import os
    from .test_analyzer import TestResultAnalyzer
    
    # TestResultAnalyzerの初期化テスト
    analyzer = TestResultAnalyzer()
    openai_status = "available" if analyzer.client else "not_available"
    
    return {
        "message": "Debug information",
        "timestamp": datetime.now().isoformat(),
        "environment": {
            "DATABASE_URL": "***" if os.getenv("DATABASE_URL") else "Not set",
            "PYTHON_VERSION": os.getenv("PYTHON_VERSION", "Not set"),
            "PORT": os.getenv("PORT", "Not set"),
            "OPENAI_API_KEY": "***" if os.getenv("OPENAI_API_KEY") else "Not set"
        },
        "database_type": "postgresql" if os.getenv("DATABASE_URL", "").startswith("postgres") else "sqlite",
        "openai_available": bool(os.getenv("OPENAI_API_KEY")),
        "openai_status": openai_status,
        "analyzer_client_initialized": analyzer.client is not None
    }

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
    print("🚀 Starting ZeroBasics API...")
    print(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"Database URL: {os.getenv('DATABASE_URL', 'Not set')[:20]}...")
    
    # Create all tables first (including test result tables)
    try:
        print("📊 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
        
        # Verify test result tables specifically
        from sqlalchemy import text
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1 FROM test_results LIMIT 1"))
            print("✅ test_results table exists")
        except Exception:
            print("⚠️  test_results table not found, will be created")
        
        try:
            db.execute(text("SELECT 1 FROM test_result_details LIMIT 1"))
            print("✅ test_result_details table exists")
        except Exception:
            print("⚠️  test_result_details table not found, will be created")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        print("⚠️  Continuing startup despite table creation error")
    
    # Skip seeding during startup for faster deployment
    # Seeding can be done manually via /init-db-simple endpoint
    print("✅ Startup completed - seeding can be done manually")
    print("🌐 API is ready to serve requests")

class AnswerIn(BaseModel):
    user_answer: str
    time_sec: Optional[int] = None
    mistake_type: Optional[str] = None # calc_mistake | concept_gap | memory_lapse

class NextQuestionReq(BaseModel):
    user_id: int = 1 # Dummy user_id for now
    subject: Optional[str] = None
    mode: str = "practice"

class TestResultResponse(BaseModel):
    id: int
    subject: str
    test_name: str
    total_score: int
    max_score: int
    score_percentage: float
    analysis_status: str
    created_at: datetime
    details: List[Dict]

class TestResultDetailResponse(BaseModel):
    topic: str
    correct_count: int
    total_count: int
    score_percentage: float
    weakness_analysis: Optional[str]
    improvement_advice: Optional[str]

@app.get("/health")
def health():
    """ヘルスチェックエンドポイント - データベース接続も確認"""
    try:
        # 基本的な接続確認
        db = SessionLocal()
        try:
            # データベース接続をテスト
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
            db.commit()
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        finally:
            db.close()
        
        return {
            "ok": True,
            "timestamp": datetime.now().isoformat(),
            "database": db_status
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/init-db")
def init_database(db: Session = Depends(get_db)):
    """手動でデータベースを初期化するエンドポイント"""
    try:
        print("Starting manual database initialization...")
        
        # Import the migration script
        import subprocess
        import sys
        
        # Run the migration script
        result = subprocess.run([
            sys.executable, "migrate.py"
        ], capture_output=True, text=True, cwd="backend")
        
        if result.returncode == 0:
            return {
                "message": "Database initialized successfully",
                "output": result.stdout
            }
        else:
            return {
                "error": "Database initialization failed",
                "output": result.stdout,
                "error_output": result.stderr
            }
            
    except Exception as e:
        print(f"General initialization error: {e}")
        return {"error": f"Database initialization failed: {str(e)}"}

@app.post("/init-db-simple")
def init_database_simple(db: Session = Depends(get_db)):
    """シンプルなデータベース初期化エンドポイント"""
    try:
        print("Starting simple database initialization...")
        
        # Create tables with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"Creating tables (attempt {attempt + 1}/{max_retries})...")
                Base.metadata.create_all(bind=engine)
                print("Tables created successfully")
                break
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    return {"error": f"Failed to create tables after {max_retries} attempts: {str(e)}"}
                import time
                time.sleep(2)  # Wait before retry
        
        # Wait a moment for tables to be created (PostgreSQL needs more time)
        import time
        time.sleep(5)
        
        # Verify tables exist before seeding (with retry)
        max_verify_retries = 3
        for verify_attempt in range(max_verify_retries):
            try:
                from sqlalchemy import text
                db.execute(text("SELECT 1 FROM questions LIMIT 1"))
                db.commit()
                print("Questions table verified")
                break
            except Exception as e:
                print(f"Questions table verification attempt {verify_attempt + 1} failed: {e}")
                if verify_attempt == max_verify_retries - 1:
                    return {"error": f"Questions table not accessible after {max_verify_retries} attempts: {str(e)}"}
                time.sleep(3)  # Wait before retry
                db.rollback()
        
        # Seed the database
        try:
            seed_basic(db)
            print("Basic seeding completed")
            seed_math_topics(db)
            print("Math topics seeded")
            seed_science_topics(db)
            print("Science topics seeded")
            seed_social_topics(db)
            print("Social topics seeded")
            seed_math_dependencies(db)
            print("Math dependencies seeded")
            seed_science_dependencies(db)
            print("Science dependencies seeded")
            seed_social_dependencies(db)
            print("Social dependencies seeded")
            
            return {"message": "Database initialized successfully"}
        except Exception as e:
            print(f"Seeding error: {e}")
            return {"error": f"Seeding failed: {str(e)}"}
        
    except Exception as e:
        print(f"Error during initialization: {e}")
        return {"error": f"Database initialization failed: {str(e)}"}

@app.get("/check-tables")
def check_tables(db: Session = Depends(get_db)):
    """テーブルの存在を確認するエンドポイント"""
    from sqlalchemy import text
    tables = {}
    try:
        # Check questions table
        db.execute(text("SELECT 1 FROM questions LIMIT 1"))
        tables["questions"] = "exists"
    except Exception:
        tables["questions"] = "missing"
    
    try:
        # Check mastery table
        db.execute(text("SELECT 1 FROM mastery LIMIT 1"))
        tables["mastery"] = "exists"
    except Exception:
        tables["mastery"] = "missing"
    
    try:
        # Check attempts table
        db.execute(text("SELECT 1 FROM attempts LIMIT 1"))
        tables["attempts"] = "exists"
    except Exception:
        tables["attempts"] = "missing"
    
    try:
        # Check test_results table
        db.execute(text("SELECT 1 FROM test_results LIMIT 1"))
        tables["test_results"] = "exists"
    except Exception:
        tables["test_results"] = "missing"
    
    try:
        # Check test_result_details table
        db.execute(text("SELECT 1 FROM test_result_details LIMIT 1"))
        tables["test_result_details"] = "exists"
    except Exception:
        tables["test_result_details"] = "missing"
    
    try:
        # Check users table
        db.execute(text("SELECT 1 FROM users LIMIT 1"))
        tables["users"] = "exists"
    except Exception:
        tables["users"] = "missing"
    
    return {"tables": tables}

@app.post("/create-tables-only")
def create_tables_only():
    """テーブルのみを作成するエンドポイント"""
    try:
        print("Creating tables only...")
        Base.metadata.create_all(bind=engine)
        
        # Wait and verify
        import time
        time.sleep(3)
        
        # Check if tables were created
        from sqlalchemy import text
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1 FROM questions LIMIT 1"))
            db.commit()
            db.close()
            return {"message": "Tables created and verified successfully"}
        except Exception as e:
            db.close()
            return {"error": f"Tables created but verification failed: {str(e)}"}
            
    except Exception as e:
        return {"error": f"Failed to create tables: {str(e)}"}

@app.post("/recreate-tables")
def recreate_tables():
    """テーブルを削除して再作成するエンドポイント"""
    try:
        print("Recreating tables...")
        from sqlalchemy import text
        
        # Drop existing tables
        db = SessionLocal()
        try:
            # Drop tables in reverse order of dependencies
            tables_to_drop = [
                'test_result_details',
                'test_results', 
                'mastery',
                'attempts',
                'questions',
                'users'
            ]
            
            for table in tables_to_drop:
                try:
                    db.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                    print(f"Dropped table: {table}")
                except Exception as e:
                    print(f"Error dropping {table}: {e}")
            
            db.commit()
            db.close()
            
        except Exception as e:
            db.close()
            return {"error": f"Failed to drop tables: {str(e)}"}
        
        # Create tables with new schema
        Base.metadata.create_all(bind=engine)
        
        # Wait and verify
        import time
        time.sleep(3)
        
        # Verify tables were created
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1 FROM test_results LIMIT 1"))
            db.commit()
            db.close()
            return {"message": "Tables recreated successfully"}
        except Exception as e:
            db.close()
            return {"error": f"Tables recreated but verification failed: {str(e)}"}
            
    except Exception as e:
        return {"error": f"Failed to recreate tables: {str(e)}"}

@app.get("/test-connection")
def test_connection():
    """基本的な接続テスト"""
    import os
    database_url = os.getenv("DATABASE_URL", "Not set")
    # セキュリティのため、パスワード部分を隠す
    if database_url != "Not set" and "://" in database_url:
        parts = database_url.split("://")
        if len(parts) == 2:
            scheme = parts[0]
            rest = parts[1]
            if "@" in rest:
                user_pass, host_db = rest.split("@", 1)
                if ":" in user_pass:
                    user, _ = user_pass.split(":", 1)
                    masked_url = f"{scheme}://{user}:***@{host_db}"
                else:
                    masked_url = f"{scheme}://***@{host_db}"
            else:
                masked_url = f"{scheme}://***"
        else:
            masked_url = "***"
    else:
        masked_url = database_url
    
    return {
        "message": "Connection successful",
        "timestamp": datetime.now().isoformat(),
        "database_url": masked_url,
        "database_type": "postgresql" if "postgres" in database_url.lower() else "sqlite" if "sqlite" in database_url.lower() else "unknown"
    }



@app.post("/upload-test-result")
async def upload_test_result(
    file: UploadFile = File(...),
    user_id: int = Form(1),
    subject: Optional[str] = Form(None),
    test_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """テスト結果ファイルをアップロードしてAI分析を実行（簡易版）"""
    try:
        # ファイル形式の確認
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="サポートされていないファイル形式です")
        
        # ファイルサイズの確認（10MB制限）
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="ファイルサイズが大きすぎます（10MB以下にしてください）")
        
        # 一時ファイルに保存
        temp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
                # ファイルストリームを最初から読み取り
                file.file.seek(0)
                shutil.copyfileobj(file.file, temp_file)
                temp_file_path = temp_file.name
            
            print(f"アップロードされたファイル: {file.filename}")
            print(f"ファイルサイズ: {file.size} bytes")
            print(f"ファイルタイプ: {file.content_type}")
            print(f"一時ファイルパス: {temp_file_path}")
            print(f"一時ファイルサイズ: {os.path.getsize(temp_file_path)} bytes")
            
            # テスト結果分析器を初期化
            analyzer = TestResultAnalyzer()
            
            # PDFファイルの場合は直接AIに送信
            if file_ext == '.pdf':
                try:
                    print(f"PDFファイル分析開始: {file.filename}")
                    print(f"処理対象ファイルパス: {temp_file_path}")
                    print(f"処理対象ファイルサイズ: {os.path.getsize(temp_file_path)} bytes")
                    
                    # ファイルの内容を確認（最初の数バイト）
                    with open(temp_file_path, 'rb') as f:
                        first_bytes = f.read(100)
                        print(f"ファイルの最初の100バイト: {first_bytes[:50]}...")
                        
                        # PDFファイルの場合はヘッダーを確認
                        if file_ext == '.pdf':
                            f.seek(0)
                            header = f.read(10)
                            print(f"PDFヘッダー: {header}")
                            if header.startswith(b'%PDF'):
                                print("有効なPDFファイルです")
                            else:
                                print("警告: PDFヘッダーが見つかりません")
                    
                    # ファイルの内容を再度確認
                    print(f"分析前のファイル確認:")
                    print(f"  ファイルパス: {temp_file_path}")
                    print(f"  ファイル存在: {os.path.exists(temp_file_path)}")
                    print(f"  ファイルサイズ: {os.path.getsize(temp_file_path)} bytes")
                    
                    # ファイルの内容をサンプル表示
                    with open(temp_file_path, 'rb') as f:
                        sample_content = f.read(200)
                        print(f"  ファイル内容サンプル: {sample_content[:100]}...")
                    
                    analysis_result = analyzer.analyze_pdf_directly_with_ai(temp_file_path, user_id)
                    
                    print(f"PDF分析完了: {analysis_result.get('analysis_method', 'unknown')}")
                    print(f"分析結果のソースファイル: {analysis_result.get('source_file', 'unknown')}")
                    
                except Exception as analysis_error:
                    print(f"PDF分析エラー詳細: {analysis_error}")
                    raise HTTPException(status_code=500, detail=f"PDF直接分析エラー: {str(analysis_error)}")
                
                # データベースに保存
                try:
                    test_result = TestResult(
                        user_id=user_id,
                        subject=subject or "PDF分析結果",
                        test_name=test_name or "PDFテスト結果",
                        total_score=0,  # PDFから抽出できない場合は0
                        max_score=100,
                        score_percentage=0.0,
                        file_path=file.filename,
                        analysis_status="completed"
                    )
                    
                    db.add(test_result)
                    db.flush()
                    
                    # 分析結果を保存
                    for topic_data in analysis_result['topics']:
                        detail = TestResultDetail(
                            test_result_id=test_result.id,
                            topic=topic_data['topic'],
                            correct_count=topic_data['correct_count'],
                            total_count=topic_data['total_count'],
                            score_percentage=topic_data['score_percentage'],
                            weakness_analysis=topic_data.get('weakness_analysis'),
                            improvement_advice=topic_data.get('improvement_advice')
                        )
                        db.add(detail)
                    
                    db.commit()
                    
                    return {
                        "message": "PDFファイルの直接AI分析が完了しました",
                        "test_result_id": test_result.id,
                        "subject": test_result.subject,
                        "test_name": test_result.test_name,
                        "total_score": test_result.total_score,
                        "max_score": test_result.max_score,
                        "score_percentage": test_result.score_percentage,
                        "analysis_status": test_result.analysis_status,
                        "overall_analysis": analysis_result['overall_analysis'],
                        "topics": analysis_result['topics'],
                        "analysis_method": analysis_result.get('analysis_method', 'PDF直接分析')
                    }
                    
                except Exception as db_error:
                    db.rollback()
                    raise HTTPException(status_code=500, detail=f"データベース保存エラー: {str(db_error)}")
            
            else:
                # 画像ファイルの場合は従来の方法
                try:
                    text = analyzer.extract_text_from_file(temp_file_path)
                    if not text.strip():
                        raise HTTPException(status_code=400, detail="ファイルからテキストを抽出できませんでした")
                except Exception as extract_error:
                    raise HTTPException(status_code=400, detail=f"ファイルの読み込みエラー: {str(extract_error)}")
                
                # テスト結果を解析
                try:
                    parsed_result = analyzer.parse_test_result(text)
                except Exception as parse_error:
                    raise HTTPException(status_code=400, detail=f"テスト結果の解析エラー: {str(parse_error)}")
                
                # AI分析を実行（GPT-5-2025-08-07使用）
                try:
                    analysis_result = analyzer.analyze_weaknesses_with_ai(parsed_result)
                except Exception as analysis_error:
                    raise HTTPException(status_code=500, detail=f"AI分析エラー: {str(analysis_error)}")
                
                # データベースに保存
                try:
                    test_result = TestResult(
                        user_id=user_id,
                        subject=subject or parsed_result['subject'],
                        test_name=test_name or parsed_result['test_name'],
                        total_score=parsed_result['total_score'] or 0,
                        max_score=parsed_result['max_score'] or 100,
                        score_percentage=parsed_result['score_percentage'],
                        file_path=file.filename,
                        analysis_status="completed"
                    )
                    
                    db.add(test_result)
                    db.flush()
                    
                    # 単元別詳細を保存
                    for topic_data in analysis_result['topics']:
                        detail = TestResultDetail(
                            test_result_id=test_result.id,
                            topic=topic_data['topic'],
                            correct_count=topic_data['correct_count'],
                            total_count=topic_data['total_count'],
                            score_percentage=topic_data['score_percentage'],
                            weakness_analysis=topic_data.get('weakness_analysis'),
                            improvement_advice=topic_data.get('improvement_advice')
                        )
                        db.add(detail)
                    
                    db.commit()
                    
                    return {
                        "message": "テスト結果のアップロードとAI分析が完了しました",
                        "test_result_id": test_result.id,
                        "subject": test_result.subject,
                        "test_name": test_result.test_name,
                        "total_score": test_result.total_score,
                        "max_score": test_result.max_score,
                        "score_percentage": test_result.score_percentage,
                        "analysis_status": test_result.analysis_status,
                        "overall_analysis": analysis_result['overall_analysis'],
                        "topics": analysis_result['topics']
                    }
                    
                except Exception as db_error:
                    db.rollback()
                    raise HTTPException(status_code=500, detail=f"データベース保存エラー: {str(db_error)}")
            
        finally:
            # 一時ファイルを削除
            if temp_file_path:
                try:
                    print(f"一時ファイル削除: {temp_file_path}")
                    os.unlink(temp_file_path)
                    print("一時ファイル削除完了")
                except Exception as e:
                    print(f"一時ファイル削除エラー: {e}")
                    pass  # 削除に失敗しても無視
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in upload_test_result: {e}")
        raise HTTPException(status_code=500, detail=f"予期しないエラーが発生しました: {str(e)}")

@app.get("/test-results/{user_id}")
def get_test_results(user_id: int, db: Session = Depends(get_db)):
    """ユーザーのテスト結果一覧を取得"""
    test_results = db.query(TestResult).filter(TestResult.user_id == user_id).order_by(TestResult.created_at.desc()).all()
    
    result_list = []
    for test_result in test_results:
        details = db.query(TestResultDetail).filter(TestResultDetail.test_result_id == test_result.id).all()
        detail_list = []
        for detail in details:
            detail_list.append({
                "topic": detail.topic,
                "correct_count": detail.correct_count,
                "total_count": detail.total_count,
                "score_percentage": detail.score_percentage,
                "weakness_analysis": detail.weakness_analysis,
                "improvement_advice": detail.improvement_advice
            })
        
        result_list.append({
            "id": test_result.id,
            "subject": test_result.subject,
            "test_name": test_result.test_name,
            "total_score": test_result.total_score,
            "max_score": test_result.max_score,
            "score_percentage": test_result.score_percentage,
            "analysis_status": test_result.analysis_status,
            "created_at": test_result.created_at,
            "details": detail_list
        })
    
    return {"test_results": result_list}

@app.get("/test-results/{user_id}/{test_result_id}")
def get_test_result_detail(user_id: int, test_result_id: int, db: Session = Depends(get_db)):
    """特定のテスト結果の詳細を取得"""
    test_result = db.query(TestResult).filter(
        TestResult.id == test_result_id,
        TestResult.user_id == user_id
    ).first()
    
    if not test_result:
        raise HTTPException(status_code=404, detail="テスト結果が見つかりません")
    
    details = db.query(TestResultDetail).filter(TestResultDetail.test_result_id == test_result.id).all()
    detail_list = []
    for detail in details:
        detail_list.append({
            "topic": detail.topic,
            "correct_count": detail.correct_count,
            "total_count": detail.total_count,
            "score_percentage": detail.score_percentage,
            "weakness_analysis": detail.weakness_analysis,
            "improvement_advice": detail.improvement_advice
        })
    
    return {
        "id": test_result.id,
        "subject": test_result.subject,
        "test_name": test_result.test_name,
        "total_score": test_result.total_score,
        "max_score": test_result.max_score,
        "score_percentage": test_result.score_percentage,
        "analysis_status": test_result.analysis_status,
        "created_at": test_result.created_at,
        "file_path": test_result.file_path,
        "details": detail_list
    }

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
    try:
        # First check if mastery table exists
        try:
            from sqlalchemy import text
            db.execute(text("SELECT 1 FROM mastery LIMIT 1"))
            db.commit()
        except Exception:
            # Mastery table doesn't exist, skip mastery-based logic
            print("Mastery table not found, skipping mastery-based question selection")
            db.rollback()
            
            # Just return a random question
            questions = db.query(Question).all()
            if questions:
                return {"question": random.choice(questions)}
            else:
                return {"question": None, "message": "No questions available"}
        
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
        
    except Exception as e:
        print(f"Error in next_question: {e}")
        # Fallback: try to get any question
        try:
            questions = db.query(Question).all()
            if questions:
                return {"question": random.choice(questions)}
        except Exception as e2:
            print(f"Fallback error: {e2}")
        
        return {"question": None, "error": "Database error occurred"}

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


