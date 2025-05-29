import uuid
import random
from typing import List, Dict, Tuple, Optional, Any
import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer
from whisperprint.database import FingerprintDatabase

class WhisperPrintEngine:
    """
    The WhisperPrint engine for creating unique linguistic fingerprints in documents.
    """
    def __init__(self, model_name: str = "t5-base", db_path: Optional[str] = None):
        """
        Initialize the WhisperPrint engine with a T5 model.
        
        Args:
            model_name: The name of the T5 model to use for paraphrasing.
            db_path: Optional path to the database file.
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_name = model_name
        self.model = T5ForConditionalGeneration.from_pretrained(model_name).to(self.device)
        self.tokenizer = T5Tokenizer.from_pretrained(model_name)
        
        # Zero-width characters for embedding invisible fingerprints
        self.zero_width_chars = [
            '\u200B',  # Zero-width space
            '\u200C',  # Zero-width non-joiner
            '\u200D',  # Zero-width joiner
            '\u2060',  # Word joiner
            '\u2061',  # Function application
            '\u2062',  # Invisible times
            '\u2063',  # Invisible separator
            '\u2064'   # Invisible plus
        ]
        
        # Dictionary to store recipient UUIDs and their fingerprints (in-memory cache)
        self.recipient_registry = {}
        
        # Initialize database
        self.db = FingerprintDatabase(db_path) if db_path else FingerprintDatabase()
    
    def _generate_paraphrase(self, text: str, num_variants: int = 3) -> List[str]:
        """
        Generate paraphrased variants of the input text.
        
        Args:
            text: The text to paraphrase.
            num_variants: Number of variants to generate.
            
        Returns:
            List of paraphrased texts.
        """
        input_ids = self.tokenizer.encode(f"paraphrase: {text}", return_tensors="pt").to(self.device)
        
        # Generate multiple variants
        outputs = self.model.generate(
            input_ids,
            max_length=512,
            num_return_sequences=num_variants,
            num_beams=num_variants,
            temperature=0.8,
            do_sample=True,
            top_p=0.95,
            top_k=50
        )
        
        paraphrases = [self.tokenizer.decode(output, skip_special_tokens=True) for output in outputs]
        return paraphrases
    
    def _generate_zero_width_fingerprint(self, recipient_id: str) -> str:
        """
        Generate a zero-width character fingerprint from a recipient ID.
        
        Args:
            recipient_id: Unique identifier for the recipient.
            
        Returns:
            String of zero-width characters encoding the recipient ID.
        """
        # Check in-memory cache first
        if recipient_id not in self.recipient_registry:
            # Check database for existing fingerprints
            existing_fingerprints = self.db.get_fingerprints_by_recipient(recipient_id)
            if existing_fingerprints:
                # Use the UUID from the most recent fingerprint
                recipient_uuid = existing_fingerprints[0]['uuid']
            else:
                # Generate new UUID and store recipient in database
                recipient_uuid = str(uuid.uuid4())
                self.db.add_recipient(recipient_id)
                
            # Cache in memory
            self.recipient_registry[recipient_id] = recipient_uuid
        else:
            recipient_uuid = self.recipient_registry[recipient_id]
        
        # Use the UUID string to generate a sequence of zero-width characters
        binary_rep = ''.join(format(ord(c), '08b') for c in recipient_uuid)
        
        # Map binary digits to zero-width characters
        fingerprint = ""
        for i in range(0, len(binary_rep), 3):
            chunk = binary_rep[i:i+3]
            if len(chunk) < 3:
                chunk = chunk.ljust(3, '0')
            
            # Convert binary chunk to index
            idx = int(chunk, 2) % len(self.zero_width_chars)
            fingerprint += self.zero_width_chars[idx]
        
        return fingerprint
    
    def _insert_zero_width_fingerprint(self, text: str, fingerprint: str) -> str:
        """
        Insert the zero-width fingerprint into the text.
        
        Args:
            text: The text to fingerprint.
            fingerprint: The zero-width character fingerprint.
            
        Returns:
            Text with embedded fingerprint.
        """
        # Split text into paragraphs
        paragraphs = text.split('\n')
        
        # Insert parts of the fingerprint between paragraphs and within sentences
        fingerprint_chars = list(fingerprint)
        fingerprinted_text = []
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                fingerprinted_text.append(paragraph)
                continue
                
            # Add some fingerprint chars between sentences or words
            sentences = paragraph.replace('. ', '.\n').split('\n')
            fingerprinted_paragraph = []
            
            for sentence in sentences:
                if not sentence.strip():
                    continue
                    
                if fingerprint_chars:
                    char = fingerprint_chars.pop(0)
                    # Insert after the first word
                    words = sentence.split(' ')
                    if len(words) > 1:
                        words[0] = words[0] + char
                        sentence = ' '.join(words)
                
                fingerprinted_paragraph.append(sentence)
            
            # Join sentences back
            paragraph = '. '.join(fingerprinted_paragraph).replace('.. ', '. ')
            
            # Add some fingerprint at the end of paragraph if chars remain
            if fingerprint_chars:
                char = fingerprint_chars.pop(0)
                paragraph += char
                
            fingerprinted_text.append(paragraph)
        
        # If there are remaining fingerprint chars, append them to the end
        if fingerprint_chars:
            final_text = '\n'.join(fingerprinted_text)
            final_text += ''.join(fingerprint_chars)
        else:
            final_text = '\n'.join(fingerprinted_text)
            
        return final_text
    
    def create_fingerprinted_document(
        self, 
        text: str, 
        recipient_id: str, 
        document_metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, str]:
        """
        Create a unique fingerprinted version of the document for a specific recipient.
        
        Args:
            text: The original document text.
            recipient_id: Identifier for the recipient.
            document_metadata: Optional metadata about the document.
            
        Returns:
            Tuple of (fingerprinted_text, recipient_uuid)
        """
        # Generate paraphrased variants
        paraphrases = self._generate_paraphrase(text)
        
        # Select one variant (or use original if no good variants)
        selected_variant = paraphrases[0] if paraphrases else text
        
        # Generate and insert zero-width fingerprint
        fingerprint = self._generate_zero_width_fingerprint(recipient_id)
        fingerprinted_text = self._insert_zero_width_fingerprint(selected_variant, fingerprint)
        
        # Store fingerprint in database
        recipient_uuid = self.recipient_registry[recipient_id]
        success, _ = self.db.store_fingerprint(
            recipient_id=recipient_id,
            fingerprint=fingerprint,
            recipient_uuid=recipient_uuid,
            document_text=text,
            document_metadata=document_metadata
        )
        
        if not success:
            print(f"Warning: Failed to store fingerprint for recipient {recipient_id} in database")
        
        return fingerprinted_text, recipient_uuid
    
    def identify_leaked_document(self, leaked_text: str) -> Optional[str]:
        """
        Identify the recipient from a leaked document.
        
        Args:
            leaked_text: The text from the leaked document.
            
        Returns:
            The recipient ID if identified, None otherwise.
        """
        # Extract zero-width characters
        extracted_chars = ''.join(c for c in leaked_text if c in self.zero_width_chars)
        
        if not extracted_chars:
            return None
        
        # First try database lookup
        recipient_info = self.db.get_recipient_by_fingerprint(extracted_chars)
        if recipient_info:
            return recipient_info['recipient_id']
            
        # Fall back to in-memory cache if database lookup fails
        for recipient_id, recipient_uuid in self.recipient_registry.items():
            fingerprint = self._generate_zero_width_fingerprint(recipient_id)
            
            # Simple matching for now - in a real implementation, this would be more sophisticated
            if fingerprint in extracted_chars:
                return recipient_id
                
        return None
    
    def get_all_recipients(self) -> List[Dict[str, Any]]:
        """
        Get all recipients in the system.
        
        Returns:
            List of recipient information.
        """
        return self.db.get_all_recipients()
    
    def get_audit_logs(self, limit: int = 100, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get audit logs from the system.
        
        Args:
            limit: Maximum number of logs to return.
            event_type: Optional filter for event type.
            
        Returns:
            List of audit log entries.
        """
        return self.db.get_audit_logs(limit, event_type) 