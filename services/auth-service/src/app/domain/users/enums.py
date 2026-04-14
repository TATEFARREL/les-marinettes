from __future__ import annotations

import enum


class Role(enum.StrEnum):
    admin = "admin"
    teacher = "teacher"
    accountant = "accountant"
