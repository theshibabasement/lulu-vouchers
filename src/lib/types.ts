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
  nome: string;
  cpf: string;
  valorOriginal: number;
  saldo: number;
  status: Status;
  criadoEm: string; // ISO
  transacoes: Transacao[];
}
