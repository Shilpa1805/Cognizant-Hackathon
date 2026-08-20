"""
Router: /auth
Endpoints for user retrieval. Signup and Login are now handled entirely by Clerk.
"""

from fastapi import APIRouter, Depends
from app.models.user import User as UserModel
from app.schemas.auth import UserOut
from app.dependencies.auth import verify_clerk_token

router = APIRouter()

@router.get("/me", response_model=UserOut)
def get_current_user(user: UserModel = Depends(verify_clerk_token)) -> UserOut:
    """Returns the current authenticated user's profile from our DB."""
    return UserOut.model_validate(user)

