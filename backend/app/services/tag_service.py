import re
import random
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from ..models import Tag, Document, User
import logging

logger = logging.getLogger(__name__)

class TagService:
    """Service for managing document tags and auto-tagging based on OCR content"""
    
    # Predefined colors for automatic assignment
    TAG_COLORS = [
        "#EF4444",  # Red
        "#F59E0B",  # Amber
        "#10B981",  # Emerald
        "#3B82F6",  # Blue
        "#8B5CF6",  # Violet
        "#EC4899",  # Pink
        "#14B8A6",  # Teal
        "#F97316",  # Orange
        "#84CC16",  # Lime
        "#6366F1",  # Indigo
        "#06B6D4",  # Cyan
        "#8B5A2B",  # Brown
        "#6B7280",  # Gray
        "#DC2626",  # Red-600
        "#D97706",  # Amber-600
        "#059669",  # Emerald-600
        "#2563EB",  # Blue-600
        "#7C3AED",  # Violet-600
        "#DB2777",  # Pink-600
        "#0D9488",  # Teal-600
    ]
    
    # Default tags with their French translations and auto-tagging keywords
    DEFAULT_TAGS = [
        {
            "name": "Invoice",
            "name_fr": "Facture",
            "color": "#10B981",  # Green
            "keywords": ["invoice", "facture", "factura", "bill", "billing", "payment", "amount due", "total", "tax", "vat", "tva"]
        },
        {
            "name": "User Guide",
            "name_fr": "Guide utilisateur",
            "color": "#3B82F6",  # Blue
            "keywords": ["user guide", "guide utilisateur", "manual", "manuel", "instructions", "how to", "tutorial", "guide", "documentation"]
        },
        {
            "name": "Administrative",
            "name_fr": "Administratif",
            "color": "#8B5CF6",  # Purple
            "keywords": ["administrative", "administratif", "admin", "policy", "politique", "procedure", "procédure", "regulation", "règlement", "official", "officiel"]
        },
        {
            "name": "Architect",
            "name_fr": "Architecte",
            "color": "#F59E0B",  # Amber
            "keywords": ["architect", "architecte", "blueprint", "plan", "design", "construction", "building", "bâtiment", "structure", "drawing", "dessin"]
        },
        {
            "name": "Receipt",
            "name_fr": "Reçu",
            "color": "#EF4444",  # Red
            "keywords": ["receipt", "reçu", "recu", "ticket", "purchase", "achat", "transaction", "payment received", "paiement reçu"]
        }
    ]
    
    def __init__(self):
        pass
    
    def create_default_tags(self, db: Session) -> List[Tag]:
        """Create default system tags if they don't exist"""
        created_tags = []
        
        for tag_data in self.DEFAULT_TAGS:
            # Check if tag already exists
            existing_tag = db.query(Tag).filter(
                Tag.name == tag_data["name"],
                Tag.is_default == True
            ).first()
            
            if not existing_tag:
                tag = Tag(
                    name=tag_data["name"],
                    name_fr=tag_data["name_fr"],
                    color=tag_data["color"],
                    is_default=True,
                    user_id=None  # System tags have no user_id
                )
                db.add(tag)
                created_tags.append(tag)
                logger.info(f"Created default tag: {tag_data['name']}")
        
        if created_tags:
            db.commit()
            for tag in created_tags:
                db.refresh(tag)
        
        return created_tags
    
    def get_all_tags(self, db: Session, user_id: int) -> List[Tag]:
        """Get all available tags for a user (default + user's custom tags)"""
        return db.query(Tag).filter(
            (Tag.is_default == True) | (Tag.user_id == user_id)
        ).order_by(Tag.is_default.desc(), Tag.name).all()
    
    def _get_random_color(self, db: Session, user_id: int) -> str:
        """Get a random color that's not already heavily used by the user"""
        # Get existing colors used by the user
        existing_colors = db.query(Tag.color).filter(
            (Tag.is_default == True) | (Tag.user_id == user_id)
        ).all()
        existing_colors = [color[0] for color in existing_colors if color[0]]
        
        # Count color usage
        color_counts = {}
        for color in existing_colors:
            color_counts[color] = color_counts.get(color, 0) + 1
        
        # Find colors that are used less frequently
        available_colors = []
        min_usage = min(color_counts.values()) if color_counts else 0
        
        for color in self.TAG_COLORS:
            usage = color_counts.get(color, 0)
            if usage <= min_usage:
                available_colors.append(color)
        
        # If all colors are used equally, use all colors
        if not available_colors:
            available_colors = self.TAG_COLORS
        
        return random.choice(available_colors)

    def create_custom_tag(self, db: Session, user_id: int, name: str, name_fr: Optional[str] = None, color: Optional[str] = None) -> Tag:
        """Create a custom tag for a user"""
        # Check if tag name already exists for this user
        existing_tag = db.query(Tag).filter(
            Tag.name.ilike(name),
            ((Tag.is_default == True) | (Tag.user_id == user_id))
        ).first()
        
        if existing_tag:
            return existing_tag  # Return existing tag instead of raising error
        
        # Auto-assign color if not provided
        if not color:
            color = self._get_random_color(db, user_id)
        
        tag = Tag(
            name=name.strip(),
            name_fr=name_fr.strip() if name_fr else None,
            color=color,
            is_default=False,
            user_id=user_id
        )
        
        db.add(tag)
        db.commit()
        db.refresh(tag)
        
        logger.info(f"Created custom tag '{name}' for user {user_id} with color {color}")
        return tag

    def get_or_create_tag(self, db: Session, user_id: int, name: str, name_fr: Optional[str] = None) -> Tag:
        """Get existing tag or create new one if it doesn't exist"""
        # Check if tag already exists (case-insensitive)
        existing_tag = db.query(Tag).filter(
            Tag.name.ilike(name.strip()),
            ((Tag.is_default == True) | (Tag.user_id == user_id))
        ).first()
        
        if existing_tag:
            return existing_tag
        
        # Create new tag with auto-assigned color
        return self.create_custom_tag(db, user_id, name, name_fr)
    
    def auto_tag_document(self, db: Session, document: Document) -> List[Tag]:
        """Automatically tag a document based on its OCR content"""
        if not document.extracted_text:
            return []
        
        text_lower = document.extracted_text.lower()
        suggested_tags = []
        
        # Get all default tags
        default_tags = db.query(Tag).filter(Tag.is_default == True).all()
        
        for tag in default_tags:
            # Find the corresponding tag data with keywords
            tag_data = next((t for t in self.DEFAULT_TAGS if t["name"] == tag.name), None)
            if not tag_data:
                continue
            
            # Check if any keywords match the document text
            keywords_found = []
            for keyword in tag_data["keywords"]:
                # Use word boundaries to avoid partial matches
                pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
                if re.search(pattern, text_lower):
                    keywords_found.append(keyword)
            
            if keywords_found:
                suggested_tags.append(tag)
                logger.info(f"Auto-tagged document {document.id} with '{tag.name}' based on keywords: {keywords_found}")
        
        return suggested_tags
    
    def apply_tags_to_document(self, db: Session, document: Document, tag_ids: List[int]) -> None:
        """Apply tags to a document"""
        # Clear existing tags
        document.tags.clear()
        
        # Add new tags
        if tag_ids:
            tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
            document.tags.extend(tags)
        
        db.commit()
        logger.info(f"Applied {len(tag_ids)} tags to document {document.id}")
    
    def get_document_tags(self, db: Session, document_id: int) -> List[Tag]:
        """Get all tags for a specific document"""
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return []
        
        return document.tags
    
    def search_documents_by_tags(self, db: Session, user_id: int, tag_ids: List[int]) -> List[Document]:
        """Search documents that have any of the specified tags"""
        if not tag_ids:
            return []
        
        return db.query(Document).join(Document.tags).filter(
            Document.owner_id == user_id,
            Tag.id.in_(tag_ids)
        ).distinct().all()
    
    def get_tag_statistics(self, db: Session, user_id: int) -> Dict:
        """Get statistics about tag usage for a user"""
        from sqlalchemy import func
        
        # Get tag usage counts
        tag_stats = db.query(
            Tag.id,
            Tag.name,
            Tag.name_fr,
            Tag.color,
            Tag.is_default,
            func.count(Document.id).label('document_count')
        ).outerjoin(Document.tags).filter(
            (Tag.is_default == True) | (Tag.user_id == user_id)
        ).filter(
            (Document.owner_id == user_id) | (Document.id == None)
        ).group_by(Tag.id, Tag.name, Tag.name_fr, Tag.color, Tag.is_default).all()
        
        return [
            {
                "id": stat.id,
                "name": stat.name,
                "name_fr": stat.name_fr,
                "color": stat.color,
                "is_default": stat.is_default,
                "document_count": stat.document_count
            }
            for stat in tag_stats
        ]
    
    def delete_custom_tag(self, db: Session, user_id: int, tag_id: int) -> bool:
        """Delete a custom tag (only if it belongs to the user and is not default)"""
        tag = db.query(Tag).filter(
            Tag.id == tag_id,
            Tag.user_id == user_id,
            Tag.is_default == False
        ).first()
        
        if not tag:
            return False
        
        db.delete(tag)
        db.commit()
        logger.info(f"Deleted custom tag '{tag.name}' for user {user_id}")
        return True
