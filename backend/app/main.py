from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional
import traceback
import os
import uuid
from pathlib import Path
from typing import List
import json

# Import our modules
try:
    from . import models, database, auth
    print("✅ Successfully imported modules")
except ImportError as e:
    print(f"❌ Import error: {e}")
    # Fallback imports for development
    import models
    import database
    import auth

# Add this import at the top of your main.py
try:
    from .tasks.ocr_tasks import process_pdf_ocr
except ImportError:
    # For development
    from app.tasks.ocr_tasks import process_pdf_ocr    

# Create tables
try:
    models.Base.metadata.create_all(bind=database.engine)
    print("✅ Database tables created")
except Exception as e:
    print(f"❌ Database error: {e}")

app = FastAPI(title="PDF Manager API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool

# Basic routes
@app.get("/")
async def root():
    return {"message": "PDF Manager API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Authentication routes
@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(database.get_db)):
    try:
        print(f"Register attempt for: {user.email}")
        
        # Check if user exists
        existing_user = auth.get_user(db, email=user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        new_user = auth.create_user(db, user.email, user.username, user.password)
        print(f"✅ User created: {new_user.email}")
        
        return UserResponse(
            id=new_user.id,
            email=new_user.email,
            username=new_user.username,
            is_active=new_user.is_active
        )
    except Exception as e:
        print(f"❌ Register error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(database.get_db)):
    try:
        print(f"Login attempt for: {credentials.email}")
        
        # Authenticate user
        user = auth.authenticate_user(db, credentials.email, credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create token
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email}, 
            expires_delta=access_token_expires
        )
        
        print(f"✅ Login successful for: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    try:
        print(f"Me endpoint called for user: {current_user.email}")
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            is_active=current_user.is_active
        )
    except Exception as e:
        print(f"❌ /me error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Simple upload endpoint with database record
@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        print(f"Upload request from user {current_user.email}: {file.filename}")
        
        # Basic validation
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Create upload directory
        upload_dir = Path("/app/uploads")
        upload_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        file_size = len(content)
        
        # Create document record in database (without file_hash for now)
        document = models.Document(
            filename=unique_filename,
            original_filename=file.filename,
            file_path=str(file_path),
            file_size=file_size,
            mime_type=file.content_type or "application/pdf",
            ocr_status="pending",
            owner_id=current_user.id
        )


        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        print(f"✅ File saved: {file_path} ({file_size} bytes)")
        print(f"✅ Document record created: ID {document.id}")

        try:
            task = process_pdf_ocr.delay(document.id)
            print(f"🚀 Started OCR task {task.id} for document {document.id}")
        except Exception as e:
            print(f"⚠️ Failed to start OCR task: {e}") 
        
        return {
            "id": document.id,
            "message": "File uploaded successfully",
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_size": file_size,
            "ocr_status": document.ocr_status,
            "user": current_user.username
        }
    
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
# Add these new endpoints to your existing working main.py

# Delete endpoint
@app.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        # Get document
        document = db.query(models.Document).filter(
            models.Document.id == document_id,
            models.Document.owner_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete file from disk
        try:
            Path(document.file_path).unlink(missing_ok=True)
            print(f"✅ File deleted from disk: {document.file_path}")
        except Exception as e:
            print(f"⚠️ Could not delete file from disk: {e}")
        
        # Delete from database
        db.delete(document)
        db.commit()
        
        print(f"✅ Document deleted: {document.original_filename}")
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

# Download endpoint  
@app.get("/documents/{document_id}/download")
async def download_document(
    document_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        from fastapi.responses import FileResponse
        
        # Get document
        document = db.query(models.Document).filter(
            models.Document.id == document_id,
            models.Document.owner_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        return FileResponse(
            path=str(file_path),
            filename=document.original_filename,
            media_type='application/pdf'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Download error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")    

# Add documents list endpoint
@app.get("/documents")
async def get_documents(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        documents = db.query(models.Document).filter(
            models.Document.owner_id == current_user.id
        ).order_by(models.Document.created_at.desc()).all()
        
        return [
            {
                "id": doc.id,
                "filename": doc.filename,
                "original_filename": doc.original_filename,
                "file_size": doc.file_size,
                "ocr_status": doc.ocr_status,
                "title": doc.title,
                "created_at": doc.created_at.isoformat() if doc.created_at else ""
            }
            for doc in documents
        ]
        
    except Exception as e:
        print(f"❌ Get documents error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get documents: {str(e)}")


@app.get("/documents/{document_id}/text")
async def get_document_text(
    document_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        document = db.query(models.Document).filter(
            models.Document.id == document_id,
            models.Document.owner_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "id": document.id,
            "filename": document.original_filename,
            "ocr_status": document.ocr_status,
            "extracted_text": document.extracted_text or "No text extracted yet.",
            "processed_at": document.processed_at.isoformat() if document.processed_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get text error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# chat ai

@app.post("/chat/sessions")
async def create_chat_session(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        session = models.ChatSession(
            user_id=current_user.id,
            title="New Chat"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return {
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at.isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/sessions")
async def get_chat_sessions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        sessions = db.query(models.ChatSession).filter(
            models.ChatSession.user_id == current_user.id
        ).order_by(models.ChatSession.updated_at.desc()).all()
        
        return [
            {
                "id": session.id,
                "title": session.title,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat() if session.updated_at else None
            }
            for session in sessions
        ]
        
    except Exception as e:
        print(f"❌ Error getting chat sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_chat_title(message: str) -> str:
    """Generate a meaningful title from the first message"""
    # Clean the message
    clean_message = message.strip()
    
    # If message is too short, use it as is
    if len(clean_message) <= 50:
        return clean_message
    
    # Try to find a good breaking point (sentence end, question mark, etc.)
    for i, char in enumerate(clean_message):
        if char in '.!?' and i >= 20:  # At least 20 chars
            return clean_message[:i+1]
    
    # If no good breaking point, truncate at word boundary
    if len(clean_message) > 50:
        truncated = clean_message[:47]
        last_space = truncated.rfind(' ')
        if last_space > 20:  # Ensure we don't truncate too much
            return truncated[:last_space] + "..."
        else:
            return truncated + "..."
    
    return clean_message

@app.post("/chat/sessions/{session_id}/messages")
async def send_chat_message(
    session_id: int,
    message: dict,  # {"content": "user message"}
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        from .services.ai_service import AIService
        
        # Verify session belongs to user
        session = db.query(models.ChatSession).filter(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        user_message = message.get("content", "").strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="Message content cannot be empty")
        
        # Check if this is the first message in the session
        existing_messages = db.query(models.ChatMessage).filter(
            models.ChatMessage.session_id == session_id
        ).count()
        
        # If this is the first message, update the session title
        if existing_messages == 0:
            new_title = generate_chat_title(user_message)
            session.title = new_title
        
        # Save user message
        user_msg = models.ChatMessage(
            session_id=session_id,
            role="user",
            content=user_message
        )
        db.add(user_msg)
        
        # Search for relevant content
        ai_service = AIService()
        similar_chunks = ai_service.search_similar_content(
            db, current_user.id, user_message, limit=5
        )
        
        # Generate AI response
        ai_response = ai_service.generate_ai_response(user_message, similar_chunks)
        
        # Save AI response
        referenced_docs = list(set([chunk['document_id'] for chunk in similar_chunks]))
        ai_msg = models.ChatMessage(
            session_id=session_id,
            role="assistant",
            content=ai_response,
            referenced_documents=json.dumps(referenced_docs) if referenced_docs else None
        )
        db.add(ai_msg)
        
        # Update session timestamp
        session.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user_msg)
        db.refresh(ai_msg)
        db.refresh(session)
        
        return {
            "user_message": {
                "id": user_msg.id,
                "role": "user",
                "content": user_msg.content,
                "created_at": user_msg.created_at.isoformat()
            },
            "ai_response": {
                "id": ai_msg.id,
                "role": "assistant", 
                "content": ai_msg.content,
                "referenced_documents": referenced_docs,
                "created_at": ai_msg.created_at.isoformat()
            },
            "context_used": len(similar_chunks),
            "session_title": session.title  # Include updated title in response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending chat message: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/sessions/{session_id}/messages")
async def get_chat_messages(
    session_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        # Verify session belongs to user
        session = db.query(models.ChatSession).filter(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        messages = db.query(models.ChatMessage).filter(
            models.ChatMessage.session_id == session_id
        ).order_by(models.ChatMessage.created_at.asc()).all()
        
        return [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "referenced_documents": json.loads(msg.referenced_documents) if msg.referenced_documents else [],
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting chat messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))    

print("🚀 FastAPI app initialized with routes:")
for route in app.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        print(f"  {route.methods} {route.path}")
