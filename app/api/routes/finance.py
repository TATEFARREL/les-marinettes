import csv
import io
from datetime import UTC, datetime

from fastapi import APIRouter, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import AccountantUser, AdminUser, SessionDep
from app.models.finance import FeeSchedule, Invoice, InvoiceLine, Payment, Student

router = APIRouter(prefix="/finance", tags=["finance"])


@router.post("/fee-schedules", status_code=status.HTTP_201_CREATED)
async def create_fee_schedule(session: SessionDep, _: AdminUser, body: dict) -> dict:
    from app.schemas.finance import FeeScheduleCreate

    data = FeeScheduleCreate.model_validate(body)
    row = FeeSchedule(
        name=data.name,
        amount_cents=data.amount_cents,
        currency=data.currency,
        school_year=data.school_year,
        active=data.active,
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    await session.commit()
    return {
        "id": row.id,
        "name": row.name,
        "amount_cents": row.amount_cents,
        "currency": row.currency,
        "school_year": row.school_year,
        "active": row.active,
    }


@router.get("/fee-schedules")
async def list_fee_schedules(session: SessionDep, _: AccountantUser) -> list[dict]:
    result = await session.execute(select(FeeSchedule).order_by(FeeSchedule.id.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "amount_cents": r.amount_cents,
            "currency": r.currency,
            "school_year": r.school_year,
            "active": r.active,
        }
        for r in rows
    ]


@router.post("/students", status_code=status.HTTP_201_CREATED)
async def create_student(session: SessionDep, _: AdminUser, body: dict) -> dict:
    from app.schemas.finance import StudentCreate

    data = StudentCreate.model_validate(body)
    row = Student(
        application_id=data.application_id,
        full_name=data.full_name,
        external_ref=data.external_ref,
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    await session.commit()
    return {
        "id": row.id,
        "application_id": row.application_id,
        "full_name": row.full_name,
        "external_ref": row.external_ref,
    }


@router.get("/students")
async def list_students(session: SessionDep, _: AccountantUser) -> list[dict]:
    result = await session.execute(select(Student).order_by(Student.id.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "application_id": r.application_id,
            "full_name": r.full_name,
            "external_ref": r.external_ref,
        }
        for r in rows
    ]


@router.post("/invoices", status_code=status.HTTP_201_CREATED)
async def create_invoice(session: SessionDep, _: AccountantUser, body: dict) -> dict:
    from app.schemas.finance import InvoiceCreate

    data = InvoiceCreate.model_validate(body)
    total = sum(line.amount_cents for line in data.lines)
    inv = Invoice(
        student_id=data.student_id,
        status="open",
        due_date=data.due_date,
        total_cents=total,
        notes=data.notes,
    )
    session.add(inv)
    await session.flush()
    for line in data.lines:
        session.add(
            InvoiceLine(
                invoice_id=inv.id,
                description=line.description,
                amount_cents=line.amount_cents,
            )
        )
    await session.commit()
    await session.refresh(inv)
    return {
        "id": inv.id,
        "student_id": inv.student_id,
        "status": inv.status,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "total_cents": inv.total_cents,
        "notes": inv.notes,
    }


@router.get("/invoices")
async def list_invoices(session: SessionDep, _: AccountantUser) -> list[dict]:
    result = await session.execute(
        select(Invoice).options(selectinload(Invoice.lines)).order_by(Invoice.id.desc())
    )
    rows = result.scalars().unique().all()
    out = []
    for inv in rows:
        out.append(
            {
                "id": inv.id,
                "student_id": inv.student_id,
                "status": inv.status,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "total_cents": inv.total_cents,
                "notes": inv.notes,
                "lines": [
                    {"description": ln.description, "amount_cents": ln.amount_cents}
                    for ln in inv.lines
                ],
            }
        )
    return out


@router.post("/payments", status_code=status.HTTP_201_CREATED)
async def create_payment(session: SessionDep, _: AccountantUser, body: dict) -> dict:
    from app.schemas.finance import PaymentCreate

    data = PaymentCreate.model_validate(body)
    pay = Payment(
        invoice_id=data.invoice_id,
        student_id=data.student_id,
        amount_cents=data.amount_cents,
        method=data.method,
        reference=data.reference,
        paid_at=datetime.now(UTC),
    )
    session.add(pay)
    await session.flush()
    await session.refresh(pay)
    await session.commit()
    return {
        "id": pay.id,
        "invoice_id": pay.invoice_id,
        "student_id": pay.student_id,
        "amount_cents": pay.amount_cents,
        "method": pay.method,
        "reference": pay.reference,
        "paid_at": pay.paid_at.isoformat(),
    }


@router.get("/payments/export")
async def export_payments_csv(session: SessionDep, _: AccountantUser) -> Response:
    result = await session.execute(select(Payment).order_by(Payment.id.desc()))
    rows = result.scalars().all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "invoice_id", "student_id", "amount_cents", "method", "reference", "paid_at"])
    for p in rows:
        w.writerow(
            [
                p.id,
                p.invoice_id or "",
                p.student_id or "",
                p.amount_cents,
                p.method,
                p.reference or "",
                p.paid_at.isoformat() if p.paid_at else "",
            ]
        )
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="payments.csv"'},
    )
