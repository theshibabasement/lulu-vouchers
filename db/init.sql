-- Lulu Brechó · schema
-- Idempotente — pode rodar múltiplas vezes (CREATE ... IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ====================================================
-- Clientes
-- ====================================================
CREATE TABLE IF NOT EXISTS clientes (
  id                BIGSERIAL PRIMARY KEY,
  cpf               TEXT NOT NULL UNIQUE,
  nome              TEXT NOT NULL,
  whatsapp          TEXT,
  email             TEXT,
  endereco          TEXT,
  cidade            TEXT,
  observacoes       TEXT,
  portal_token      TEXT UNIQUE,
  senha_hash        TEXT,
  portal_ativado_em TIMESTAMPTZ,
  deletado_em       TIMESTAMPTZ,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrações idempotentes pra schema antigo
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS portal_token      TEXT UNIQUE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS senha_hash        TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS portal_ativado_em TIMESTAMPTZ;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS deletado_em       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clientes_cpf      ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_nome     ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_token    ON clientes(portal_token);
CREATE INDEX IF NOT EXISTS idx_clientes_deletado ON clientes(deletado_em);

-- Backfill de portal_token pros clientes sem (base64url — URL-safe)
UPDATE clientes
SET portal_token = translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_')
WHERE portal_token IS NULL;

-- Normaliza tokens já gerados em base64 padrão (com +/=) pra base64url
UPDATE clientes
SET portal_token = translate(portal_token, '+/=', '-_')
WHERE portal_token ~ '[+/=]';

-- ====================================================
-- Vales
-- ====================================================
CREATE TABLE IF NOT EXISTS vales (
  id              TEXT PRIMARY KEY,
  cliente_id      BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  cpf             TEXT NOT NULL,
  valor_original  NUMERIC(12,2) NOT NULL CHECK (valor_original > 0),
  saldo           NUMERIC(12,2) NOT NULL CHECK (saldo >= 0),
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','esgotado')),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletado_em     TIMESTAMPTZ
);

ALTER TABLE vales ADD COLUMN IF NOT EXISTS cliente_id  BIGINT REFERENCES clientes(id) ON DELETE SET NULL;
ALTER TABLE vales ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vales_cpf      ON vales(cpf);
CREATE INDEX IF NOT EXISTS idx_vales_status   ON vales(status);
CREATE INDEX IF NOT EXISTS idx_vales_criado   ON vales(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_vales_cliente  ON vales(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vales_deletado ON vales(deletado_em);

-- ====================================================
-- Transações
-- ====================================================
CREATE TABLE IF NOT EXISTS transacoes (
  id        BIGSERIAL PRIMARY KEY,
  vale_id   TEXT NOT NULL REFERENCES vales(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL CHECK (tipo IN ('criacao','abatimento')),
  valor     NUMERIC(12,2) NOT NULL,
  data      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  obs       TEXT
);

CREATE INDEX IF NOT EXISTS idx_tx_vale ON transacoes(vale_id);
CREATE INDEX IF NOT EXISTS idx_tx_data ON transacoes(data DESC);

-- ====================================================
-- Avaliações (agendamentos)
-- ====================================================
CREATE TABLE IF NOT EXISTS avaliacoes (
  id            BIGSERIAL PRIMARY KEY,
  cliente_id    BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
  -- snapshot — preserva mesmo se cliente sumir
  nome          TEXT NOT NULL,
  cpf           TEXT,
  whatsapp      TEXT,
  data_hora     TIMESTAMPTZ NOT NULL,
  qtd_pecas     INTEGER,
  tamanhos      TEXT[] NOT NULL DEFAULT '{}',
  observacoes   TEXT,
  status        TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','confirmada','realizada','cancelada','no_show')),
  vale_id       TEXT REFERENCES vales(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_data    ON avaliacoes(data_hora);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_status  ON avaliacoes(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_cliente ON avaliacoes(cliente_id);

-- ====================================================
-- Administradores (multi-usuário)
-- ====================================================
CREATE TABLE IF NOT EXISTS admins (
  id              BIGSERIAL PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE,
  nome            TEXT NOT NULL,
  senha_hash      TEXT NOT NULL,
  perfil          TEXT NOT NULL DEFAULT 'atendente'
                    CHECK (perfil IN ('dona','atendente')),
  ativo           BOOLEAN NOT NULL DEFAULT true,
  ultimo_login_em TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_ativo    ON admins(ativo);

-- ====================================================
-- Config de horários de avaliação
-- ====================================================
-- tipo='padrao' (default p/ todos os dias)
-- tipo='semanal' (override por dia da semana 0=domingo..6=sábado)
-- tipo='data' (override por data específica)
-- janelas: array JSONB [{"start":"09:00","end":"12:00"},...]; vazio = fechado
CREATE TABLE IF NOT EXISTS config_horarios (
  id            BIGSERIAL PRIMARY KEY,
  tipo          TEXT NOT NULL CHECK (tipo IN ('padrao','semanal','data')),
  dia_semana    SMALLINT CHECK (dia_semana IS NULL OR (dia_semana BETWEEN 0 AND 6)),
  data          DATE,
  janelas       JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (tipo = 'padrao'  AND dia_semana IS NULL AND data IS NULL) OR
    (tipo = 'semanal' AND dia_semana IS NOT NULL AND data IS NULL) OR
    (tipo = 'data'    AND dia_semana IS NULL AND data IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_config_horarios_padrao
  ON config_horarios ((1)) WHERE tipo = 'padrao';
CREATE UNIQUE INDEX IF NOT EXISTS uq_config_horarios_semanal
  ON config_horarios (dia_semana) WHERE tipo = 'semanal';
CREATE UNIQUE INDEX IF NOT EXISTS uq_config_horarios_data
  ON config_horarios (data) WHERE tipo = 'data';

-- Seed do padrão (09:00–12:00 e 13:30–18:00)
INSERT INTO config_horarios (tipo, janelas)
SELECT 'padrao', '[{"start":"09:00","end":"12:00"},{"start":"13:30","end":"18:00"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM config_horarios WHERE tipo = 'padrao');

-- ====================================================
-- Backfill: cria cliente pra cada CPF distinto nos vales antigos
-- ====================================================
INSERT INTO clientes (cpf, nome, criado_em, atualizado_em)
SELECT DISTINCT ON (v.cpf)
  v.cpf, v.nome, v.criado_em, v.criado_em
FROM vales v
WHERE NOT EXISTS (SELECT 1 FROM clientes c WHERE c.cpf = v.cpf)
ORDER BY v.cpf, v.criado_em DESC;

-- Vincula vales sem cliente_id ao cliente correspondente por CPF
UPDATE vales v
SET cliente_id = c.id
FROM clientes c
WHERE v.cpf = c.cpf AND v.cliente_id IS NULL;

-- Garante token pra todos os clientes (inclusive os criados pelo backfill)
UPDATE clientes
SET portal_token = translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_')
WHERE portal_token IS NULL;

-- ====================================================
-- Normalização e deduplicação de clientes
-- ====================================================
-- Versão antiga gravava CPF formatado (042.975.340-37) em vales mas só
-- dígitos em clientes. Backfill enxergava como CPFs diferentes e
-- duplicava. Aqui:
--   1. Normalizamos CPF de vales pra só dígitos
--   2. Identificamos grupos de clientes pelo CPF normalizado
--   3. Migramos referências em vales/avaliações pro cliente "líder" do grupo
--   4. Soft delete dos duplicados
--   5. Normalizamos CPF dos clientes que sobraram

-- 1) Normaliza CPF nos vales
UPDATE vales
SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
WHERE cpf ~ '[^0-9]';

-- 2+3) Migra cliente_id em vales pro líder do grupo (id mínimo por CPF normalizado)
UPDATE vales v
SET cliente_id = sub.keep_id
FROM (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY regexp_replace(cpf, '[^0-9]', '', 'g')
    ) AS keep_id
  FROM clientes
) sub
WHERE v.cliente_id = sub.id AND sub.id <> sub.keep_id;

-- Migra cliente_id em avaliacoes
UPDATE avaliacoes a
SET cliente_id = sub.keep_id
FROM (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY regexp_replace(cpf, '[^0-9]', '', 'g')
    ) AS keep_id
  FROM clientes
) sub
WHERE a.cliente_id = sub.id AND sub.id <> sub.keep_id;

-- 4) Soft delete dos duplicados (mantém só o líder de cada grupo)
UPDATE clientes c
SET deletado_em = NOW()
FROM (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY regexp_replace(cpf, '[^0-9]', '', 'g')
    ) AS keep_id
  FROM clientes
  WHERE deletado_em IS NULL
) sub
WHERE c.id = sub.id
  AND sub.id <> sub.keep_id
  AND c.deletado_em IS NULL;

-- 5) Normaliza CPF dos clientes ativos (não deletados)
UPDATE clientes
SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
WHERE deletado_em IS NULL AND cpf ~ '[^0-9]';
