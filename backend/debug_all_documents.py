#!/usr/bin/env python3
"""
Debug script to investigate why only 2 documents are being found in search.
Check all documents and their embeddings for the user.
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
    
    print("=== DEBUGGING ALL DOCUMENTS SEARCH ISSUE ===")
    print()
    
    # 1. Check all users
    print("1. CHECKING ALL USERS:")
    result = db.execute(text("""
        SELECT id, email, username FROM users ORDER BY id
    """))
    
    users = []
    for row in result:
        users.append({'id': row[0], 'email': row[1], 'username': row[2]})
        print(f"   User ID: {row[0]}, Email: {row[1]}, Username: {row[2]}")
    
    if not users:
        print("   ❌ No users found!")
        db.close()
        return
    
    # Use the first user for testing (or find the user with documents)
    test_user_id = users[0]['id']
    print(f"\n   Using User ID {test_user_id} for testing")
    
    print()
    
    # 2. Check all documents for this user
    print("2. CHECKING ALL DOCUMENTS FOR USER:")
    result = db.execute(text("""
        SELECT id, original_filename, ocr_status, owner_id,
               LENGTH(extracted_text) as text_length
        FROM documents 
        WHERE owner_id = :user_id
        ORDER BY id
    """), {'user_id': test_user_id})
    
    documents = []
    for row in result:
        doc = {
            'id': row[0],
            'filename': row[1],
            'ocr_status': row[2],
            'owner_id': row[3],
            'text_length': row[4]
        }
        documents.append(doc)
        print(f"   Doc ID: {doc['id']}, File: {doc['filename']}, Status: {doc['ocr_status']}, Text: {doc['text_length']} chars")
    
    if not documents:
        print("   ❌ No documents found for this user!")
        db.close()
        return
    
    print()
    
    # 3. Check embeddings for each document
    print("3. CHECKING EMBEDDINGS FOR EACH DOCUMENT:")
    for doc in documents:
        result = db.execute(text("""
            SELECT COUNT(*) as embedding_count
            FROM document_embeddings 
            WHERE document_id = :doc_id
        """), {'doc_id': doc['id']})
        
        embedding_count = result.fetchone()[0]
        print(f"   {doc['filename']} (ID: {doc['id']}): {embedding_count} embeddings")
    
    print()
    
    # 4. Test the search query that's being used
    print("4. TESTING SEARCH QUERY USED BY AI SERVICE:")
    
    # This is the exact query from the AI service
    result = db.execute(text("""
        SELECT d.id, d.original_filename, COUNT(e.id) as embedding_count
        FROM document_embeddings e
        JOIN documents d ON e.document_id = d.id
        WHERE d.owner_id = :user_id
        AND e.embedding IS NOT NULL
        GROUP BY d.id, d.original_filename
        ORDER BY d.id
    """), {'user_id': test_user_id})
    
    print(f"   Documents found by AI search query:")
    search_docs = []
    for row in result:
        search_docs.append({'id': row[0], 'filename': row[1], 'embeddings': row[2]})
        print(f"   - {row[1]} (ID: {row[0]}): {row[2]} embeddings")
    
    if len(search_docs) != len(documents):
        print(f"\n   ❌ PROBLEM: AI search finds {len(search_docs)} docs, but user has {len(documents)} docs!")
        
        # Find missing documents
        search_doc_ids = {doc['id'] for doc in search_docs}
        all_doc_ids = {doc['id'] for doc in documents}
        missing_doc_ids = all_doc_ids - search_doc_ids
        
        print(f"   Missing document IDs: {missing_doc_ids}")
        
        for missing_id in missing_doc_ids:
            missing_doc = next(doc for doc in documents if doc['id'] == missing_id)
            print(f"   Missing: {missing_doc['filename']} (ID: {missing_id})")
            
            # Check why this document is missing
            result = db.execute(text("""
                SELECT COUNT(*) as total_embeddings,
                       COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as non_null_embeddings
                FROM document_embeddings 
                WHERE document_id = :doc_id
            """), {'doc_id': missing_id})
            
            counts = result.fetchone()
            print(f"     Total embeddings: {counts[0]}")
            print(f"     Non-null embeddings: {counts[1]}")
            
            if counts[0] > 0 and counts[1] == 0:
                print(f"     ❌ ISSUE: All embeddings are NULL for this document!")
    else:
        print(f"   ✅ All {len(documents)} documents are found by AI search")
    
    print()
    
    # 5. Test actual similarity search
    print("5. TESTING ACTUAL SIMILARITY SEARCH:")
    try:
        ai_service = AIService()
        query = "signal acoustique"
        
        print(f"   Testing query: '{query}'")
        results = ai_service.search_similar_content(db, test_user_id, query, limit=10)
        
        if results:
            print(f"   ✅ Found {len(results)} results:")
            for i, result in enumerate(results):
                print(f"      {i+1}. {result['document_name']} (similarity: {result['similarity']:.3f})")
        else:
            print("   ❌ No results found")
            
    except Exception as e:
        print(f"   ❌ Error testing similarity search: {e}")
        import traceback
        traceback.print_exc()
    
    db.close()
    print("\n=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    main()
