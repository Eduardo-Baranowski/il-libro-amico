# Componentes de UI — Lumina Library Frontend

Documentação alinhada a `doc/03-specs.md` (v1.2).

## Estados de dados (`app/components/ui/`)

### `QueryStatus`

Orquestra renderização condicional para queries React Query.

| Prop | Tipo | Descrição |
|------|------|-----------|
| `isLoading` | boolean | Exibe `LoadingState` |
| `isError` | boolean | Exibe `ErrorState` |
| `error` | Error / ApiError | Mensagem de erro |
| `isEmpty` | boolean | Exibe `EmptyState` |
| `onRetry` | () => void | Passado ao `ErrorState` |
| `children` | ReactNode | Conteúdo em sucesso |

### `LoadingState`

- `variant="block"` — spinner centralizado (padrão)
- `variant="inline"` — spinner em linha (scroll infinito)
- `variant="skeleton-grid"` — placeholders de cards (`/explorar`)

### `ErrorState`

`role="alert"`, botão opcional “Tentar novamente”.

### `EmptyState`

`role="status"`, título, descrição, CTA via `actionTo` (Link) ou `onAction` (button).

## Domínio

### `RecommendedBookCard`

Card de livro para recomendações. Props: `book`, `layout: 'grid' | 'carousel'`.

### `ExploreBooks`

Carrossel na home; oculta-se em erro ou lista vazia; loading inline.

## Estilos globais

Tokens e utilitários em `src/index.css`: `.sr-only`, `.skip-link`, `.ui-loading`, `.ui-error`, `.ui-empty`, `.ui-skeleton-*`.
