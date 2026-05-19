"""Substitui livros fictícios do banco por catálogo real."""

from __future__ import annotations

import re
from decimal import Decimal

from sqlalchemy import or_

from .. import db
from ..models.compra import Compra
from ..models.leitura import Leitura
from ..models.livro import Livro
from ..models.pedido import ItemPedido
from ..models.request import Request
from ..models.user import User
from .catalog import REAL_BOOKS

_FAKE_AUTHOR = re.compile(r"^Autor (Fictício|Especialista) \d+$", re.I)
_FAKE_TITLE = re.compile(
    r"^(Romance|Mistério|Fantasia|Aventura|História|História|Ciência|Tecnologia|"
    r"Filosofia|Psicologia|Literatura|Matemática|Biologia|Oceanografia|Economia|"
    r"Arquitetura|Informática|Física|Química|Sociologia|Teatro|Religião) \d+:",
    re.I,
)


def is_fake_livro(livro: Livro) -> bool:
    autor = (livro.autor or "").strip()
    titulo = (livro.titulo or "").strip()
    if _FAKE_AUTHOR.match(autor):
        return True
    if _FAKE_TITLE.match(titulo):
        return True
    if autor.startswith("Autor Especialista") and "Abordagem" in titulo:
        return True
    return False


def _fake_livro_query():
    return Livro.query.filter(
        or_(
            Livro.autor.op("~*")(r"^Autor (Fictício|Especialista) \d+$"),
            Livro.titulo.op("~*")(
                r"^(Romance|Mistério|Fantasia|Aventura|História|Ciência|Tecnologia|"
                r"Filosofia|Psicologia|Literatura|Matemática|Biologia|Oceanografia|"
                r"Economia|Arquitetura|Informática|Física|Química|Sociologia|Teatro|"
                r"Religião) \d+:"
            ),
            Livro.titulo.like("%Abordagem"),
        )
    )


def _cleanup_dependents(fake_ids: list[int]) -> None:
    if not fake_ids:
        return
    ItemPedido.query.filter(ItemPedido.livro_id.in_(fake_ids)).delete(synchronize_session=False)
    Compra.query.filter(Compra.livro_id.in_(fake_ids)).delete(synchronize_session=False)
    Leitura.query.filter(Leitura.livro_id.in_(fake_ids)).delete(synchronize_session=False)
    Request.query.filter(Request.livro_id.in_(fake_ids)).update(
        {Request.livro_id: None}, synchronize_session=False
    )
    Livro.query.filter(Livro.id.in_(fake_ids)).delete(synchronize_session=False)


def _existing_real_keys() -> set[tuple[str, str]]:
    keys: set[tuple[str, str]] = set()
    for livro in Livro.query.all():
        if not is_fake_livro(livro):
            keys.add((livro.titulo.strip().lower(), livro.autor.strip().lower()))
    return keys


def _pick_editors() -> list[User]:
    editors = User.query.filter_by(papel="editor").order_by(User.id).all()
    if not editors:
        raise RuntimeError("Nenhuma editora cadastrada. Crie ao menos um usuário com papel 'editor'.")
    return editors


def _insert_books(editors: list[User]) -> int:
    existing = _existing_real_keys()
    created = 0
    for idx, (titulo, autor, genero, preco, estoque, descricao) in enumerate(REAL_BOOKS):
        key = (titulo.lower(), autor.lower())
        if key in existing:
            continue
        editor = editors[idx % len(editors)]
        livro = Livro(
            editor_id=editor.id,
            titulo=titulo,
            autor=autor,
            genero=genero,
            preco=Decimal(preco),
            estoque=estoque,
            descricao=descricao,
        )
        db.session.add(livro)
        existing.add(key)
        created += 1
    return created


def _normalize_existing_real() -> int:
    """Atualiza livros reais já existentes com gênero/descrição do catálogo."""
    updated = 0
    catalog = {(t.lower(), a.lower()): (g, p, e, d) for t, a, g, p, e, d in REAL_BOOKS}
    for livro in Livro.query.all():
        if is_fake_livro(livro):
            continue
        data = catalog.get((livro.titulo.strip().lower(), livro.autor.strip().lower()))
        if not data:
            continue
        genero, preco, estoque, descricao = data
        changed = False
        if not livro.genero:
            livro.genero = genero
            changed = True
        if not livro.descricao:
            livro.descricao = descricao
            changed = True
        if livro.estoque is None or livro.estoque == 0:
            livro.estoque = estoque
            changed = True
        if changed:
            updated += 1
    return updated


def _recreate_sample_leituras() -> int:
    """Recria leituras de demonstração no feed com livros reais."""
    leitores = User.query.filter_by(papel="leitor").order_by(User.id).all()
    if not leitores:
        return 0

    livros = [l for l in Livro.query.order_by(Livro.id).all() if not is_fake_livro(l)]
    if not livros:
        return 0

    samples = [
        ("lido", 5, "Incrível como o autor aborda esses temas."),
        ("lendo", None, "Não esperava por essa reviravolta."),
        ("quero_ler", None, "Já quero ler o próximo volume."),
        ("lido", 4, "Muito interessante até agora!"),
        ("lido", 3, "Uma obra-prima absoluta."),
        ("quero_ler", None, None),
        ("lendo", None, "A escrita é envolvente, recomendo."),
        ("lido", 5, "Recomendo para todos!"),
    ]

    Leitura.query.delete()
    created = 0
    for leitor in leitores:
        for offset, (status, nota, comentario) in enumerate(samples):
            livro = livros[(leitor.id + offset) % len(livros)]
            db.session.add(
                Leitura(
                    leitor_id=leitor.id,
                    livro_id=livro.id,
                    status=status,
                    nota=nota,
                    comentario=comentario,
                )
            )
            created += 1
    return created


def reseed_livros(*, recreate_leituras: bool = True) -> dict:
    """
    Remove livros fictícios e garante catálogo apenas com obras reais.
    Retorna estatísticas da operação.
    """
    fake_rows = _fake_livro_query().all()
    fake_ids = [r.id for r in fake_rows]

    removed = len(fake_ids)
    _cleanup_dependents(fake_ids)

    editors = _pick_editors()
    normalized = _normalize_existing_real()
    inserted = _insert_books(editors)

    leituras_created = 0
    if recreate_leituras:
        leituras_created = _recreate_sample_leituras()

    db.session.commit()

    total_real = Livro.query.count()
    remaining_fake = sum(1 for l in Livro.query.all() if is_fake_livro(l))

    return {
        "removed_fake": removed,
        "inserted": inserted,
        "normalized": normalized,
        "leituras_recreated": leituras_created,
        "total_livros": total_real,
        "remaining_fake": remaining_fake,
    }
