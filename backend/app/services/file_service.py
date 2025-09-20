import os
import uuid
import hashlib
from pathlib import Path
from typing import Optional
import shutil
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from .. import models

class FileService:
    def __init__(self, upload_dir: str = "/app/uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        print(f"File service initialized with upload directory: {self.upload_dir}")
    
    def generate_unique_filename(self, original_filename: str) -> str:
        """Generate a unique filename to avoid conflicts"""
        # Get file extension
        file_extension = Path(original_filename).suffix.lower()
        
        # Generate unique identifier
        unique_id = str(uuid.uuid4())
        
        # Create filename with timestamp and unique ID
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{unique_id}{file_extension}"
        
        return filename
    
    def calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of file for duplicate detection"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    async def save_upload_file(self, upload_file: UploadFile) -> tuple[str, int, str]:
        """
        Save uploaded file to disk
        Returns: (file_path, file_size, file_hash)
        """
        # Generate unique filename
        unique_filename = self.generate_unique_filename(upload_file.filename)
        file_path = self.upload_dir / unique_filename
        
        # Save file to disk
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)
            
            # Get file size
            file_size = file_path.stat().st_size
            
            # Calculate file hash
            file_hash = self.calculate_file_hash(file_path)
            
            print(f"File saved: {file_path} (size: {file_size} bytes)")
            
            return str(file_path), file_size, file_hash
            
        except Exception as e:
            # Clean up if there was an error
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    def validate_pdf_file(self, upload_file: UploadFile) -> bool:
        """Validate that the uploaded file is a PDF"""
        # Check file extension
        if not upload_file.filename.lower().endswith('.pdf'):
            return False
        
        # Check MIME type
        if upload_file.content_type not in ['application/pdf', 'application/x-pdf']:
            return False
        
        return True
    
    def check_file_size(self, upload_file: UploadFile, max_size_mb: int = 50) -> bool:
        """Check if file size is within limits"""
        # Note: This might not work for all upload scenarios
        # as content_length might not always be available
        if hasattr(upload_file, 'size') and upload_file.size:
            max_size_bytes = max_size_mb * 1024 * 1024
            return upload_file.size <= max_size_bytes
        return True  # Allow if we can't determine size
    
    async def create_document_record(
        self,
        db: Session,
        user_id: int,
        upload_file: UploadFile,
        file_path: str,
        file_size: int,
        file_hash: str
    ) -> models.Document:
        """Create a document record in the database"""
        
        # Check for duplicate files by hash
        existing_doc = db.query(models.Document).filter(
            models.Document.owner_id == user_id,
            models.Document.file_hash == file_hash
        ).first()
        
        if existing_doc:
            # Remove the newly uploaded file since it's a duplicate
            Path(file_path).unlink(missing_ok=True)
            raise HTTPException(
                status_code=400, 
                detail=f"File already exists: {existing_doc.original_filename}"
            )
        
        # Create document record
        document = models.Document(
            filename=Path(file_path).name,
            original_filename=upload_file.filename,
            file_path=file_path,
            file_size=file_size,
            file_hash=file_hash,
            mime_type=upload_file.content_type or "application/pdf",
            ocr_status="pending",
            owner_id=user_id
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        print(f"Document record created: ID {document.id}, File: {document.original_filename}")
        
        return document
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file from disk"""
        try:
            Path(file_path).unlink(missing_ok=True)
            return True
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
            return False
    
    def get_file_info(self, file_path: str) -> dict:
        """Get information about a file"""
        path = Path(file_path)
        if not path.exists():
            return {"exists": False}
        
        stat = path.stat()
        return {
            "exists": True,
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime),
            "created": datetime.fromtimestamp(stat.st_ctime)
        }