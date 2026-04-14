from __future__ import annotations

import base64
import json
from functools import lru_cache
from typing import Any, cast

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import get_settings


def _b64url_uint(val: int) -> str:
    raw = val.to_bytes((val.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


@lru_cache
def build_jwks_payload() -> dict[str, Any]:
    settings = get_settings()
    if settings.jwt_public_key_pem:
        public_pem = settings.jwt_public_key_pem
    elif settings.jwt_public_key_path:
        public_pem = open(settings.jwt_public_key_path, encoding="utf-8").read()
    else:
        raise RuntimeError("Missing JWT public key configuration")

    pub = serialization.load_pem_public_key(public_pem.encode("utf-8"))
    rsa_pub = cast(rsa.RSAPublicKey, pub)
    numbers = rsa_pub.public_numbers()
    jwk = {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": "default",
        "n": _b64url_uint(numbers.n),
        "e": _b64url_uint(numbers.e),
    }
    return {"keys": [jwk]}


def as_json() -> str:
    return json.dumps(build_jwks_payload())
