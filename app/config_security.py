"""Carregamento seguro de chaves e segredos da aplicação."""

from __future__ import annotations

import os

_MIN_SECRET_LEN = 32

_INSECURE_VALUES = frozenset(
    {
        "dev-only-change-me-use-env",
        "super_secret_key",
        "jwt_secret_hash",
        "trocar-por-chave-longa-aleatoria",
        "outra-chave-longa-32-caracteres-minimo-recomendado",
    }
)


def _normalize(value: str | None) -> str:
    return (value or "").strip()


def _validate_secret(name: str, value: str) -> str:
    if not value or value in _INSECURE_VALUES:
        raise RuntimeError(
            f"{name} ausente ou insegura. Gere uma chave aleatória exclusiva "
            f"(mínimo {_MIN_SECRET_LEN} caracteres) no ambiente ou no arquivo .env."
        )
    if len(value) < _MIN_SECRET_LEN:
        raise RuntimeError(
            f"{name} muito curta (mínimo {_MIN_SECRET_LEN} caracteres aleatórios). "
            "Defina no ambiente ou no arquivo .env."
        )
    return value


def load_jwt_secret_key() -> str:
    """Exige JWT_SECRET_KEY segura; falha na inicialização se inválida."""
    return _validate_secret("JWT_SECRET_KEY", _normalize(os.environ.get("JWT_SECRET_KEY")))


def load_secret_key(jwt_secret_key: str) -> str:
    """SECRET_KEY explícita ou reutiliza JWT_SECRET_KEY já validada."""
    explicit = _normalize(os.environ.get("SECRET_KEY"))
    if explicit:
        return _validate_secret("SECRET_KEY", explicit)
    return jwt_secret_key
