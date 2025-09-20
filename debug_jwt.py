#!/usr/bin/env python3
import sys
from jose import jwt
import json

def decode_jwt_without_verification(token):
    """Decode JWT without signature verification to see the payload"""
    try:
        # Decode without verification to see what's inside
        header = jwt.get_unverified_header(token)
        payload = jwt.get_unverified_claims(token)
        
        print("=== JWT DEBUG ===")
        print(f"Header: {json.dumps(header, indent=2)}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print("================")
        
        return payload
    except Exception as e:
        print(f"Error decoding JWT: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python debug_jwt.py <jwt_token>")
        sys.exit(1)
    
    token = sys.argv[1]
    decode_jwt_without_verification(token)