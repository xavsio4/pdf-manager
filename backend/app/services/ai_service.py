import os
import json
import openai
import anthropic
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .. import models
from .ollama_service import OllamaService
import re

class AIService:
    def __init__(self):
        # Get API keys from environment variables only
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        # Initialize Anthropic client if key is available
        if self.anthropic_api_key:
            self.anthropic_client = anthropic.Anthropic(api_key=self.anthropic_api_key)
            self.use_anthropic = True
            print("✅ Anthropic (Claude) client initialized")
        else:
            self.anthropic_client = None
            self.use_anthropic = False
            print("⚠️ Warning: ANTHROPIC_API_KEY not found.")
        
        # Initialize OpenAI client as fallback for embeddings
        if self.openai_api_key:
            self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
            print("✅ OpenAI client initialized (for embeddings)")
        else:
            self.openai_client = None
            print("⚠️ Warning: OPENAI_API_KEY not found. Embeddings will be limited.")
        
        # Initialize Ollama service for local AI
        self.ollama_service = OllamaService()
        
        # For backwards compatibility
        self.client = self.openai_client
    
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
        """Get embeddings for a list of texts"""
        if not self.client:
            print("❌ OpenAI client not available")
            return []
        
        try:
            # Filter out empty texts
            valid_texts = [text for text in texts if text and text.strip()]
            if not valid_texts:
                return []
            
            print(f"🔄 Getting embeddings for {len(valid_texts)} text chunks")
            
            response = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=valid_texts
            )
            
            embeddings = [item.embedding for item in response.data]
            print(f"✅ Generated {len(embeddings)} embeddings")
            
            return embeddings
            
        except Exception as e:
            print(f"❌ Error generating embeddings: {e}")
            return []
    
    def create_document_embeddings(self, db: Session, document_id: int, text: str):
        """Create embeddings for a document's text"""
        try:
            print(f"🔄 Creating embeddings for document {document_id}")
            
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
            
            # Get embeddings
            embeddings = self.get_embeddings(chunks)
            if not embeddings:
                print(f"❌ Failed to generate embeddings for document {document_id}")
                return
            
            # Store embeddings in database
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                db_embedding = models.DocumentEmbedding(
                    document_id=document_id,
                    chunk_text=chunk,
                    chunk_index=i,
                    embedding=embedding if embedding else None  # Store as raw vector, not JSON
                )
                db.add(db_embedding)
            
            db.commit()
            print(f"✅ Stored {len(embeddings)} embeddings for document {document_id}")
            
        except Exception as e:
            print(f"❌ Error creating document embeddings: {e}")
            db.rollback()
    
    def search_similar_content(self, db: Session, user_id: int, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for similar content across user's documents"""
        if not self.client:
            return []
        
        try:
            print(f"🔍 Searching for: '{query}'")
            
            # Get query embedding
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
            ).limit(200).all()  # Increased limit for better search
            
            print(f"📊 Found {len(user_embeddings)} document chunks to search through")
            
            # Calculate cosine similarity
            similarities = []
            for emb in user_embeddings:
                try:
                    # emb.embedding is already a list of floats from pgvector, no need to parse JSON
                    stored_embedding = emb.embedding
                    similarity = self.cosine_similarity(query_embedding, stored_embedding)
                    
                    # Boost similarity for keyword matches (especially for invoices)
                    keyword_boost = self._calculate_keyword_boost(query.lower(), emb.chunk_text.lower())
                    boosted_similarity = similarity + keyword_boost
                    
                    similarities.append({
                        'document_id': emb.document_id,
                        'chunk_text': emb.chunk_text,
                        'similarity': similarity,
                        'boosted_similarity': boosted_similarity,
                        'chunk_index': emb.chunk_index,
                        'keyword_boost': keyword_boost
                    })
                except Exception as e:
                    print(f"⚠️ Error processing embedding: {e}")
                    continue
            
            # Sort by boosted similarity and return top results
            similarities.sort(key=lambda x: x['boosted_similarity'], reverse=True)
            
            # Filter results with minimum similarity threshold
            min_similarity = 0.3  # Lower threshold to catch more potential matches
            filtered_results = [s for s in similarities if s['boosted_similarity'] > min_similarity]
            
            top_results = filtered_results[:limit]
            
            similarities_str = [f"{r['boosted_similarity']:.3f}" for r in top_results[:3]]
            print(f"🎯 Top similarities: {similarities_str}")
            
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
                        'boosted_similarity': result['boosted_similarity'],
                        'chunk_index': result['chunk_index']
                    })
            
            print(f"✅ Found {len(results)} relevant chunks")
            if results:
                print(f"📄 Documents referenced: {list(set([r['document_name'] for r in results]))}")
            
            return results
            
        except Exception as e:
            print(f"❌ Error in similarity search: {e}")
            return []
    
    def _calculate_keyword_boost(self, query: str, text: str) -> float:
        """Calculate keyword-based boost for similarity scores"""
        boost = 0.0
        
        # Invoice-related keywords
        invoice_keywords = ['invoice', 'bill', 'amount', 'total', 'due', 'payment', 'cost', 'price', 'charge', 'fee', 'sum']
        financial_keywords = ['$', '€', '£', 'usd', 'eur', 'gbp', 'dollar', 'euro', 'pound']
        
        # Check for invoice keywords
        for keyword in invoice_keywords:
            if keyword in query and keyword in text:
                boost += 0.1
        
        # Check for financial keywords
        for keyword in financial_keywords:
            if keyword in query and keyword in text:
                boost += 0.15
        
        # Check for filename patterns (invoice in filename)
        if 'invoice' in query and 'invoice' in text:
            boost += 0.2
        
        # Check for amount patterns (numbers with currency symbols)
        import re
        amount_pattern = r'[\$€£]\s*\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*[\$€£]'
        if re.search(amount_pattern, text):
            if any(word in query for word in ['amount', 'total', 'cost', 'price', 'how much']):
                boost += 0.25
        
        return min(boost, 0.5)  # Cap boost at 0.5
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            import math
            
            # Calculate dot product
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            
            # Calculate magnitudes
            magnitude1 = math.sqrt(sum(a * a for a in vec1))
            magnitude2 = math.sqrt(sum(a * a for a in vec2))
            
            if magnitude1 == 0 or magnitude2 == 0:
                return 0
            
            return dot_product / (magnitude1 * magnitude2)
            
        except Exception as e:
            print(f"❌ Error calculating cosine similarity: {e}")
            return 0
    
    def generate_ai_response(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """Generate AI response based on query and context"""
        # Try local AI first, then fallback to cloud services
        if self.ollama_service.use_local_ai and self.ollama_service.is_available():
            try:
                return self.ollama_service.generate_ai_response(query, context_chunks)
            except Exception as e:
                print(f"⚠️ Local AI failed, falling back to cloud: {e}")
        
        # Fallback to OpenAI
        if self.openai_client:
            return self._generate_openai_response(query, context_chunks)
        else:
            return "Sorry, AI chat is not available. Please configure your OPENAI_API_KEY or set up local AI."
    
    def _generate_anthropic_response(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """Generate AI response using Anthropic Claude"""
        try:
            # Prepare context from similar chunks
            context = "\n\n".join([
                f"From document '{chunk['document_name']}':\n{chunk['chunk_text']}"
                for chunk in context_chunks
            ])
            
            # Create the prompt for Claude
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

            print("🔄 Generating response with Claude...")
            
            response = self.anthropic_client.messages.create(
                model="claude-3-haiku-20240307",  # Fast and cost-effective
                max_tokens=1000,
                temperature=0.7,
                system="You are a helpful AI assistant that answers questions based only on provided document context.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            print("✅ Claude response generated")
            return response.content[0].text.strip()
            
        except Exception as e:
            print(f"❌ Error generating Claude response: {e}")
            return f"Sorry, I encountered an error while processing your question with Claude: {str(e)}"
    
    def _generate_openai_response(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """Generate AI response using OpenAI (fallback)"""
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

            print("🔄 Generating response with OpenAI...")

            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Better model for document analysis
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant that answers questions based only on provided document context."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            print("✅ OpenAI response generated")
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"❌ Error generating OpenAI response: {e}")
            return f"Sorry, I encountered an error while processing your question: {str(e)}"
