#!/usr/bin/env python3
"""
Debug script to investigate why the AI chat can't find specific text in documents.
This script will check:
1. If the document exists and has OCR text
2. If embeddings were created
3. If the similarity search is working correctly
4. Test the complete search pipeline
"""

import os
import sys
import json
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
    
    print("=== DEBUGGING AI SEARCH ISSUE ===")
    print()
    
    # 1. Check for Candy document
    print("1. CHECKING CANDY DOCUMENT...")
    result = db.execute(text("""
        SELECT id, original_filename, ocr_status, 
               LENGTH(extracted_text) as text_length,
               CASE WHEN extracted_text LIKE '%signal acoustique%' THEN 'YES' ELSE 'NO' END as contains_signal,
               CASE WHEN extracted_text LIKE '%fin de programme%' THEN 'YES' ELSE 'NO' END as contains_fin_programme
        FROM documents 
        WHERE original_filename LIKE '%Candy%'
        ORDER BY id DESC
        LIMIT 1
    """))
    
    candy_doc = None
    for row in result:
        candy_doc = {
            'id': row[0],
            'filename': row[1],
            'ocr_status': row[2],
            'text_length': row[3],
            'contains_signal': row[4],
            'contains_fin_programme': row[5]
        }
        print(f"   Document ID: {candy_doc['id']}")
        print(f"   Filename: {candy_doc['filename']}")
        print(f"   OCR Status: {candy_doc['ocr_status']}")
        print(f"   Text Length: {candy_doc['text_length']}")
        print(f"   Contains 'signal acoustique': {candy_doc['contains_signal']}")
        print(f"   Contains 'fin de programme': {candy_doc['contains_fin_programme']}")
        break
    
    if not candy_doc:
        print("   ❌ No Candy document found!")
        db.close()
        return
    
    print()
    
    # 2. Check embeddings
    print("2. CHECKING EMBEDDINGS...")
    result = db.execute(text("""
        SELECT COUNT(*) as embedding_count
        FROM document_embeddings 
        WHERE document_id = :doc_id
    """), {'doc_id': candy_doc['id']})
    
    embedding_count = result.fetchone()[0]
    print(f"   Embeddings count: {embedding_count}")
    
    if embedding_count == 0:
        print("   ❌ No embeddings found! This is the problem.")
        
        # Try to regenerate embeddings
        print("   🔄 Attempting to regenerate embeddings...")
        try:
            # Get the document text
            doc_result = db.execute(text("""
                SELECT extracted_text FROM documents WHERE id = :doc_id
            """), {'doc_id': candy_doc['id']})
            
            extracted_text = doc_result.fetchone()[0]
            if extracted_text:
                ai_service = AIService()
                ai_service.create_document_embeddings(db, candy_doc['id'], extracted_text)
                print("   ✅ Embeddings regenerated successfully!")
            else:
                print("   ❌ No extracted text available for embedding generation")
        except Exception as e:
            print(f"   ❌ Failed to regenerate embeddings: {e}")
    else:
        print("   ✅ Embeddings exist")
    
    print()
    
    # 3. Test similarity search
    print("3. TESTING SIMILARITY SEARCH...")
    try:
        ai_service = AIService()
        
        # Test queries
        test_queries = [
            "signal acoustique de fin de programme",
            "signal acoustique",
            "fin de programme",
            "alarme",
            "son"
        ]
        
        for query in test_queries:
            print(f"   Testing query: '{query}'")
            results = ai_service.search_similar_content(db, 1, query, limit=3)  # Assuming user_id=1
            
            if results:
                print(f"   ✅ Found {len(results)} results:")
                for i, result in enumerate(results):
                    print(f"      {i+1}. Document: {result['document_name']}")
                    print(f"         Similarity: {result['similarity']:.3f}")
                    print(f"         Chunk: {result['chunk_text'][:100]}...")
            else:
                print("   ❌ No results found")
            print()
    
    except Exception as e:
        print(f"   ❌ Error testing similarity search: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # 4. Check specific chunks containing the text
    print("4. CHECKING SPECIFIC CHUNKS...")
    try:
        result = db.execute(text("""
            SELECT e.chunk_text, e.chunk_index
            FROM document_embeddings e
            WHERE e.document_id = :doc_id
            AND (e.chunk_text LIKE '%signal acoustique%' OR e.chunk_text LIKE '%fin de programme%')
            LIMIT 5
        """), {'doc_id': candy_doc['id']})
        
        chunks_found = False
        for row in result:
            chunks_found = True
            print(f"   Chunk {row[1]}: {row[0][:200]}...")
            print()
        
        if not chunks_found:
            print("   ❌ No chunks found containing the target text")
            
            # Let's check all chunks to see what's there
            print("   📋 Checking first few chunks...")
            result = db.execute(text("""
                SELECT e.chunk_text, e.chunk_index
                FROM document_embeddings e
                WHERE e.document_id = :doc_id
                ORDER BY e.chunk_index
                LIMIT 3
            """), {'doc_id': candy_doc['id']})
            
            for row in result:
                print(f"   Chunk {row[1]}: {row[0][:200]}...")
                print()
        else:
            print("   ✅ Found chunks containing target text")
    
    except Exception as e:
        print(f"   ❌ Error checking chunks: {e}")
    
    db.close()
    print("=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    main()
