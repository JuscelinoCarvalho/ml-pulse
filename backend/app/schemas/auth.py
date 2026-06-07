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


class MLExchangeSchema(BaseModel):
    code: str
    state: str | None = None
    code_verifier: str | None = None


class UserMe(BaseModel):
    id: int
    email: str
    is_verified: bool
    ml_connected: bool = False


class MLStatus(BaseModel):
    status: str  # "connected" | "expired" | "disconnected"
    nickname: str | None = None
    ml_user_id: str | None = None
    expires_at: str | None = None
    detail: str | None = None
