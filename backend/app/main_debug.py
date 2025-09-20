from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import timedelta
from typing import List, Optional
import traceback

from . import models, database, auth

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="PDF Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API
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

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    ocr_status: str
    title: Optional[str] = None

# Debug middleware
@app.middleware("http")
async def debug_requests(request, call_next):
    print(f"Request: {request.method} {request.url}")
    print(f"Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response

# Routes
@app.get("/")
async def root():
    return {"message": "PDF Manager API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(database.get_db)):
    try:
        # Check if user already exists
        db_user = auth.get_user(db, email=user.email)
        if db_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        created_user = auth.create_user(db, user.email, user.username, user.password)
        return UserResponse(
            id=created_user.id,
            email=created_user.email,
            username=created_user.username,
            is_active=created_user.is_active
        )
    except Exception as e:
        print(f"Register error: {e}")
        print(traceback.format_exc())
        raise

@app.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(database.get_db)):
    try:
        user = auth.authenticate_user(db, user_credentials.email, user_credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Login error: {e}")
        print(traceback.format_exc())
        raise

@app.get("/me", response_model=UserResponse)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    try:
        print(f"Current user: {current_user.email}")
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            is_active=current_user.is_active
        )
    except Exception as e:
        print(f"Me endpoint error: {e}")
        print(traceback.format_exc())
        raise

@app.get("/documents", response_model=List[DocumentResponse])
async def get_documents(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    documents = db.query(models.Document).filter(
        models.Document.owner_id == current_user.id
    ).all()
    return documents

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    return {
        "message": "File upload endpoint ready", 
        "filename": file.filename,
        "user": current_user.username
    }