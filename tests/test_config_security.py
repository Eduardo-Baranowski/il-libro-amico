import os

import pytest

from app.config_security import load_jwt_secret_key


def test_load_jwt_secret_key_rejects_missing(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        load_jwt_secret_key()


def test_load_jwt_secret_key_rejects_insecure_default(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "dev-only-change-me-use-env")
    with pytest.raises(RuntimeError, match="insegura"):
        load_jwt_secret_key()


def test_load_jwt_secret_key_accepts_strong_key(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "a" * 32)
    assert load_jwt_secret_key() == "a" * 32
