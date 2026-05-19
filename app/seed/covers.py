"""Baixa capas de livros via Open Library e atualiza registros no banco."""

from __future__ import annotations

import os
import time
import unicodedata
import uuid
from typing import Iterator

import requests
from flask import current_app

from .. import db
from ..models.livro import Livro
from .livros import is_fake_livro

OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json"
OPEN_LIBRARY_COVER = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"

# (titulo, autor) em minúsculas -> buscas alternativas (query, autor opcional)
COVER_SEARCH_ALIASES: dict[tuple[str, str], list[tuple[str, str | None]]] = {
    ("grande sertão: veredas", "joão guimarães rosa"): [
        ("grande sertao veredas", "Guimarães Rosa"),
    ],
    ("o senhor dos anéis: a sociedade do anel", "j.r.r. tolkien"): [
        ("The Fellowship of the Ring", "Tolkien"),
    ],
    (
        "as crônicas de nárnia: o leão, a feiticeira e o guarda-roupa",
        "c.s. lewis",
    ): [
        ("The Lion the Witch and the Wardrobe", "C.S. Lewis"),
    ],
    ("introdução aos algoritmos", "thomas h. cormen et al."): [
        ("Introduction to Algorithms", "Cormen"),
    ],
    ("harry potter e a pedra filosofal", "j.k. rowling"): [
        ("Harry Potter and the Philosopher's Stone", "J.K. Rowling"),
    ],
    (
        "brasil: uma biografia",
        "lilia moritz schwarcz e heloisa m. starling",
    ): [
        ("Brasil uma biografia", "Lilia Schwarcz"),
    ],
    ("o homem duplicado", "josé saramago"): [
        ("The Double", "José Saramago"),
    ],
    ("longa caminhada até a liberdade", "nelson mandela"): [
        ("Long Walk to Freedom", "Nelson Mandela"),
    ],
    ("a menina que roubava livros", "markus zusak"): [
        ("The Book Thief", "Markus Zusak"),
    ],
    ("it, a coisa", "stephen king"): [
        ("It", "Stephen King"),
    ],
    ("o caso da estranha múmia", "arthur conan doyle"): [
        ("The Adventure of the Speckled Band", "Arthur Conan Doyle"),
    ],
    ("o chamado de cthulhu e outros contos", "h.p. lovecraft"): [
        ("The Call of Cthulhu", "H.P. Lovecraft"),
    ],
    ("o xangô de baker street", "jô soares"): [
        ("O Xango de Baker Street", "Jô Soares"),
    ],
    ("o pequeno príncipe", "antoine de saint-exupéry"): [
        ("The Little Prince", "Saint-Exupery"),
    ],
    ("matilda", "roald dahl"): [
        ("Matilda", "Roald Dahl"),
    ],
    ("o menino maluquinho", "ziraldo"): [
        ("Menino Maluquinho", "Ziraldo"),
    ],
    ("cem anos de solidão", "gabriel garcía márquez"): [
        ("One Hundred Years of Solitude", "Gabriel Garcia Marquez"),
    ],
    ("1984", "george orwell"): [
        ("Nineteen Eighty-Four", "George Orwell"),
    ],
    ("orgulho e preconceito", "jane austen"): [
        ("Pride and Prejudice", "Jane Austen"),
    ],
}


def _normalize_key(titulo: str, autor: str) -> tuple[str, str]:
    return titulo.strip().lower(), autor.strip().lower()


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(c for c in normalized if unicodedata.category(c) != "Mn")


def _short_author(autor: str) -> str:
    autor = autor.split(" e ")[0].split(" et al")[0].strip()
    return autor


def _search_strategies(titulo: str, autor: str) -> Iterator[tuple[str, str | None]]:
    autor_short = _short_author(autor)
    last_name = autor_short.split()[-1] if autor_short else None

    yield titulo, autor_short

    key = _normalize_key(titulo, autor)
    for query, author in COVER_SEARCH_ALIASES.get(key, []):
        yield query, author

    if ":" in titulo:
        yield titulo.split(":")[0].strip(), autor_short

    yield _strip_accents(titulo), _strip_accents(autor_short)

    if last_name:
        yield titulo, last_name
        yield f"{titulo} {last_name}", None

    yield titulo, None
    yield _strip_accents(titulo), None


def _find_cover_id(title: str, author: str | None) -> int | None:
    params: dict = {"limit": 8}
    if author:
        params["title"] = title
        params["author"] = author
    else:
        params["q"] = title

    response = requests.get(OPEN_LIBRARY_SEARCH, params=params, timeout=20)
    response.raise_for_status()
    for doc in response.json().get("docs", []):
        cover_id = doc.get("cover_i")
        if cover_id:
            return int(cover_id)
    return None


def find_cover_id_for_book(titulo: str, autor: str) -> int | None:
    seen: set[tuple[str, str | None]] = set()
    for query, author in _search_strategies(titulo, autor):
        key = (query.lower(), (author or "").lower() or None)
        if key in seen:
            continue
        seen.add(key)
        cover_id = _find_cover_id(query, author)
        if cover_id:
            return cover_id
        time.sleep(0.1)
    return None


def _download_cover(cover_id: int) -> bytes | None:
    url = OPEN_LIBRARY_COVER.format(cover_id=cover_id)
    response = requests.get(url, timeout=30)
    if response.status_code != 200:
        return None
    content_type = response.headers.get("Content-Type", "")
    if "image" not in content_type and len(response.content) < 500:
        return None
    if len(response.content) < 500:
        return None
    return response.content


def _save_cover_bytes(data: bytes) -> str:
    upload_root = current_app.config["UPLOAD_FOLDER"]
    books_dir = os.path.join(upload_root, "books")
    os.makedirs(books_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.jpg"
    path = os.path.join(books_dir, filename)
    with open(path, "wb") as handle:
        handle.write(data)
    return os.path.join("books", filename)


def _remove_old_image(rel_path: str | None) -> None:
    if not rel_path:
        return
    full_path = os.path.join(current_app.config["UPLOAD_FOLDER"], rel_path)
    if os.path.isfile(full_path):
        os.remove(full_path)


def fetch_book_covers(*, force: bool = False, delay: float = 0.15) -> dict:
    """
    Baixa capas do Open Library para livros reais sem imagem (ou todos com force=True).
    """
    stats = {
        "processed": 0,
        "updated": 0,
        "skipped": 0,
        "not_found": 0,
        "failed": 0,
    }
    missing: list[str] = []

    livros = [
        livro
        for livro in Livro.query.order_by(Livro.id).all()
        if not is_fake_livro(livro)
    ]

    for livro in livros:
        stats["processed"] += 1
        if livro.imagem and not force:
            stats["skipped"] += 1
            continue

        try:
            cover_id = find_cover_id_for_book(livro.titulo, livro.autor)
            if not cover_id:
                stats["not_found"] += 1
                missing.append(f"{livro.titulo} — {livro.autor}")
                continue

            data = _download_cover(cover_id)
            if not data:
                stats["failed"] += 1
                continue

            rel_path = _save_cover_bytes(data)
            if livro.imagem:
                _remove_old_image(livro.imagem)
            livro.imagem = rel_path
            stats["updated"] += 1
            db.session.commit()
        except Exception:
            db.session.rollback()
            stats["failed"] += 1
        finally:
            time.sleep(delay)

    stats["missing_titles"] = missing
    return stats
