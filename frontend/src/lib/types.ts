import type { Role } from './token'

export type LoginResponse = { token_sessao: string; papel: Role }

export type User = { id: number; nome: string; email: string; papel: Role }

export type Report = {
  total_usuarios: number
  total_livros: number
  usuarios: Record<string, number>
  solicitacoes: Record<string, number>
}

export type ReaderRequest = {
  id: number
  editor_id: number
  conteudo: string
  resposta: string | null
  status: 'pendente' | 'respondida'
  data_criacao: string
}

export type EditorRequest = {
  id: number
  leitor_id: number
  conteudo: string
  resposta: string | null
  status: 'pendente' | 'respondida'
  data_criacao: string | null
}

export type BookPublic = {
  id: number
  titulo: string
  autor: string
  preco: string
  descricao: string | null
  imagem: string | null
  imagem_url?: string | null
  editora: string
}

export type BookEditor = {
  id: number
  titulo: string
  autor: string
  preco: string
  descricao: string | null
  imagem: string | null
  imagem_url?: string | null
  data_cadastro: string
}

export type FeedItem = {
  id: number
  leitor: { id: number; nome: string; imagem_url: string | null }
  livro: { id: number; titulo: string; autor: string; imagem_url: string | null }
  status: 'quero_ler' | 'lendo' | 'lido'
  nota: number | null
  comentario: string | null
  criado_em: string | null
}

export type MyReading = {
  id: number
  livro: {
    id: number
    titulo: string
    autor: string
    descricao: string | null
    imagem_url: string | null
    editora: string
  }
  status: 'quero_ler' | 'lendo' | 'lido'
  nota: number | null
  comentario: string | null
  criado_em: string | null
  atualizado_em: string | null
}
