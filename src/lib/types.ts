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

export interface ClienteComAgregados extends Cliente {
  agregados: ClienteAgregados;
}
