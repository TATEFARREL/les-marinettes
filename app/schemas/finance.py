from datetime import date, datetime

from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    application_id: int | None = None
    full_name: str = Field(min_length=1, max_length=255)
    external_ref: str | None = Field(None, max_length=64)


class StudentRead(BaseModel):
    id: int
    application_id: int | None
    full_name: str
    external_ref: str | None

    model_config = {"from_attributes": True}


class FeeScheduleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    amount_cents: int
    currency: str = "XAF"
    school_year: str
    active: bool = True


class FeeScheduleRead(BaseModel):
    id: int
    name: str
    amount_cents: int
    currency: str
    school_year: str
    active: bool

    model_config = {"from_attributes": True}


class InvoiceLineCreate(BaseModel):
    description: str = Field(max_length=512)
    amount_cents: int


class InvoiceCreate(BaseModel):
    student_id: int
    due_date: date | None = None
    notes: str | None = None
    lines: list[InvoiceLineCreate] = Field(default_factory=list)


class InvoiceRead(BaseModel):
    id: int
    student_id: int
    status: str
    due_date: date | None
    total_cents: int
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    invoice_id: int | None = None
    student_id: int | None = None
    amount_cents: int
    method: str = "cash"
    reference: str | None = Field(None, max_length=128)


class PaymentRead(BaseModel):
    id: int
    invoice_id: int | None
    student_id: int | None
    amount_cents: int
    method: str
    reference: str | None
    paid_at: datetime

    model_config = {"from_attributes": True}
