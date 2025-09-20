import os
import io
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Database connection for Celery tasks
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/pdf_manager")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import models - this needs to be after database setup
try:
    from ..models import Document
    from ..celery_app import celery_app
except ImportError:
    # Fallback for development
    import sys
    sys.path.append('/app')
    from app.models import Document
    from app.celery_app import celery_app

@celery_app.task(bind=True)
def process_pdf_ocr(self, document_id: int):
    """Process PDF for OCR text extraction"""
    print(f"🔄 Starting OCR processing for document ID: {document_id}")
    
    db = SessionLocal()
    try:
        # Get document from database
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            print(f"❌ Document {document_id} not found")
            return {"error": "Document not found", "document_id": document_id}
        
        print(f"📄 Processing file: {document.original_filename}")
        
        # Update status to processing
        document.ocr_status = "processing"
        db.commit()
        
        # Extract text from PDF
        extracted_text = extract_text_from_pdf(document.file_path)
        
        if extracted_text and extracted_text.strip():
            # Update document with extracted text
            document.extracted_text = extracted_text
            document.ocr_status = "completed"
            document.processed_at = datetime.utcnow()
            db.commit()
            
            text_length = len(extracted_text)
            print(f"✅ OCR completed for document {document_id}. Text length: {text_length} characters")
            
            # Generate embeddings for AI search
            try:
                from ..services.ai_service import AIService
                ai_service = AIService()
                ai_service.create_document_embeddings(db, document_id, extracted_text)
                print(f"✅ Embeddings generated for document {document_id}")
            except Exception as e:
                print(f"⚠️ Failed to generate embeddings for document {document_id}: {e}")
                # Don't fail the OCR process if embeddings fail
            
            return {
                "document_id": document_id,
                "status": "completed",
                "text_length": text_length,
                "filename": document.original_filename
            }
        else:
            # No text extracted
            document.ocr_status = "failed"
            document.extracted_text = "No text could be extracted from this PDF."
            db.commit()
            
            print(f"⚠️ OCR completed but no text found for document {document_id}")
            
            return {
                "document_id": document_id,
                "status": "failed",
                "error": "No text extracted",
                "filename": document.original_filename
            }
    
    except Exception as e:
        print(f"❌ OCR processing failed for document {document_id}: {str(e)}")
        
        # Update status to failed
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if document:
                document.ocr_status = "failed"
                document.extracted_text = f"OCR processing failed: {str(e)}"
                db.commit()
        except Exception as db_error:
            print(f"❌ Failed to update document status: {db_error}")
        
        return {
            "document_id": document_id,
            "status": "failed",
            "error": str(e)
        }
    
    finally:
        db.close()

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF and OCR fallback"""
    print(f"🔍 Extracting text from: {file_path}")
    
    if not Path(file_path).exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    extracted_text = ""
    
    try:
        # Open PDF with PyMuPDF
        pdf_document = fitz.open(file_path)
        total_pages = pdf_document.page_count
        print(f"📖 PDF has {total_pages} pages")
        
        for page_num in range(total_pages):
            print(f"🔍 Processing page {page_num + 1}/{total_pages}")
            page = pdf_document.load_page(page_num)
            
            # Try to extract text directly (for text-based PDFs)
            page_text = page.get_text()
            
            if page_text and page_text.strip():
                extracted_text += f"\n\n--- Page {page_num + 1} ---\n{page_text}"
                print(f"✅ Extracted text directly from page {page_num + 1}")
            else:
                # If no text found, use OCR (for scanned PDFs)
                print(f"🔧 No direct text on page {page_num + 1}, using OCR...")
                try:
                    ocr_text = extract_text_with_ocr(page)
                    if ocr_text and ocr_text.strip():
                        extracted_text += f"\n\n--- Page {page_num + 1} (OCR) ---\n{ocr_text}"
                        print(f"✅ OCR successful on page {page_num + 1}")
                    else:
                        print(f"⚠️ No OCR text found on page {page_num + 1}")
                except Exception as ocr_error:
                    print(f"❌ OCR failed on page {page_num + 1}: {ocr_error}")
        
        pdf_document.close()
        
        # Clean up the text
        extracted_text = extracted_text.strip()
        if extracted_text:
            print(f"✅ Total extracted text length: {len(extracted_text)} characters")
        
    except Exception as e:
        print(f"❌ Error extracting text from PDF: {e}")
        raise
    
    return extracted_text

def extract_text_with_ocr(page) -> str:
    """Extract text from a PDF page using OCR"""
    try:
        # Render page to image with higher resolution for better OCR
        matrix = fitz.Matrix(2, 2)  # 2x scaling for better OCR accuracy
        pix = page.get_pixmap(matrix=matrix)
        img_data = pix.tobytes("png")
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(img_data))
        
        # Use Tesseract OCR with better configuration
        custom_config = r'--oem 3 --psm 6 -l eng'
        ocr_text = pytesseract.image_to_string(image, config=custom_config)
        
        return ocr_text.strip()
        
    except Exception as e:
        print(f"❌ OCR error: {e}")
        return ""

@celery_app.task
def test_ocr():
    """Test task to verify Celery is working"""
    print("🧪 Test OCR task executed successfully!")
    return {"status": "success", "message": "Celery is working!"}