from collections.abc import Iterator

import pytest
from app.login_throttle import login_throttle


@pytest.fixture(autouse=True)
def _reset_login_throttle() -> Iterator[None]:
    login_throttle.clear()
    yield
    login_throttle.clear()
