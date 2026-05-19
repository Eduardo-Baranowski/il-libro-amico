#!/usr/bin/env python3
"""Remove livros fictícios e popula o catálogo com obras reais."""

import os
import sys

from dotenv import load_dotenv

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

load_dotenv(os.path.join(ROOT, ".env"))

from app import create_app
from app.seed.livros import reseed_livros


def main() -> None:
    app = create_app()
    with app.app_context():
        stats = reseed_livros(recreate_leituras=True)
        print("Seed de livros concluído:")
        for key, value in stats.items():
            print(f"  {key}: {value}")
        if stats["remaining_fake"] > 0:
            print("Aviso: ainda existem livros fictícios no banco.")
            sys.exit(1)


if __name__ == "__main__":
    main()
