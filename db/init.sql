-- Lulu Brechó · schema vales
CREATE TABLE IF NOT EXISTS vales (
  id              TEXT PRIMARY KEY,
  nome            TEXT NOT NULL,
  cpf             TEXT NOT NULL,
  valor_original  NUMERIC(12,2) NOT NULL CHECK (valor_original > 0),
  saldo           NUMERIC(12,2) NOT NULL CHECK (saldo >= 0),
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','esgotado')),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transacoes (
  id        BIGSERIAL PRIMARY KEY,
  vale_id   TEXT NOT NULL REFERENCES vales(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL CHECK (tipo IN ('criacao','abatimento')),
  valor     NUMERIC(12,2) NOT NULL,
  data      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  obs       TEXT
);

CREATE INDEX IF NOT EXISTS idx_vales_cpf      ON vales(cpf);
CREATE INDEX IF NOT EXISTS idx_vales_status   ON vales(status);
CREATE INDEX IF NOT EXISTS idx_vales_criado   ON vales(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_tx_vale        ON transacoes(vale_id);
CREATE INDEX IF NOT EXISTS idx_tx_data        ON transacoes(data DESC);
