import { createBrowserRouter, Navigate } from 'react-router-dom'

import { Layout } from './ui/Layout'
import { RequireAuth } from './ui/RequireAuth'

import { HomePage } from '../pages/public/HomePage'
import { StorePage } from '../pages/public/StorePage'
import { BookDetailsPage } from '../pages/public/BookDetailsPage'
import { PublicProfilePage } from '../pages/public/PublicProfilePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'

import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { AdminReportsPage } from '../pages/admin/AdminReportsPage'

import { ReaderRequestsPage } from '../pages/reader/ReaderRequestsPage'
import { ReaderNewRequestPage } from '../pages/reader/ReaderNewRequestPage'
import { ReaderMyReadingsPage } from '../pages/reader/ReaderMyReadingsPage'
import { ReaderNewReadingPage } from '../pages/reader/ReaderNewReadingPage'

import { EditorRequestsPage } from '../pages/editor/EditorRequestsPage'
import { EditorBooksPage } from '../pages/editor/EditorBooksPage'
import { SettingsPage } from '../pages/shared/SettingsPage'
import { ChatPage } from '../pages/shared/ChatPage'
import { CartPage } from '../pages/shared/CartPage'
import { CheckoutPage } from '../pages/shared/CheckoutPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/livros', element: <StorePage /> },
      { path: '/livro/:bookId', element: <BookDetailsPage /> },
      { path: '/perfil/:userId', element: <PublicProfilePage /> },
      { path: '/editora/:userId', element: <PublicProfilePage /> },
      { path: '/entrar', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterPage /> },

      {
        path: '/admin/usuarios',
        element: (
          <RequireAuth role="admin">
            <AdminUsersPage />
          </RequireAuth>
        ),
      },
      {
        path: '/admin/relatorios',
        element: (
          <RequireAuth role="admin">
            <AdminReportsPage />
          </RequireAuth>
        ),
      },

      {
        path: '/leitor/solicitacoes',
        element: (
          <RequireAuth role="leitor">
            <ReaderRequestsPage />
          </RequireAuth>
        ),
      },
      {
        path: '/leitor/leituras',
        element: (
          <RequireAuth role="leitor">
            <ReaderMyReadingsPage />
          </RequireAuth>
        ),
      },
      {
        path: '/leitor/nova-leitura',
        element: (
          <RequireAuth role="leitor">
            <ReaderNewReadingPage />
          </RequireAuth>
        ),
      },
      {
        path: '/leitor/nova-solicitacao',
        element: (
          <RequireAuth role="leitor">
            <ReaderNewRequestPage />
          </RequireAuth>
        ),
      },

      {
        path: '/editor/solicitacoes',
        element: (
          <RequireAuth role="editor">
            <EditorRequestsPage />
          </RequireAuth>
        ),
      },
      {
        path: '/editor/livros',
        element: (
          <RequireAuth role="editor">
            <EditorBooksPage />
          </RequireAuth>
        ),
      },

      {
        path: '/configuracoes',
        element: (
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        ),
      },
      {
        path: '/mensagens',
        element: (
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        ),
      },
      {
        path: '/mensagens/:userId',
        element: (
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        ),
      },
      {
        path: '/carrinho',
        element: (
          <RequireAuth>
            <CartPage />
          </RequireAuth>
        ),
      },
      {
        path: '/checkout',
        element: (
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
