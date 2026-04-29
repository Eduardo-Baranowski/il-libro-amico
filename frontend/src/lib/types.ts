export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pages: number
}

import type { Role } from './token'

export type LoginResponse = { 
  token_sessao: string; 
  papel: Role;
  nome: string;
  imagem_url: string | null;
}

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
  editor_nome?: string | null
  livro_id: number | null
  livro_titulo?: string | null
  livro_autor?: string | null
  livro_imagem_url?: string | null
  conteudo: string
  resposta: string | null
  status: 'pendente' | 'respondida'
  data_criacao: string
}

export type EditorRequest = {
  id: number
  leitor_id: number
  livro_id: number | null
  livro_titulo?: string | null
  livro_autor?: string | null
  conteudo: string
  resposta: string | null
  status: 'pendente' | 'respondida'
  data_criacao: string | null
}

export type BookPublic = {
  id: number
  editor_id: number
  titulo: string
  autor: string
  preco: string
  estoque: number
  status_estoque: 'disponivel' | 'baixo' | 'esgotado'
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
  estoque: number
  descricao: string | null
  imagem: string | null
  imagem_url?: string | null
  data_cadastro: string
}

export type Purchase = {
  id: number
  quantidade: number
  total: string
  status: string
  data_compra: string | null
  livro: {
    id: number
    titulo: string
    autor: string
    imagem_url: string | null
    editora: string
  }
}
export type OrderItem = {
  titulo: string
  quantidade: number
  preco_unitario: string
  imagem_url: string | null
}

export type Order = {
  id: number
  data: string
  status: string
  total: string
  itens: OrderItem[]
}

export type SearchResponse = {
  books: BookPublic[]
  users: Array<{
    id: number
    nome: string
    papel: Role
    imagem_url: string | null
  }>
  editors: Array<{
    id: number
    nome: string
    imagem_url: string | null
  }>
}

export type PublicUser = {
  id: number
  nome: string
  papel: Role
  imagem_url: string | null
}

export type VisitProfile = {
  user: PublicUser & { headline: string; bio: string }
  stats: {
    publications: number
    citations: number
    tenure: string
    contributions: number
    followers: number
    following: number
    friends: number
  }
  featured: Array<{
    id: number
    titulo: string
    autor: string
    imagem_url: string | null
    descricao: string | null
    data: string | null
    tipo: string
  }>
  reading_log: Array<{
    id: number
    livro_id: number
    titulo: string
    autor: string
    status: string
    nota: number | null
    imagem_url: string | null
    criado_em: string | null
  }>
  specializations: string[]
  affiliations: Array<{ nome: string; cargo: string }>
}

export type RelationStatus = {
  following: boolean
  is_friend: boolean
  outgoing_pending: boolean
  incoming_pending: boolean
}

export type DirectMessage = {
  id: number
  sender_id: number
  receiver_id: number
  conteudo: string
  lida: boolean
  data_envio: string | null
}

export type NotificationsResponse = {
  friend_requests: Array<{
    id: number
    requester_id: number
    requester_nome: string
    requester_imagem_url: string | null
    criado_em: string | null
  }>
  unread_messages: Array<{
    sender_id: number
    sender_nome: string
    sender_imagem_url: string | null
    count: number
    latest_conteudo: string
    latest_data_envio: string | null
  }>
  counts: {
    friend_requests: number
    unread_message_threads: number
    unread_messages_total: number
  }
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
