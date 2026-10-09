from collections.abc import AsyncIterator, Iterator

import pytest
from app.database import get_session
from app.login_throttle import LoginThrottle, ThrottleRule, client_ip
from app.main import app
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate
from app.security import hash_password, verify_password
from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.requests import Request

client = TestClient(app)


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def make_throttle(clock: FakeClock, max_keys: int = 100) -> LoginThrottle:
    return LoginThrottle(
        {"email": ThrottleRule(max_attempts=3, window_seconds=60, lockout_seconds=300)},
        max_keys=max_keys,
        clock=clock,
    )


KEY = ("email", "a@example.com")


def test_locks_after_max_attempts_and_unlocks_after_lockout() -> None:
    clock = FakeClock()
    throttle = make_throttle(clock)
    for _ in range(2):
        throttle.record_attempt([KEY])
    assert throttle.retry_after([KEY]) == 0

    throttle.record_attempt([KEY])
    assert throttle.retry_after([KEY]) == 300

    clock.now += 299.5
    assert throttle.retry_after([KEY]) == 1
    clock.now += 0.5
    assert throttle.retry_after([KEY]) == 0


def test_attempts_outside_the_window_are_forgotten() -> None:
    clock = FakeClock()
    throttle = make_throttle(clock)
    throttle.record_attempt([KEY])
    throttle.record_attempt([KEY])
    clock.now += 60
    throttle.record_attempt([KEY])
    assert throttle.retry_after([KEY]) == 0


def test_forgive_and_reset() -> None:
    clock = FakeClock()
    throttle = make_throttle(clock)
    throttle.record_attempt([KEY])
    throttle.record_attempt([KEY])
    throttle.forgive(KEY)
    throttle.record_attempt([KEY])
    assert throttle.retry_after([KEY]) == 0

    throttle.record_attempt([KEY])
    assert throttle.retry_after([KEY]) == 300
    throttle.reset(KEY)
    assert throttle.retry_after([KEY]) == 0


def test_retry_after_reports_the_longest_lock() -> None:
    clock = FakeClock()
    throttle = make_throttle(clock)
    other = ("email", "b@example.com")
    for _ in range(3):
        throttle.record_attempt([KEY])
    clock.now += 100
    for _ in range(3):
        throttle.record_attempt([other])
    assert throttle.retry_after([KEY, other]) == 300


def test_eviction_keeps_active_locks() -> None:
    clock = FakeClock()
    throttle = make_throttle(clock, max_keys=2)
    for _ in range(3):
        throttle.record_attempt([KEY])
    clock.now += 61
    throttle.record_attempt([("email", "stale@example.com")])
    clock.now += 61
    throttle.record_attempt([("email", "new@example.com")])
    assert throttle.retry_after([KEY]) > 0


PASSWORD = "correct-horse-battery"
ADMIN_EMAIL = "admin@example.com"


class _FakeResult:
    def __init__(self, user: User | None) -> None:
        self._user = user

    def scalar_one_or_none(self) -> User | None:
        return self._user


class _FakeSession:
    def __init__(self, users: dict[str, User]) -> None:
        self._users = users

    async def execute(self, statement):
        email = statement.compile().params["email_1"]
        return _FakeResult(self._users.get(email))


@pytest.fixture
def fake_db() -> Iterator[None]:
    users = {
        ADMIN_EMAIL: User(
            id=1,
            email=ADMIN_EMAIL,
            hashed_password=hash_password(PASSWORD),
            role=UserRole.admin,
            is_active=True,
        )
    }

    async def override() -> AsyncIterator[_FakeSession]:
        yield _FakeSession(users)

    app.dependency_overrides[get_session] = override
    yield
    app.dependency_overrides.pop(get_session, None)


def _login(email: str, password: str = "wrong-password", ip: str = "203.0.113.7"):
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
        headers={"CF-Connecting-IP": ip},
    )


@pytest.mark.usefixtures("fake_db")
def test_account_is_locked_after_five_failures_even_with_the_right_password() -> None:
    for _ in range(5):
        assert _login(ADMIN_EMAIL).status_code == 401

    blocked = _login(ADMIN_EMAIL, PASSWORD, ip="198.51.100.1")
    assert blocked.status_code == 429
    assert blocked.json() == {"detail": "Too many login attempts"}
    assert 0 < int(blocked.headers["retry-after"]) <= 900

    assert _login("someone-else@example.com").status_code == 401


@pytest.mark.usefixtures("fake_db")
def test_successful_login_clears_the_account_counter() -> None:
    for _ in range(4):
        assert _login(ADMIN_EMAIL).status_code == 401
    assert _login(ADMIN_EMAIL, PASSWORD).status_code == 200

    for _ in range(4):
        assert _login(ADMIN_EMAIL).status_code == 401
    assert _login(ADMIN_EMAIL, PASSWORD).status_code == 200


@pytest.mark.usefixtures("fake_db")
def test_ip_is_locked_after_twenty_failures_across_accounts() -> None:
    for i in range(20):
        assert _login(f"user{i}@example.com").status_code == 401

    assert _login(ADMIN_EMAIL, PASSWORD).status_code == 429
    assert _login(ADMIN_EMAIL, PASSWORD, ip="198.51.100.1").status_code == 200


@pytest.mark.usefixtures("fake_db")
def test_oversized_password_is_a_normal_failure() -> None:
    response = _login(ADMIN_EMAIL, password="x" * 100)
    assert response.status_code == 401


def test_bcrypt_length_limit() -> None:
    assert not verify_password("x" * 100, hash_password("x" * 10))
    with pytest.raises(ValidationError):
        UserCreate(email="new@example.com", password="é" * 40)


def _request(headers: dict[str, str]) -> Request:
    return Request(
        {
            "type": "http",
            "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
            "client": ("10.0.0.1", 1234),
        }
    )


def test_client_ip_prefers_cloudflare_then_forwarded_then_socket() -> None:
    assert client_ip(_request({"CF-Connecting-IP": "203.0.113.9"})) == "203.0.113.9"
    assert client_ip(_request({"X-Forwarded-For": "203.0.113.5, 10.1.1.1"})) == "203.0.113.5"
    assert client_ip(_request({})) == "10.0.0.1"
