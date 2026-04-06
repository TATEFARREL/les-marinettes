from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AdminUser, SessionDep, StaffUser
from app.models.admissions import Applicant, Application, ApplicationStatus
from app.models.user import UserRole
from app.schemas.admissions import (
    ApplicantCreate,
    ApplicantRead,
    ApplicationCreate,
    ApplicationRead,
    ApplicationUpdate,
)

router = APIRouter(prefix="/admissions", tags=["admissions"])


@router.post("/applicants", response_model=ApplicantRead, status_code=status.HTTP_201_CREATED)
async def create_applicant(session: SessionDep, _: AdminUser, body: ApplicantCreate) -> Applicant:
    a = Applicant(
        full_name=body.full_name,
        email=str(body.email) if body.email else None,
        phone=body.phone,
        notes=body.notes,
    )
    session.add(a)
    await session.flush()
    await session.refresh(a)
    await session.commit()
    return a


@router.get("/applicants", response_model=list[ApplicantRead])
async def list_applicants(session: SessionDep, _: StaffUser) -> list[Applicant]:
    result = await session.execute(select(Applicant).order_by(Applicant.id.desc()))
    return list(result.scalars().all())


@router.post("/applications", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
async def create_application(
    session: SessionDep, _: AdminUser, body: ApplicationCreate
) -> Application:
    app_row = Application(
        applicant_id=body.applicant_id,
        status=body.status,
        school_year=body.school_year,
        notes=body.notes,
    )
    session.add(app_row)
    await session.flush()
    await session.refresh(app_row)
    await session.commit()
    return app_row


@router.get("/applications", response_model=list[ApplicationRead])
async def list_applications(
    session: SessionDep,
    user: StaffUser,
    status_filter: ApplicationStatus | None = Query(None, alias="status"),
) -> list[Application]:
    q = select(Application).order_by(Application.id.desc())
    if user.role == UserRole.accountant:
        q = q.where(Application.status == ApplicationStatus.enrolled)
    elif status_filter is not None:
        q = q.where(Application.status == status_filter)
    result = await session.execute(q)
    return list(result.scalars().all())


@router.patch("/applications/{application_id}", response_model=ApplicationRead)
async def update_application(
    session: SessionDep,
    _: AdminUser,
    application_id: int,
    body: ApplicationUpdate,
) -> Application:
    result = await session.execute(select(Application).where(Application.id == application_id))
    app_row = result.scalar_one_or_none()
    if app_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if body.status is not None:
        app_row.status = body.status
    if body.school_year is not None:
        app_row.school_year = body.school_year
    if body.notes is not None:
        app_row.notes = body.notes
    session.add(app_row)
    await session.commit()
    await session.refresh(app_row)
    return app_row
