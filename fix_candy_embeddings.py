#!/usr/bin/env python3
"""
Script to regenerate embeddings for the Candy document to fix the format issue.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to Python path
sys.path.append('/app')
sys.path.append('/app/app')

try:
    from app.services.ai_service import AIService
    from app import models
except ImportError as e:
    print(f"Import error: {e}")
    print("Trying alternative imports...")
    try:
        from services.ai_service import AIService
        import models
    except ImportError as e2:
        print(f"Alternative import also failed: {e2}")
        sys.exit(1)

def main():
    # Database connection
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@db:5432/pdf_manager')
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    print("=== FIXING CANDY DOCUMENT EMBEDDINGS ===")
    print()
    
    # Get Candy document
    result = db.execute(text("""
        SELECT id, original_filename, extracted_text
        FROM documents 
        WHERE original_filename LIKE '%Candy%' 
        ORDER BY id DESC 
        LIMIT 1
    """))
    
    candy_doc = result.fetchone()
    if not candy_doc:
        print("❌ No Candy document found!")
        db.close()
        return
    
    doc_id, filename, extracted_text = candy_doc
    print(f"Found document: {filename} (ID: {doc_id})")
    print(f"Text length: {len(extracted_text) if extracted_text else 0} characters")
    
    if not extracted_text:
        print("❌ No extracted text available!")
        db.close()
        return
    
    # Delete existing embeddings
    print("\n🗑️ Deleting existing embeddings...")
    result = db.execute(text("""
        DELETE FROM document_embeddings WHERE document_id = :doc_id
    """), {'doc_id': doc_id})
    db.commit()
    print(f"✅ Deleted existing embeddings")
    
    # Regenerate embeddings
    print("\n🔄 Regenerating embeddings...")
    try:
        ai_service = AIService()
        ai_service.create_document_embeddings(db, doc_id, extracted_text)
        print("✅ Embeddings regenerated successfully!")
        
        # Verify the new embeddings
        result = db.execute(text("""
            SELECT COUNT(*) FROM document_embeddings WHERE document_id = :doc_id
        """), {'doc_id': doc_id})
        count = result.fetchone()[0]
        print(f"✅ New embedding count: {count}")
        
    except Exception as e:
        print(f"❌ Failed to regenerate embeddings: {e}")
        import traceback
        traceback.print_exc()
    
    db.close()
    print("\n=== EMBEDDING FIX COMPLETE ===")

if __name__ == "__main__":
    main()
