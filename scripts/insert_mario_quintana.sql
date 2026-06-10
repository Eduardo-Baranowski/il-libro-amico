-- Script SQL para inserir obras e frases de Mário Quintana no banco de dados

-- 1. Inserir livros de Mário Quintana associados a uma editora (papel='editor')
-- Usamos COALESCE para pegar a primeira editora ou o ID 1 caso nenhuma exista.
INSERT INTO livro (editor_id, titulo, autor, preco, estoque, genero, condicao, descricao, imagem, data_cadastro)
VALUES (
    COALESCE((SELECT id FROM user WHERE papel = 'editor' LIMIT 1), 1),
    'A Rua dos Cataventos',
    'Mário Quintana',
    29.90,
    15,
    'Poesia',
    'novo',
    'Eles passarão... Eu passarinho! Primeiro livro de sonetos de Mário Quintana, publicado em 1940.',
    NULL,
    datetime('now')
);

INSERT INTO livro (editor_id, titulo, autor, preco, estoque, genero, condicao, descricao, imagem, data_cadastro)
VALUES (
    COALESCE((SELECT id FROM user WHERE papel = 'editor' LIMIT 1), 1),
    'Caderno de Hinos',
    'Mário Quintana',
    24.90,
    20,
    'Poesia',
    'novo',
    'Se as coisas são inatingíveis... ora! Não é motivo para não querê-las... Que tristes seriam os caminhos se não fora a presença distante das estrelas.',
    NULL,
    datetime('now')
);

INSERT INTO livro (editor_id, titulo, autor, preco, estoque, genero, condicao, descricao, imagem, data_cadastro)
VALUES (
    COALESCE((SELECT id FROM user WHERE papel = 'editor' LIMIT 1), 1),
    'Apontamentos de História Sem Importância',
    'Mário Quintana',
    34.90,
    10,
    'Poesia',
    'novo',
    'O tempo é um ponto de vista. Velho é quem é um dia mais velho que a gente. Pensamentos sobre o tempo, a infância e o cotidiano.',
    NULL,
    datetime('now')
);

-- 2. Inserir leituras associadas ao primeiro leitor (papel='leitor') com frases célebres nos comentários
INSERT INTO leitura (leitor_id, livro_id, status, nota, comentario, criado_em, atualizado_em)
VALUES (
    COALESCE((SELECT id FROM user WHERE papel = 'leitor' LIMIT 1), 2),
    (SELECT id FROM livro WHERE autor = 'Mário Quintana' AND titulo = 'A Rua dos Cataventos' LIMIT 1),
    'lido',
    5,
    'Eles passarão... Eu passarinho!',
    datetime('now'),
    datetime('now')
);

INSERT INTO leitura (leitor_id, livro_id, status, nota, comentario, criado_em, atualizado_em)
VALUES (
    COALESCE((SELECT id FROM user WHERE papel = 'leitor' LIMIT 1), 2),
    (SELECT id FROM livro WHERE autor = 'Mário Quintana' AND titulo = 'Caderno de Hinos' LIMIT 1),
    'lido',
    5,
    'Se as coisas são inatingíveis... ora! Não é motivo para não querê-las... Que tristes seriam os caminhos se não fora a presença distante das estrelas.',
    datetime('now'),
    datetime('now')
);

INSERT INTO leitura (leitor_id, livro_id, status, nota, comentario, criado_em, atualizado_em)
VALUES (
    COALESCE((SELECT id FROM user WHERE papel = 'leitor' LIMIT 1), 2),
    (SELECT id FROM livro WHERE autor = 'Mário Quintana' AND titulo = 'Apontamentos de História Sem Importância' LIMIT 1),
    'lido',
    5,
    'O tempo é um ponto de vista. Velho é quem é um dia mais velho que a gente.',
    datetime('now'),
    datetime('now')
);
