"""Busca de metadados de livros via Open Library."""

from __future__ import annotations

import os
import uuid
from typing import Any

import requests

OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json"
OPEN_LIBRARY_COVER = "https://covers.openlibrary.org/b/id/{cover_id}-{size}.jpg"

APP_GENRES = (
    "Romance",
    "Mistério",
    "Ficção Científica",
    "Fantasia",
    "Terror",
    "História",
    "Biografia",
    "Autoajuda",
    "Técnico",
    "Infantil",
)

# palavras-chave (inglês/português) nos subjects da Open Library → gênero do app
_SUBJECT_GENRE_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Mistério", ("mystery", "detective", "crime", "thriller", "suspense")),
    ("Ficção Científica", ("science fiction", "sci-fi", "ficção científica")),
    ("Fantasia", ("fantasy", "fantasia", "magic", "dragons")),
    ("Terror", ("horror", "terror", "ghost", "vampire")),
    ("História", ("history", "historical", "história", "world war")),
    ("Biografia", ("biography", "autobiography", "memoir")),
    ("Autoajuda", ("self-help", "self help", "personal growth", "motivation")),
    ("Técnico", ("computers", "programming", "software", "algorithms", "engineering")),
    ("Infantil", ("juvenile", "children", "infantil", "young adult")),
    ("Romance", ("romance", "love stories", "fiction, romance")),
)


def cover_url(cover_id: int | None, size: str = "M") -> str | None:
    if not cover_id:
        return None
    return OPEN_LIBRARY_COVER.format(cover_id=int(cover_id), size=size)


def map_genre(subjects: list[str] | None) -> str | None:
    if not subjects:
        return None
    haystack = " ".join(subjects).lower()
    for genre, keywords in _SUBJECT_GENRE_RULES:
        if any(kw in haystack for kw in keywords):
            return genre
    return None


def _first_sentence(doc: dict[str, Any]) -> str | None:
    raw = doc.get("first_sentence")
    if isinstance(raw, list) and raw:
        return str(raw[0]).strip()
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return None


def _normalize_doc(doc: dict[str, Any]) -> dict[str, Any] | None:
    title = (doc.get("title") or "").strip()
    if not title:
        return None

    authors = doc.get("author_name") or []
    autor = ", ".join(str(a) for a in authors if a).strip() or "Autor desconhecido"

    cover_id = doc.get("cover_i")
    subjects = doc.get("subject") or []
    if isinstance(subjects, str):
        subjects = [subjects]

    isbn_list = doc.get("isbn") or []
    isbn = str(isbn_list[0]) if isbn_list else None

    return {
        "titulo": title,
        "autor": autor,
        "descricao": _first_sentence(doc),
        "genero": map_genre(subjects),
        "ano": doc.get("first_publish_year"),
        "isbn": isbn,
        "cover_id": int(cover_id) if cover_id else None,
        "imagem_url": cover_url(int(cover_id)) if cover_id else None,
        "fonte": "open_library",
        "open_library_key": doc.get("key"),
    }


def search_books(query: str, *, limit: int = 8) -> list[dict[str, Any]]:
    """Busca obras na Open Library por título, autor ou ISBN."""
    q = (query or "").strip()
    if len(q) < 2:
        return []

    limit = max(1, min(limit, 15))
    response = requests.get(
        OPEN_LIBRARY_SEARCH,
        params={"q": q, "limit": limit, "fields": "key,title,author_name,first_publish_year,cover_i,subject,isbn,first_sentence"},
        timeout=15,
    )
    response.raise_for_status()

    results: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for doc in response.json().get("docs", []):
        item = _normalize_doc(doc)
        if not item:
            continue
        key = (item["titulo"].lower(), item["autor"].lower())
        if key in seen:
            continue
        seen.add(key)
        results.append(item)
    return results


def download_cover_to_uploads(cover_id: int, upload_folder: str) -> str | None:
    """Baixa capa da Open Library para uploads/books e retorna caminho relativo."""
    url = cover_url(cover_id, size="L")
    if not url:
        return None

    response = requests.get(url, timeout=30)
    if response.status_code != 200 or len(response.content) < 500:
        return None

    books_dir = os.path.join(upload_folder, "books")
    os.makedirs(books_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    path = os.path.join(books_dir, filename)
    with open(path, "wb") as handle:
        handle.write(response.content)
    return os.path.join("books", filename)
