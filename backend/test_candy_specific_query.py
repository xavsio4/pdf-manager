#!/usr/bin/env python3
"""
Test specific queries that should match the Candy document content.
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
    
    print("=== TESTING CANDY-SPECIFIC QUERIES ===")
    print()
    
    # Test user ID 1 (xavier)
    test_user_id = 1
    
    # Test queries that should match Candy document
    test_queries = [
        "lave-vaisselle",  # dishwasher in French
        "signal acoustique de fin de programme",  # exact phrase from user
        "fin de programme",  # end of program
        "redémarrer le lave-vaisselle",  # restart the dishwasher
        "touches Option",  # option buttons
        "Service après-vente",  # after-sales service
        "Candy",  # brand name
        "programme voulu"  # desired program
    ]
    
    ai_service = AIService()
    
    for query in test_queries:
        print(f"🔍 Testing query: '{query}'")
        try:
            results = ai_service.search_similar_content(db, test_user_id, query, limit=5)
            
            if results:
                print(f"   ✅ Found {len(results)} results:")
                candy_found = False
                for i, result in enumerate(results):
                    is_candy = "Candy" in result['document_name']
                    if is_candy:
                        candy_found = True
                    marker = "🎯" if is_candy else "  "
                    print(f"   {marker} {i+1}. {result['document_name']} (similarity: {result['similarity']:.3f})")
                
                if candy_found:
                    print(f"   🎉 CANDY DOCUMENT FOUND!")
                else:
                    print(f"   ❌ Candy document not in results")
            else:
                print("   ❌ No results found")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()
    
    # Test with even lower threshold
    print("🔧 TESTING WITH LOWER THRESHOLD (0.1):")
    
    # Temporarily modify the search to use a very low threshold
    query = "signal acoustique de fin de programme"
    print(f"Testing query: '{query}' with threshold 0.1")
    
    try:
        # Get query embedding
        query_embeddings = ai_service.get_embeddings([query])
        if not query_embeddings:
            print("❌ Failed to get query embedding")
            return
        
        query_embedding = query_embeddings[0]
        
        # Get all embeddings for user's documents
        user_embeddings = db.query(models.DocumentEmbedding).join(
            models.Document
        ).filter(
            models.Document.owner_id == test_user_id,
            models.DocumentEmbedding.embedding.isnot(None)
        ).all()
        
        print(f"📊 Found {len(user_embeddings)} document chunks to search through")
        
        # Calculate cosine similarity
        similarities = []
        for emb in user_embeddings:
            try:
                # Handle different embedding storage formats
                stored_embedding = emb.embedding
                
                # Convert pgvector format to list of floats if needed
                if hasattr(stored_embedding, '__iter__') and not isinstance(stored_embedding, str):
                    stored_embedding = list(stored_embedding)
                elif isinstance(stored_embedding, str):
                    try:
                        import json
                        stored_embedding = json.loads(stored_embedding)
                    except:
                        continue
                else:
                    continue
                
                if not isinstance(stored_embedding, list) or not isinstance(query_embedding, list):
                    continue
                
                similarity = ai_service.cosine_similarity(query_embedding, stored_embedding)
                
                similarities.append({
                    'document_id': emb.document_id,
                    'chunk_text': emb.chunk_text,
                    'similarity': similarity,
                    'chunk_index': emb.chunk_index
                })
            except Exception as e:
                continue
        
        # Sort by similarity and return top results
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Filter with very low threshold
        min_similarity = 0.1
        filtered_results = [s for s in similarities if s['similarity'] > min_similarity]
        
        print(f"Results with threshold {min_similarity}:")
        
        # Get document info for top 10 results
        candy_results = []
        other_results = []
        
        for result in filtered_results[:20]:  # Check top 20
            document = db.query(models.Document).filter(
                models.Document.id == result['document_id']
            ).first()
            
            if document:
                result_info = {
                    'document_name': document.original_filename,
                    'similarity': result['similarity'],
                    'chunk_text': result['chunk_text'][:100] + "..."
                }
                
                if "Candy" in document.original_filename:
                    candy_results.append(result_info)
                else:
                    other_results.append(result_info)
        
        print(f"\n🎯 CANDY DOCUMENT RESULTS ({len(candy_results)}):")
        for i, result in enumerate(candy_results[:5]):
            print(f"   {i+1}. Similarity: {result['similarity']:.3f}")
            print(f"      Text: {result['chunk_text']}")
        
        print(f"\n📄 OTHER DOCUMENT RESULTS ({len(other_results)}):")
        for i, result in enumerate(other_results[:5]):
            print(f"   {i+1}. {result['document_name']}: {result['similarity']:.3f}")
        
        if candy_results:
            best_candy_score = candy_results[0]['similarity']
            best_other_score = other_results[0]['similarity'] if other_results else 0
            print(f"\n📊 COMPARISON:")
            print(f"   Best Candy score: {best_candy_score:.3f}")
            print(f"   Best other score: {best_other_score:.3f}")
            print(f"   Difference: {best_other_score - best_candy_score:.3f}")
        
    except Exception as e:
        print(f"❌ Error in detailed search: {e}")
        import traceback
        traceback.print_exc()
    
    db.close()
    print("\n=== TEST COMPLETE ===")

if __name__ == "__main__":
    main()
