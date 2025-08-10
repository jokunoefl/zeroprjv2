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

def verify_tables():
    """テーブルの存在を確認"""
    from sqlalchemy import text
    tables_to_check = ['questions', 'mastery', 'attempts', 'math_topics', 'science_topics', 'social_topics', 'test_results', 'test_result_details']
    
    with engine.connect() as conn:
        for table in tables_to_check:
            try:
                result = conn.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                print(f"✅ Table '{table}' exists")
            except Exception as e:
                print(f"❌ Table '{table}' missing: {e}")
                # SQLiteの場合は、テーブルが存在しない場合でも続行
                if "sqlite" in str(DATABASE_URL).lower():
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
    
    # Step 2: Create tables
    if not create_tables():
        sys.exit(1)
    
    # Step 3: Verify tables (SQLiteの場合はスキップ可能)
    if not verify_tables():
        if "sqlite" in str(os.getenv('DATABASE_URL', '')).lower():
            print("⚠️  SQLite detected, continuing with seeding despite table verification failure")
        else:
            print("❌ Table verification failed")
            sys.exit(1)
    
    # Step 4: Seed database
    if not seed_database():
        print("❌ Database seeding failed")
        sys.exit(1)
    
    print("🎉 Database migration completed successfully!")

if __name__ == "__main__":
    main()
