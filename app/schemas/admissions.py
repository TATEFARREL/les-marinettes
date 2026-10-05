from pydantic import BaseModel, EmailStr, Field

from app.models.admissions import ApplicationStatus


class ApplicantCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=64)
    notes: str | None = None


class ApplicantRead(BaseModel):
    id: int
    full_name: str
    email: str | None
    phone: str | None
    notes: str | None

    model_config = {"from_attributes": True}


class ApplicationCreate(BaseModel):
    applicant_id: int
    school_year: str = "2026-2027"
    notes: str | None = None
    status: ApplicationStatus = ApplicationStatus.draft


class ApplicationUpdate(BaseModel):
    status: ApplicationStatus | None = None
    school_year: str | None = None
    notes: str | None = None


class ApplicationRead(BaseModel):
    id: int
    applicant_id: int
    status: ApplicationStatus
    school_year: str
    notes: str | None

    model_config = {"from_attributes": True}
