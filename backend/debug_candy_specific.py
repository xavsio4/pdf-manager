#!/usr/bin/env python3
"""
Specific debug script to investigate why Candy document chunks aren't being found in similarity search.
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
    
    print("=== DEBUGGING CANDY DOCUMENT SEARCH ===")
    print()
    
    # Get Candy document ID
    result = db.execute(text("""
        SELECT id FROM documents WHERE original_filename LIKE '%Candy%' ORDER BY id DESC LIMIT 1
    """))
    candy_doc_id = result.fetchone()[0]
    print(f"Candy document ID: {candy_doc_id}")
    
    # Check chunks containing "signal acoustique"
    print("\n1. CHUNKS CONTAINING 'signal acoustique':")
    result = db.execute(text("""
        SELECT chunk_index, chunk_text
        FROM document_embeddings 
        WHERE document_id = :doc_id 
        AND chunk_text LIKE '%signal acoustique%'
        ORDER BY chunk_index
    """), {'doc_id': candy_doc_id})
    
    signal_chunks = []
    for row in result:
        signal_chunks.append((row[0], row[1]))
        print(f"   Chunk {row[0]}: {row[1][:150]}...")
    
    if not signal_chunks:
        print("   ❌ No chunks found with 'signal acoustique'")
        return
    
    # Test similarity search specifically for Candy document
    print(f"\n2. TESTING SIMILARITY SEARCH FOR CANDY DOCUMENT ONLY:")
    
    ai_service = AIService()
    query = "signal acoustique de fin de programme"
    
    # Get query embedding
    query_embeddings = ai_service.get_embeddings([query])
    if not query_embeddings:
        print("   ❌ Failed to get query embedding")
        return
    
    query_embedding = query_embeddings[0]
    
    # Get all Candy document embeddings
    result = db.execute(text("""
        SELECT chunk_index, chunk_text, embedding
        FROM document_embeddings 
        WHERE document_id = :doc_id
        ORDER BY chunk_index
    """), {'doc_id': candy_doc_id})
    
    print(f"   Testing similarity for all {candy_doc_id} chunks...")
    
    similarities = []
    for row in result:
        chunk_index, chunk_text, stored_embedding = row
        
        if stored_embedding:
            try:
                similarity = ai_service.cosine_similarity(query_embedding, stored_embedding)
                similarities.append({
                    'chunk_index': chunk_index,
                    'chunk_text': chunk_text,
                    'similarity': similarity
                })
            except Exception as e:
                print(f"   ⚠️ Error calculating similarity for chunk {chunk_index}: {e}")
    
    # Sort by similarity
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    
    print(f"\n   TOP 10 MOST SIMILAR CHUNKS FROM CANDY DOCUMENT:")
    for i, sim in enumerate(similarities[:10]):
        print(f"   {i+1}. Chunk {sim['chunk_index']}: Similarity {sim['similarity']:.3f}")
        print(f"      Text: {sim['chunk_text'][:100]}...")
        print()
    
    # Check if any of the signal acoustique chunks are in top results
    print(f"\n3. CHECKING SIGNAL ACOUSTIQUE CHUNKS SIMILARITY:")
    for chunk_index, chunk_text in signal_chunks:
        # Find this chunk in similarities
        for sim in similarities:
            if sim['chunk_index'] == chunk_index:
                print(f"   Chunk {chunk_index}: Similarity {sim['similarity']:.3f}")
                print(f"   Text: {chunk_text[:200]}...")
                break
    
    # Check the minimum similarity threshold
    print(f"\n4. SIMILARITY THRESHOLD ANALYSIS:")
    min_threshold = 0.3  # From ai_service.py
    above_threshold = [s for s in similarities if s['similarity'] > min_threshold]
    print(f"   Minimum threshold: {min_threshold}")
    print(f"   Chunks above threshold: {len(above_threshold)}")
    print(f"   Highest similarity in Candy doc: {similarities[0]['similarity']:.3f}")
    
    if similarities[0]['similarity'] < min_threshold:
        print(f"   ❌ PROBLEM: Highest similarity ({similarities[0]['similarity']:.3f}) is below threshold ({min_threshold})")
        print(f"   💡 SOLUTION: Lower the threshold or improve embedding matching")
    
    db.close()
    print("\n=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    main()
