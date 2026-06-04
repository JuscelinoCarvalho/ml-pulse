from pydantic import BaseModel, EmailStr


class RequestOTPSchema(BaseModel):
    email: EmailStr


class VerifyOTPSchema(BaseModel):
    email: EmailStr
    code: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenSchema(BaseModel):
    refresh_token: str


class UserMe(BaseModel):
    id: int
    email: str
    is_verified: bool
    ml_connected: bool = False
