from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from . import models, database
import os

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

print(f"Auth initialized with SECRET_KEY: {SECRET_KEY[:10]}... (showing first 10 chars)")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    
    print(f"Creating token with data: {data}")
    print(f"Token will expire at: {expire}")
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    print(f"Token created: {encoded_jwt[:50]}...")
    return encoded_jwt

def get_user(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user(db, email)
    if not user:
        print(f"User not found: {email}")
        return False
    if not verify_password(password, user.hashed_password):
        print(f"Password verification failed for: {email}")
        return False
    print(f"User authenticated successfully: {email}")
    return user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(database.get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Get the token from credentials.credentials (not credentials.token)
        token = credentials.credentials
        print(f"Received token: {token[:50]}...")
        
        # Decode the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Token payload: {payload}")
        
        email: str = payload.get("sub")
        if email is None:
            print("No email (sub) found in token payload")
            raise credentials_exception
            
        print(f"Token is valid for user: {email}")
        
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in token validation: {e}")
        raise credentials_exception
    
    # Get user from database
    user = get_user(db, email=email)
    if user is None:
        print(f"User not found in database: {email}")
        raise credentials_exception
        
    print(f"User found and authenticated: {user.email}")
    return user

def create_user(db: Session, email: str, username: str, password: str):
    hashed_password = get_password_hash(password)
    db_user = models.User(
        email=email,
        username=username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    print(f"User created: {email}")
    return db_user