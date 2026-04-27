export type Status = 'ativo' | 'esgotado';
export type TipoTx = 'criacao' | 'abatimento';

export interface Transacao {
  tipo: TipoTx;
  valor: number;
  data: string; // ISO
  obs?: string;
}

export interface Vale {
  id: string;
  clienteId?: number | null;
  /** Token do cliente — incluído pra montar QR do recibo. Não exposto pra cliente externo. */
  portalToken?: string | null;
  nome: string;
  cpf: string;
  valorOriginal: number;
  saldo: number;
  status: Status;
  criadoEm: string; // ISO
  deletadoEm?: string | null;
  transacoes: Transacao[];
}

export interface Cliente {
  id: number;
  cpf: string;
  nome: string;
  whatsapp?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  observacoes?: string | null;
  portalToken?: string | null;
  temSenha?: boolean;
  portalAtivadoEm?: string | null;
  deletadoEm?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ClienteAgregados {
  totalEmitido: number;
  totalAbatido: number;
  saldoTotal: number;
  qtdVales: number;
  qtdAtivos: number;
  ultimaCompra?: string | null;
}

export type TagCor = 'magenta' | 'cyan' | 'yellow' | 'purple' | 'mint' | 'cheek' | 'ink';
export interface ClienteTag {
  id: number;
  nome: string;
  cor: TagCor;
}

export interface ClienteComAgregados extends Cliente {
  agregados: ClienteAgregados;
  tags?: ClienteTag[];
}

export type AvaliacaoStatus =
  | 'pendente'
  | 'confirmada'
  | 'realizada'
  | 'cancelada'
  | 'no_show';

export interface Avaliacao {
  id: number;
  clienteId: number | null;
  nome: string;
  cpf?: string | null;
  whatsapp?: string | null;
  dataHora: string; // ISO
  qtdPecas?: number | null;
  tamanhos: string[];
  observacoes?: string | null;
  status: AvaliacaoStatus;
  valeId?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}
