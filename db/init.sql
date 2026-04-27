-- Lulu Brechó · schema
-- Idempotente — pode rodar múltiplas vezes (CREATE ... IF NOT EXISTS).

-- ====================================================
-- Clientes
-- ====================================================
CREATE TABLE IF NOT EXISTS clientes (
  id            BIGSERIAL PRIMARY KEY,
  cpf           TEXT NOT NULL UNIQUE,
  nome          TEXT NOT NULL,
  whatsapp      TEXT,
  email         TEXT,
  endereco      TEXT,
  cidade        TEXT,
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf  ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);

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

-- Migrações idempotentes pra schemas antigos:
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
-- Backfill: cria cliente pra cada CPF distinto nos vales antigos
-- (usa o nome mais recente registrado)
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
