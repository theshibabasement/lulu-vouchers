import { NextResponse } from 'next/server';
import { getRelatorioMensal } from '@/lib/metricas';
import { formatCPF } from '@/lib/format';

const MESES_NOME = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  headers: { key: keyof T; label: string }[],
): string {
  const lines = [headers.map((h) => h.label).join(';')];
  for (const r of rows) {
    lines.push(headers.map((h) => csvCell(r[h.key])).join(';'));
  }
  return lines.join('\n');
}

function brl(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

function dateBR(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ano = parseInt(url.searchParams.get('ano') ?? '', 10);
  const mes = parseInt(url.searchParams.get('mes') ?? '', 10);
  const formato = url.searchParams.get('formato') ?? 'json'; // json | csv

  if (!Number.isFinite(ano) || ano < 2000 || ano > 9999) {
    return NextResponse.json({ error: 'Ano inválido.' }, { status: 400 });
  }
  if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'Mês inválido (1..12).' }, { status: 400 });
  }

  const data = await getRelatorioMensal(ano, mes);

  if (formato === 'csv') {
    const tag = `${ano}-${String(mes).padStart(2, '0')}`;
    const titulo = `${MESES_NOME[mes - 1]} de ${ano}`;

    const valesRows = data.vales.map((v) => ({
      data: dateBR(v.criadoEm),
      codigo: v.id,
      nome: v.nome,
      cpf: formatCPF(v.cpf),
      whatsapp: v.whatsapp ?? '',
      email: v.email ?? '',
      endereco: v.endereco ?? '',
      cidade: v.cidade ?? '',
      valor: brl(v.valorOriginal),
      saldo: brl(v.saldo),
      status: v.status,
    }));
    const valesCsv = toCsv(valesRows, [
      { key: 'data', label: 'Data de emissão' },
      { key: 'codigo', label: 'Código do vale' },
      { key: 'nome', label: 'Nome do cliente' },
      { key: 'cpf', label: 'CPF' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'endereco', label: 'Endereço' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'valor', label: 'Valor (R$)' },
      { key: 'saldo', label: 'Saldo atual (R$)' },
      { key: 'status', label: 'Status' },
    ]);

    const abatRows = data.abatimentos.map((a) => ({
      data: dateBR(a.data),
      vale: a.valeId,
      nome: a.nome,
      cpf: formatCPF(a.cpf),
      whatsapp: a.whatsapp ?? '',
      email: a.email ?? '',
      valor: brl(a.valor),
      obs: a.obs ?? '',
    }));
    const abatCsv = toCsv(abatRows, [
      { key: 'data', label: 'Data do desconto' },
      { key: 'vale', label: 'Código do vale' },
      { key: 'nome', label: 'Nome do cliente' },
      { key: 'cpf', label: 'CPF' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'valor', label: 'Valor descontado (R$)' },
      { key: 'obs', label: 'Observação' },
    ]);

    const body =
      `RELATÓRIO LULU ARTEIRA — ${titulo}\n` +
      `Total emitido (R$);${brl(data.totalEmitido)}\n` +
      `Total descontado (R$);${brl(data.totalAbatido)}\n` +
      `Saldo gerado no mês (R$);${brl(data.totalEmitido - data.totalAbatido)}\n` +
      `Quantidade de vales emitidos;${data.qtdVales}\n` +
      `Quantidade de descontos;${data.qtdAbatimentos}\n\n` +
      `## VALES EMITIDOS\n` +
      (valesRows.length > 0 ? valesCsv : '(nenhum vale emitido neste mês)') +
      `\n\n## DESCONTOS APLICADOS\n` +
      (abatRows.length > 0 ? abatCsv : '(nenhum desconto neste mês)') +
      `\n`;

    // BOM UTF-8 pra Excel reconhecer acentos sem precisar configurar
    const bom = '﻿';
    return new NextResponse(bom + body, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="relatorio-lulu-${tag}.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}
