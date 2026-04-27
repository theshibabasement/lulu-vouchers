# Lulu Brechó · Sistema de Vales

Aplicação Next.js 15 para emissão e controle dos vales-crédito do brechó.
Persistência em Postgres + fallback JSONL local. Deploy via Dokploy/Traefik.

> _Bora vir garimpar na Lulu?_ 🩷

## Stack

- **Next.js 15** (App Router, output `standalone`)
- **React 19** + **Tailwind 3** com tokens do Lulu Arteira Design System
- **Postgres 16** (dados de vales e transações)
- **JSONL local** (`/data/vales.jsonl` + `transacoes.jsonl`) como espelho/fallback
- **iron-session** para login simples por cookie
- **JsBarcode** (CODE128) para o código dos vales

## Estrutura

```
src/
├─ app/
│  ├─ login/page.tsx          ← tela de login
│  ├─ page.tsx                ← app principal (protegido)
│  └─ api/
│     ├─ auth/{login,logout}  ← sessão
│     ├─ vales (GET, POST)    ← listar/criar
│     ├─ vales/[id] (GET)
│     ├─ vales/[id]/abater    ← POST abatimento
│     └─ health               ← healthcheck (DB ping)
├─ components/                 ← AppShell, NovaVendaForm, ValesList, ValeDetail, Receipt, PrintArea, Toast
├─ lib/                        ← db, vales, fallback, session, format, types
└─ middleware.ts               ← gate de auth
db/init.sql                    ← schema (idempotente)
scripts/
├─ init-db.mjs                 ← aplica schema (CREATE TABLE IF NOT EXISTS)
└─ export.mjs                  ← exporta JSON + CSV em /data/exports/
docker-compose.yml             ← stack Dokploy (app + db + volumes)
Dockerfile                     ← multi-stage standalone
```

---

## Deploy no Dokploy

### 1. Subir o projeto no Dokploy

- Crie um **Compose Service** (ou um **Application** apontando para o repositório).
- Tipo: **Docker Compose** com este `docker-compose.yml`.
- Branch / repositório: aponte para onde o código está versionado.

### 2. Variáveis de ambiente

No painel do Dokploy → aba **Environment**, defina:

| Variável             | Exemplo                                        |
|----------------------|------------------------------------------------|
| `AUTH_USER`          | `lulu`                                         |
| `AUTH_PASSWORD`      | `senha-forte-da-loja`                          |
| `AUTH_SECRET`        | `openssl rand -hex 32` (32+ chars)             |
| `POSTGRES_USER`      | `lulu` (opcional, default `lulu`)              |
| `POSTGRES_PASSWORD`  | `senha-forte-do-banco`                         |
| `POSTGRES_DB`        | `lulu_vales` (opcional)                        |

### 3. Domínio + SSL

No painel → aba **Domains**:

- Adicione o domínio (ex: `vales.lulubrecho.com.br`).
- Service name: `app`
- Port: `3000`
- Marque **HTTPS** (Let's Encrypt automático via Traefik).
- Salve. O Dokploy injeta as labels do Traefik automaticamente.

### 4. Deploy

Clique em **Deploy**. O Dokploy vai:

1. Buildar o `Dockerfile` (multi-stage).
2. Subir o serviço `db` (Postgres com volume persistente).
3. Aguardar o healthcheck do `db` passar.
4. Subir o `app`. Schema é criado automaticamente na primeira inicialização (via `db/init.sql` no `docker-entrypoint-initdb.d/`).

### 5. (Opcional) Aplicar/atualizar schema manualmente

Caso o Postgres já exista e o init.sql não rode:

```bash
docker exec lulu-app node scripts/init-db.mjs
```

---

## Operação

### Login

- URL pública → redireciona para `/login`.
- Use `AUTH_USER` + `AUTH_PASSWORD`. Sessão dura 12h.

### Exportar dados

Gera JSON + CSV no volume `/data/exports/`:

```bash
docker exec lulu-app node scripts/export.mjs
```

Saída:

```
/data/exports/vales-20260426-1430.json
/data/exports/vales-20260426-1430.csv
/data/exports/transacoes-20260426-1430.csv
/data/exports/clientes-20260426-1430.csv
```

Para baixar para sua máquina local (executando no host onde o Docker está):

```bash
docker cp lulu-app:/data/exports ./backups/
```

### Purgar vales soft-deletados

Soft delete vira `deletado_em` no Postgres. Vales somem das listagens mas
continuam acessíveis pelo filtro **Excluídos**. Para apagar definitivamente:

```bash
# DRY-RUN: lista o que seria apagado
docker exec lulu-app node scripts/purge-deleted.mjs

# Apaga de verdade (cascade nas transações)
docker exec lulu-app node scripts/purge-deleted.mjs --apply
```

### Backup do banco

O volume `lulu_pgdata` persiste os dados Postgres entre redeploys.
Para backup pontual:

```bash
docker exec lulu-db pg_dump -U lulu lulu_vales > backup-$(date +%Y%m%d).sql
```

### Fallback local

Cada criação de vale e cada abatimento são espelhados em
`/data/vales.jsonl` e `/data/transacoes.jsonl` (append-only).
Se o Postgres ficar indisponível na **leitura**, a app reidrata da JSONL automaticamente.
Escritas exigem o Postgres ativo (transação).

---

## Desenvolvimento local

```bash
cp .env.example .env
# Edite .env, gere AUTH_SECRET com: openssl rand -hex 32
# Suba só o Postgres:
docker compose up -d db

# Defina DATABASE_URL para o host
export DATABASE_URL="postgres://lulu:senha@localhost:5432/lulu_vales"
export DATA_DIR=./data

npm install
npm run db:init     # cria as tabelas
npm run dev
```

App em `http://localhost:3000`.

---

## Notas técnicas

- **Sem `ports:` no `app`.** O Traefik (gerenciado pelo Dokploy) faz o roteamento via
  labels que o painel injeta. Expor a porta atrapalha o ciclo de redeploy zero-downtime.
- **Postgres não é exposto.** Está só na network `internal`.
- **Healthcheck do app** retorna `200` mesmo em modo degradado (só app vivo, DB caído),
  porque ainda existe fallback JSONL para leitura. Healthcheck do `db` é o gate real.
- **Recorte automático MP-4200 TH:** configure o driver Windows em
  *Painel de Controle → Impressoras → MP-4200 TH → Preferências → Page end cut*.

---

## Licença

Uso interno Lulu Brechó.
