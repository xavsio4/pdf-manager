import os
import json
import requests
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .. import models
import re
from sentence_transformers import SentenceTransformer
import numpy as np

class LocalAIService:
    def __init__(self):
        # Initialize local embedding model
        try:
            print("🔄 Loading local embedding model...")
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("✅ Local embedding model loaded")
        except Exception as e:
            print(f"❌ Error loading embedding model: {e}")
            self.embedding_model = None
        
        # Ollama configuration
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")  # or "mistral", "codellama", etc.
        
        # Test Ollama connection
        self.test_ollama_connection()
    
    def test_ollama_connection(self):
        """Test if Ollama is running and model is available"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                model_names = [m['name'] for m in models]
                if self.ollama_model in model_names:
                    print(f"✅ Ollama connected - Model '{self.ollama_model}' available")
                else:
                    print(f"⚠️ Model '{self.ollama_model}' not found. Available models: {model_names}")
                    print(f"💡 Run: ollama pull {self.ollama_model}")
            else:
                print(f"❌ Ollama not responding (status: {response.status_code})")
        except Exception as e:
            print(f"❌ Cannot connect to Ollama: {e}")
            print("💡 Make sure Ollama is running: ollama serve")
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks for embedding"""
        if not text or not text.strip():
            return []
        
        # Clean the text
        text = re.sub(r'\s+', ' ', text.strip())
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Find end position
            end = start + chunk_size
            
            # If we're not at the end, try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 200 characters
                sentence_end = text.rfind('.', start + chunk_size - 200, end)
                if sentence_end > start:
                    end = sentence_end + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = max(start + chunk_size - overlap, end)
            
            # Prevent infinite loop
            if start >= len(text):
                break
        
        return chunks
    
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings using local sentence transformer model"""
        if not self.embedding_model:
            print("❌ Local embedding model not available")
            return []
        
        try:
            # Filter out empty texts
            valid_texts = [text for text in texts if text and text.strip()]
            if not valid_texts:
                return []
            
            print(f"🔄 Getting local embeddings for {len(valid_texts)} text chunks")
            
            # Generate embeddings using sentence-transformers
            embeddings = self.embedding_model.encode(valid_texts)
            
            # Convert to list of lists
            embeddings_list = [emb.tolist() for emb in embeddings]
            
            print(f"✅ Generated {len(embeddings_list)} local embeddings")
            return embeddings_list
            
        except Exception as e:
            print(f"❌ Error generating local embeddings: {e}")
            return []
    
    def create_document_embeddings(self, db: Session, document_id: int, text: str):
        """Create embeddings for a document's text using local model"""
        try:
            print(f"🔄 Creating local embeddings for document {document_id}")
            
            # Delete existing embeddings for this document
            db.query(models.DocumentEmbedding).filter(
                models.DocumentEmbedding.document_id == document_id
            ).delete()
            
            # Chunk the text
            chunks = self.chunk_text(text)
            if not chunks:
                print(f"⚠️ No valid text chunks found for document {document_id}")
                return
            
            print(f"📝 Split document into {len(chunks)} chunks")
            
            # Get embeddings using local model
            embeddings = self.get_embeddings(chunks)
            if not embeddings:
                print(f"❌ Failed to generate local embeddings for document {document_id}")
                return
            
            # Store embeddings in database
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                db_embedding = models.DocumentEmbedding(
                    document_id=document_id,
                    chunk_text=chunk,
                    chunk_index=i,
                    embedding=json.dumps(embedding) if embedding else None
                )
                db.add(db_embedding)
            
            db.commit()
            print(f"✅ Stored {len(embeddings)} local embeddings for document {document_id}")
            
        except Exception as e:
            print(f"❌ Error creating document embeddings: {e}")
            db.rollback()
    
    def search_similar_content(self, db: Session, user_id: int, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for similar content using local embeddings"""
        if not self.embedding_model:
            return []
        
        try:
            print(f"🔍 Searching locally for: '{query}'")
            
            # Get query embedding using local model
            query_embeddings = self.get_embeddings([query])
            if not query_embeddings:
                return []
            
            query_embedding = query_embeddings[0]
            
            # Get all embeddings for user's documents
            user_embeddings = db.query(models.DocumentEmbedding).join(
                models.Document
            ).filter(
                models.Document.owner_id == user_id,
                models.DocumentEmbedding.embedding.isnot(None)
            ).limit(100).all()  # Limit for performance
            
            # Calculate cosine similarity
            similarities = []
            for emb in user_embeddings:
                try:
                    stored_embedding = json.loads(emb.embedding)
                    similarity = self.cosine_similarity(query_embedding, stored_embedding)
                    
                    similarities.append({
                        'document_id': emb.document_id,
                        'chunk_text': emb.chunk_text,
                        'similarity': similarity,
                        'chunk_index': emb.chunk_index
                    })
                except Exception as e:
                    print(f"⚠️ Error processing embedding: {e}")
                    continue
            
            # Sort by similarity and return top results
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            top_results = similarities[:limit]
            
            # Get document info
            results = []
            for result in top_results:
                document = db.query(models.Document).filter(
                    models.Document.id == result['document_id']
                ).first()
                
                if document:
                    results.append({
                        'document_id': document.id,
                        'document_name': document.original_filename,
                        'chunk_text': result['chunk_text'],
                        'similarity': result['similarity'],
                        'chunk_index': result['chunk_index']
                    })
            
            print(f"✅ Found {len(results)} similar chunks locally")
            return results
            
        except Exception as e:
            print(f"❌ Error in local similarity search: {e}")
            return []
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            vec1 = np.array(vec1)
            vec2 = np.array(vec2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0
            
            return dot_product / (norm1 * norm2)
            
        except Exception as e:
            print(f"❌ Error calculating cosine similarity: {e}")
            return 0
    
    def generate_ai_response(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """Generate AI response using local Ollama model"""
        try:
            # Prepare context from similar chunks
            context = "\n\n".join([
                f"From document '{chunk['document_name']}':\n{chunk['chunk_text']}"
                for chunk in context_chunks
            ])
            
            # Create the prompt
            prompt = f"""You are an AI assistant helping users understand their documents. 
Answer the user's question based only on the provided context from their documents.

Context from documents:
{context}

User question: {query}

Instructions:
- Only use information from the provided context
- If the context doesn't contain relevant information, say so clearly
- Be concise but comprehensive
- Mention which documents you're referencing when relevant
- If you're not certain about something, express that uncertainty

Answer:"""

            # Call Ollama API
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": 1000
                    }
                },
                timeout=60  # Increase timeout for local processing
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', 'Sorry, I could not generate a response.')
            else:
                print(f"❌ Ollama API error: {response.status_code}")
                return f"Sorry, I encountered an error while processing your question (Status: {response.status_code})"
            
        except requests.exceptions.Timeout:
            return "Sorry, the request timed out. The local AI model might be processing a large request."
        except Exception as e:
            print(f"❌ Error generating local AI response: {e}")
            return f"Sorry, I encountered an error while processing your question: {str(e)}"
    
    def generate_ai_response_streaming(self, query: str, context_chunks: List[Dict[str, Any]]):
        """Generate streaming AI response using local Ollama model"""
        try:
            # Prepare context from similar chunks
            context = "\n\n".join([
                f"From document '{chunk['document_name']}':\n{chunk['chunk_text']}"
                for chunk in context_chunks
            ])
            
            # Create the prompt
            prompt = f"""You are an AI assistant helping users understand their documents. 
Answer the user's question based only on the provided context from their documents.

Context from documents:
{context}

User question: {query}

Instructions:
- Only use information from the provided context
- If the context doesn't contain relevant information, say so clearly
- Be concise but comprehensive
- Mention which documents you're referencing when relevant
- If you're not certain about something, express that uncertainty

Answer:"""

            # Call Ollama API with streaming
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": 1000
                    }
                },
                stream=True,
                timeout=60
            )
            
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line.decode('utf-8'))
                            if 'response' in chunk:
                                yield chunk['response']
                            if chunk.get('done', False):
                                break
                        except json.JSONDecodeError:
                            continue
            else:
                yield f"Error: Ollama API returned status {response.status_code}"
            
        except Exception as e:
            yield f"Error: {str(e)}"
