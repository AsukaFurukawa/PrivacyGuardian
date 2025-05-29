import os
import json
import sqlite3
import uuid
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import hashlib

class FingerprintDatabase:
    """
    Database for storing document fingerprints and recipient information.
    This is a simple SQLite implementation for the hackathon.
    In a production environment, this would be replaced with a more robust database solution.
    """
    
    def __init__(self, db_path: str = "whisperprint.db"):
        """
        Initialize the fingerprint database.
        
        Args:
            db_path: Path to the SQLite database file.
        """
        self.db_path = db_path
        self._initialize_database()
    
    def _initialize_database(self) -> None:
        """Initialize the database schema if it doesn't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create recipients table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS recipients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient_id TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT
        )
        ''')
        
        # Create fingerprints table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS fingerprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient_id TEXT NOT NULL,
            uuid TEXT UNIQUE NOT NULL,
            fingerprint TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            document_hash TEXT,
            document_metadata TEXT,
            FOREIGN KEY (recipient_id) REFERENCES recipients (recipient_id)
        )
        ''')
        
        # Create documents table for tracking documents
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_hash TEXT UNIQUE NOT NULL,
            original_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT
        )
        ''')
        
        # Create audit log table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            event_data TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_recipient(self, recipient_id: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Add a new recipient to the database.
        
        Args:
            recipient_id: Unique identifier for the recipient.
            metadata: Optional metadata about the recipient.
            
        Returns:
            True if successful, False otherwise.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            metadata_json = json.dumps(metadata) if metadata else None
            
            cursor.execute(
                "INSERT OR IGNORE INTO recipients (recipient_id, metadata) VALUES (?, ?)",
                (recipient_id, metadata_json)
            )
            
            success = cursor.rowcount > 0
            conn.commit()
            
            # Log the event
            if success:
                self._log_event("recipient_added", {"recipient_id": recipient_id})
                
            return success
        except Exception as e:
            print(f"Error adding recipient: {e}")
            return False
        finally:
            conn.close()
    
    def store_fingerprint(
        self,
        recipient_id: str,
        fingerprint: str,
        recipient_uuid: Optional[str] = None,
        document_text: Optional[str] = None,
        document_metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, str]:
        """
        Store a document fingerprint for a recipient.
        
        Args:
            recipient_id: The ID of the recipient.
            fingerprint: The fingerprint to store.
            recipient_uuid: Optional UUID for the recipient. If not provided, one will be generated.
            document_text: Optional original document text.
            document_metadata: Optional metadata about the document.
            
        Returns:
            Tuple of (success, uuid).
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Ensure recipient exists
            self.add_recipient(recipient_id)
            
            # Generate UUID if not provided
            if not recipient_uuid:
                recipient_uuid = str(uuid.uuid4())
            
            # Generate document hash if text is provided
            document_hash = None
            if document_text:
                document_hash = hashlib.sha256(document_text.encode()).hexdigest()
                
                # Store original document
                metadata_json = json.dumps(document_metadata) if document_metadata else None
                cursor.execute(
                    "INSERT OR IGNORE INTO documents (document_hash, original_text, metadata) VALUES (?, ?, ?)",
                    (document_hash, document_text, metadata_json)
                )
            
            # Store fingerprint
            metadata_json = json.dumps(document_metadata) if document_metadata else None
            cursor.execute(
                "INSERT INTO fingerprints (recipient_id, uuid, fingerprint, document_hash, document_metadata) VALUES (?, ?, ?, ?, ?)",
                (recipient_id, recipient_uuid, fingerprint, document_hash, metadata_json)
            )
            
            conn.commit()
            
            # Log the event
            self._log_event("fingerprint_stored", {
                "recipient_id": recipient_id,
                "uuid": recipient_uuid,
                "document_hash": document_hash
            })
            
            return True, recipient_uuid
        except Exception as e:
            print(f"Error storing fingerprint: {e}")
            return False, ""
        finally:
            conn.close()
    
    def get_recipient_by_fingerprint(self, fingerprint: str) -> Optional[Dict[str, Any]]:
        """
        Find a recipient by their document fingerprint.
        
        Args:
            fingerprint: The fingerprint to look up.
            
        Returns:
            Recipient information if found, None otherwise.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Query for the fingerprint
            cursor.execute(
                """
                SELECT f.recipient_id, f.uuid, f.created_at, f.document_metadata, r.metadata as recipient_metadata
                FROM fingerprints f
                JOIN recipients r ON f.recipient_id = r.recipient_id
                WHERE f.fingerprint LIKE ?
                """,
                (f"%{fingerprint}%",)
            )
            
            row = cursor.fetchone()
            if not row:
                return None
                
            result = dict(row)
            
            # Parse JSON fields
            if result.get('document_metadata'):
                result['document_metadata'] = json.loads(result['document_metadata'])
            if result.get('recipient_metadata'):
                result['recipient_metadata'] = json.loads(result['recipient_metadata'])
                
            # Log the event
            self._log_event("fingerprint_identified", {
                "recipient_id": result['recipient_id'],
                "uuid": result['uuid']
            })
            
            return result
        except Exception as e:
            print(f"Error finding recipient by fingerprint: {e}")
            return None
        finally:
            conn.close()
    
    def get_all_recipients(self) -> List[Dict[str, Any]]:
        """
        Get all recipients in the database.
        
        Returns:
            List of recipient information.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM recipients")
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                result = dict(row)
                if result.get('metadata'):
                    result['metadata'] = json.loads(result['metadata'])
                results.append(result)
                
            return results
        except Exception as e:
            print(f"Error getting recipients: {e}")
            return []
        finally:
            conn.close()
    
    def get_fingerprints_by_recipient(self, recipient_id: str) -> List[Dict[str, Any]]:
        """
        Get all fingerprints for a specific recipient.
        
        Args:
            recipient_id: The ID of the recipient.
            
        Returns:
            List of fingerprint information.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT * FROM fingerprints WHERE recipient_id = ?",
                (recipient_id,)
            )
            
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                result = dict(row)
                if result.get('document_metadata'):
                    result['document_metadata'] = json.loads(result['document_metadata'])
                results.append(result)
                
            return results
        except Exception as e:
            print(f"Error getting fingerprints: {e}")
            return []
        finally:
            conn.close()
    
    def _log_event(self, event_type: str, event_data: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """
        Log an event to the audit log.
        
        Args:
            event_type: Type of event (e.g., 'fingerprint_stored', 'recipient_added').
            event_data: Data associated with the event.
            user_id: Optional ID of the user who performed the action.
            
        Returns:
            True if successful, False otherwise.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            event_data_json = json.dumps(event_data)
            
            cursor.execute(
                "INSERT INTO audit_log (event_type, event_data, user_id) VALUES (?, ?, ?)",
                (event_type, event_data_json, user_id)
            )
            
            conn.commit()
            return True
        except Exception as e:
            print(f"Error logging event: {e}")
            return False
        finally:
            conn.close()
    
    def get_audit_logs(self, limit: int = 100, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get recent audit logs.
        
        Args:
            limit: Maximum number of logs to return.
            event_type: Optional filter for event type.
            
        Returns:
            List of audit log entries.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = "SELECT * FROM audit_log"
            params = []
            
            if event_type:
                query += " WHERE event_type = ?"
                params.append(event_type)
                
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                result = dict(row)
                if result.get('event_data'):
                    result['event_data'] = json.loads(result['event_data'])
                results.append(result)
                
            return results
        except Exception as e:
            print(f"Error getting audit logs: {e}")
            return []
        finally:
            conn.close() 