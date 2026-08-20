import jwt
import uuid
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Keep the JWKS public keys cached in memory so we don't spam the Clerk API
_clerk_jwks_cache = None

def get_clerk_jwks():
    global _clerk_jwks_cache
    if not _clerk_jwks_cache:
        try:
            headers = {"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"}
            resp = requests.get(settings.CLERK_JWKS_URL, headers=headers)
            resp.raise_for_status()
            _clerk_jwks_cache = resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch Clerk JWKS: {e}")
            raise HTTPException(status_code=500, detail="Authentication configuration error")
    return _clerk_jwks_cache


def verify_clerk_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Verifies the incoming Clerk JWT against Clerk's JWKS.
    If valid, maps the string Clerk user ID to a deterministic UUID and returns/creates the User in the DB.
    """
    # NOTE: During local dev without a real Clerk token, we'll allow the old dummy-auth fallback if it looks like a simple UUID
    if token == "dummy-token":
        return db.query(User).first()
        
    try:
        # First, grab the unverified header to get the 'kid' (key ID)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get('kid')
        if not kid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header: missing kid")
            
        jwks = get_clerk_jwks()
        
        # Find the matching key in the JWKS payload
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break
                
        if not rsa_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to find appropriate key in JWKS")
            
        # Verify the signature
        payload = jwt.decode(
            token,
            jwt.algorithms.RSAAlgorithm.from_jwk(rsa_key),
            algorithms=["RS256"],
            # In production, you would verify the audience (aud) and issuer (iss)
            options={"verify_aud": False, "verify_iss": False} 
        )
        
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token payload missing 'sub'")
            
        # -------------------------------------------------------------
        # THE MAGIC: Map Clerk string ID -> Deterministic UUID
        # -------------------------------------------------------------
        clerk_uuid_ns = uuid.UUID(settings.CLERK_UUID_NAMESPACE)
        user_uuid = uuid.uuid5(clerk_uuid_ns, clerk_user_id)
        
        # Auto-create user if they don't exist yet
        user = db.query(User).filter(User.user_id == user_uuid).first()
        if not user:
            # First time this Clerk user has hit our backend
            email = payload.get("email", f"{clerk_user_id}@clerk.placeholder")
            name = payload.get("name", "Candidate")
            
            user = User(
                user_id=user_uuid, 
                email=email, 
                name=name,
                password_hash="clerk_managed", # No longer store passwords locally
                role="candidate"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")
