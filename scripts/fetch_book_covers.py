#!/usr/bin/env python3
"""Baixa capas dos livros reais via Open Library e atualiza o banco."""

import argparse
import os
import sys

from dotenv import load_dotenv

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

load_dotenv(os.path.join(ROOT, ".env"))

from app import create_app
from app.seed.covers import fetch_book_covers


def main() -> None:
    parser = argparse.ArgumentParser(description="Baixa capas de livros do Open Library.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Substitui capas já existentes.",
    )
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        stats = fetch_book_covers(force=args.force)
        print("Capas de livros:")
        for key in ("processed", "updated", "skipped", "not_found", "failed"):
            print(f"  {key}: {stats[key]}")
        missing = stats.get("missing_titles") or []
        if missing:
            print("\nSem capa encontrada:")
            for title in missing:
                print(f"  - {title}")


if __name__ == "__main__":
    main()
