#!/usr/bin/env python3
"""
Database migration script for PostgreSQL
"""
import os
import sys
from sqlalchemy import create_engine, text
from app.db import Base, engine, SessionLocal
from app.seed import (
    seed_basic, seed_math_topics, seed_science_topics, seed_social_topics,
    seed_math_dependencies, seed_science_dependencies, seed_social_dependencies
)

def check_database_connection():
    """データベース接続を確認"""
    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def create_tables():
    """テーブルを作成"""
    try:
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return False

def remove_next_topics_columns():
    """next_topics列を削除するマイグレーション"""
    try:
        print("Removing next_topics columns...")
        with engine.connect() as conn:
            # SQLiteの場合
            if "sqlite" in str(engine.url).lower():
                # SQLiteではALTER TABLE DROP COLUMNを直接サポートしていないため、
                # テーブルを再作成する必要があります
                print("⚠️  SQLite detected. Recreating tables to remove next_topics columns...")
                
                # 既存のデータをバックアップ
                math_deps = conn.execute(text("SELECT id, topic_name, prerequisite_topic, topic_id FROM math_dependencies")).fetchall()
                science_deps = conn.execute(text("SELECT id, domain, topic_name, prerequisite_topics, topic_id FROM science_dependencies")).fetchall()
                social_deps = conn.execute(text("SELECT id, domain, topic_name, prerequisite_topics, topic_id FROM social_dependencies")).fetchall()
                
                # 古いテーブルを削除
                conn.execute(text("DROP TABLE IF EXISTS math_dependencies"))
                conn.execute(text("DROP TABLE IF EXISTS science_dependencies"))
                conn.execute(text("DROP TABLE IF EXISTS social_dependencies"))
                
                # 新しいテーブルを作成
                Base.metadata.create_all(bind=engine)
                
                # データを復元
                for dep in math_deps:
                    # 算数の依存関係にdomainフィールドを追加（デフォルトは"数と計算"）
                    conn.execute(text(
                        "INSERT INTO math_dependencies (id, domain, topic_name, prerequisite_topic, topic_id) VALUES (:id, :domain, :topic_name, :prerequisite_topic, :topic_id)"
                    ), {"id": dep[0], "domain": "数と計算", "topic_name": dep[1], "prerequisite_topic": dep[2], "topic_id": dep[3]})
                
                for dep in science_deps:
                    conn.execute(text(
                        "INSERT INTO science_dependencies (id, domain, topic_name, prerequisite_topics, topic_id) VALUES (:id, :domain, :topic_name, :prerequisite_topics, :topic_id)"
                    ), {"id": dep[0], "domain": dep[1], "topic_name": dep[2], "prerequisite_topics": dep[3], "topic_id": dep[4]})
                
                for dep in social_deps:
                    conn.execute(text(
                        "INSERT INTO social_dependencies (id, domain, topic_name, prerequisite_topics, topic_id) VALUES (:id, :domain, :topic_name, :prerequisite_topics, :topic_id)"
                    ), {"id": dep[0], "domain": dep[1], "topic_name": dep[2], "prerequisite_topics": dep[3], "topic_id": dep[4]})
                
            else:
                # PostgreSQLの場合
                conn.execute(text("ALTER TABLE math_dependencies DROP COLUMN IF EXISTS next_topic"))
                conn.execute(text("ALTER TABLE science_dependencies DROP COLUMN IF EXISTS next_topics"))
                conn.execute(text("ALTER TABLE social_dependencies DROP COLUMN IF EXISTS next_topics"))
            
            conn.commit()
            print("✅ next_topics columns removed successfully")
            return True
            
    except Exception as e:
        print(f"❌ Failed to remove next_topics columns: {e}")
        return False

def verify_tables():
    """テーブルの存在を確認"""
    from sqlalchemy import text
    tables_to_check = ['users', 'questions', 'mastery', 'attempts', 'math_topics', 'science_topics', 'social_topics', 'test_results', 'test_result_details']
    
    with engine.connect() as conn:
        for table in tables_to_check:
            try:
                result = conn.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                print(f"✅ Table '{table}' exists")
            except Exception as e:
                print(f"❌ Table '{table}' missing: {e}")
                # SQLiteの場合は、テーブルが存在しない場合でも続行
                if "sqlite" in str(engine.url).lower():
                    print(f"⚠️  SQLite detected, continuing without table '{table}'")
                    continue
                return False
    return True

def seed_database():
    """データベースにシードデータを挿入"""
    db = SessionLocal()
    try:
        print("Seeding database...")
        
        seed_basic(db)
        print("✅ Basic data seeded")
        
        seed_math_topics(db)
        print("✅ Math topics seeded")
        
        seed_science_topics(db)
        print("✅ Science topics seeded")
        
        seed_social_topics(db)
        print("✅ Social topics seeded")
        
        seed_math_dependencies(db)
        print("✅ Math dependencies seeded")
        
        seed_science_dependencies(db)
        print("✅ Science dependencies seeded")
        
        seed_social_dependencies(db)
        print("✅ Social dependencies seeded")
        
        print("✅ All seeding completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        return False
    finally:
        db.close()

def main():
    """メイン関数"""
    print("🚀 Starting database migration...")
    print(f"Database URL: {os.getenv('DATABASE_URL', 'Not set')}")
    
    # Step 1: Check connection
    if not check_database_connection():
        sys.exit(1)
    
    # Step 2: Remove next_topics columns
    if not remove_next_topics_columns():
        print("⚠️  Failed to remove next_topics columns, but continuing...")
    
    # Step 3: Create tables (if they don't exist)
    if not create_tables():
        sys.exit(1)
    
    # Step 4: Verify tables
    if not verify_tables():
        print("⚠️  Some tables are missing, but continuing...")
    
    # Step 5: Seed database
    if not seed_database():
        sys.exit(1)
    
    print("🎉 Database migration completed successfully!")

if __name__ == "__main__":
    main()
