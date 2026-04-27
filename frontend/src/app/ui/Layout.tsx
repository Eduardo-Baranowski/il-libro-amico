import { Outlet, Link } from 'react-router-dom'

import { useAuth } from '../AuthProvider'

export function Layout() {
  const { auth, logout } = useAuth()

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="nav">
            <Link className="pill" to="/">
              Livros
            </Link>
            {!auth.token ? (
              <>
                <Link className="pill" to="/entrar">
                  Entrar
                </Link>
                <Link className="pill" to="/cadastro">
                  Cadastro (leitor)
                </Link>
              </>
            ) : null}
            {auth.role === 'admin' ? (
              <>
                <Link className="pill" to="/admin/usuarios">
                  Usuários
                </Link>
                <Link className="pill" to="/admin/relatorios">
                  Relatórios
                </Link>
              </>
            ) : null}
            {auth.role === 'leitor' ? (
              <>
                <Link className="pill" to="/leitor/solicitacoes">
                  Minhas solicitações
                </Link>
                <Link className="pill" to="/leitor/leituras">
                  Minhas leituras
                </Link>
                <Link className="pill" to="/leitor/nova-leitura">
                  Registrar leitura
                </Link>
                <Link className="pill" to="/leitor/nova-solicitacao">
                  Nova solicitação
                </Link>
              </>
            ) : null}
            {auth.role === 'editor' ? (
              <>
                <Link className="pill" to="/editor/solicitacoes">
                  Solicitações
                </Link>
                <Link className="pill" to="/editor/livros">
                  Livros
                </Link>
              </>
            ) : null}
          </div>

          <div className="nav">
            {auth.role ? <span className="pill">Perfil: {auth.role}</span> : null}
            {auth.token ? (
              <button className="btn secondary" onClick={logout} type="button">
                Sair
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
