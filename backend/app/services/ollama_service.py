import os
import json
import requests
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .. import models
import re

class OllamaService:
    def __init__(self):
        self.ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434")
        self.model_name = os.getenv("LOCAL_AI_MODEL", "deepseek-r1:7b")
        self.use_local_ai = os.getenv("USE_LOCAL_AI", "false").lower() == "true"
        
        print(f"🦙 Ollama service initialized")
        print(f"   URL: {self.ollama_url}")
        print(f"   Model: {self.model_name}")
        print(f"   Enabled: {self.use_local_ai}")
    
    def is_available(self) -> bool:
        """Check if Ollama service is available"""
        if not self.use_local_ai:
            return False
            
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            return response.status_code == 200
        except Exception as e:
            print(f"⚠️ Ollama not available: {e}")
            return False
    
    def is_model_available(self) -> bool:
        """Check if the specified model is available"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models_data = response.json()
                available_models = [model['name'] for model in models_data.get('models', [])]
                return self.model_name in available_models
            return False
        except Exception as e:
            print(f"⚠️ Error checking model availability: {e}")
            return False
    
    def pull_model(self) -> bool:
        """Pull the model if it's not available"""
        try:
            print(f"📥 Pulling model {self.model_name}...")
            response = requests.post(
                f"{self.ollama_url}/api/pull",
                json={"name": self.model_name},
                timeout=300  # 5 minutes timeout for model download
            )
            
            if response.status_code == 200:
                print(f"✅ Model {self.model_name} pulled successfully")
                return True
            else:
                print(f"❌ Failed to pull model: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error pulling model: {e}")
            return False
    
    def ensure_model_ready(self) -> bool:
        """Ensure the model is ready for use"""
        if not self.is_available():
            return False
            
        if not self.is_model_available():
            print(f"🔄 Model {self.model_name} not found, attempting to pull...")
            return self.pull_model()
            
        return True
    
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        """Generate a response using Ollama"""
        try:
            if not self.ensure_model_ready():
                raise Exception("Model not ready")
            
            print(f"🦙 Generating response with {self.model_name}...")
            
            # Prepare the request payload
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 1000
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                timeout=60  # 1 minute timeout for generation
            )
            
            if response.status_code == 200:
                result = response.json()
                generated_text = result.get("response", "")
                print(f"✅ Local AI response generated ({len(generated_text)} chars)")
                return generated_text.strip()
            else:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error generating response with Ollama: {e}")
            raise e
    
    def generate_ai_response(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """Generate AI response based on query and context using local model"""
        try:
            # Prepare context from similar chunks
            context = "\n\n".join([
                f"From document '{chunk['document_name']}':\n{chunk['chunk_text']}"
                for chunk in context_chunks
            ])
            
            # Create the system prompt
            system_prompt = "You are a helpful AI assistant that answers questions based only on provided document context. Be concise but comprehensive, and mention which documents you're referencing when relevant."
            
            # Create the user prompt
            user_prompt = f"""Answer the user's question based only on the provided context from their documents.

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

            return self.generate_response(user_prompt, system_prompt)
            
        except Exception as e:
            print(f"❌ Error generating local AI response: {e}")
            raise e
    
    def test_connection(self) -> Dict[str, Any]:
        """Test the connection to Ollama and return status"""
        status = {
            "available": False,
            "model_ready": False,
            "error": None
        }
        
        try:
            if not self.is_available():
                status["error"] = "Ollama service not available"
                return status
            
            status["available"] = True
            
            if not self.is_model_available():
                status["error"] = f"Model {self.model_name} not available"
                return status
            
            status["model_ready"] = True
            
            # Test generation with a simple prompt
            test_response = self.generate_response("Hello, this is a test. Please respond briefly.")
            if test_response:
                status["test_response"] = test_response[:100] + "..." if len(test_response) > 100 else test_response
            
        except Exception as e:
            status["error"] = str(e)
        
        return status
