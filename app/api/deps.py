from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.user import User, UserRole
from app.security import decode_token, verify_token_type

security_scheme = HTTPBearer(auto_error=False)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_current_user_optional(
    session: SessionDep,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
) -> User | None:
    if creds is None or creds.scheme.lower() != "bearer":
        return None
    try:
        payload = decode_token(creds.credentials)
        verify_token_type(payload, "access")
        sub = payload.get("sub")
        if not sub:
            return None
        user_id = int(sub)
    except (JWTError, ValueError, TypeError):
        return None
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return user


async def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return checker


AdminUser = Annotated[User, Depends(require_roles(UserRole.admin))]
TeacherUser = Annotated[User, Depends(require_roles(UserRole.admin, UserRole.teacher))]
AccountantUser = Annotated[User, Depends(require_roles(UserRole.admin, UserRole.accountant))]
AdminOrTeacher = Annotated[User, Depends(require_roles(UserRole.admin, UserRole.teacher))]
StaffUser = Annotated[
    User, Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.accountant))
]
