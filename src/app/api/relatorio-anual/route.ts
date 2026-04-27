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
  if (!Number.isFinite(ano) || ano < 2000 || ano > 9999) {
    return NextResponse.json({ error: 'Ano inválido.' }, { status: 400 });
  }

  // Busca os 12 meses em paralelo
  const meses = await Promise.all(
    Array.from({ length: 12 }, (_, i) => getRelatorioMensal(ano, i + 1)),
  );

  const totalEmitido = meses.reduce((s, m) => s + m.totalEmitido, 0);
  const totalAbatido = meses.reduce((s, m) => s + m.totalAbatido, 0);
  const totalVales = meses.reduce((s, m) => s + m.qtdVales, 0);
  const totalAbatimentos = meses.reduce((s, m) => s + m.qtdAbatimentos, 0);

  // CSV consolidado: 1 linha por vale, 1 linha por desconto, com mês em coluna
  const valesLines: string[] = [];
  const abatLines: string[] = [];
  for (const m of meses) {
    for (const v of m.vales) {
      valesLines.push(
        [
          MESES_NOME[m.mes - 1],
          dateBR(v.criadoEm),
          v.id,
          v.nome,
          formatCPF(v.cpf),
          v.whatsapp ?? '',
          v.email ?? '',
          v.endereco ?? '',
          v.cidade ?? '',
          brl(v.valorOriginal),
          brl(v.saldo),
          v.status,
        ].map(csvCell).join(';'),
      );
    }
    for (const a of m.abatimentos) {
      abatLines.push(
        [
          MESES_NOME[m.mes - 1],
          dateBR(a.data),
          a.valeId,
          a.nome,
          formatCPF(a.cpf),
          a.whatsapp ?? '',
          a.email ?? '',
          brl(a.valor),
          a.obs ?? '',
        ].map(csvCell).join(';'),
      );
    }
  }

  const valesHeader =
    'Mês;Data de emissão;Código do vale;Nome do cliente;CPF;WhatsApp;E-mail;Endereço;Cidade;Valor (R$);Saldo atual (R$);Status';
  const abatHeader =
    'Mês;Data do desconto;Código do vale;Nome do cliente;CPF;WhatsApp;E-mail;Valor descontado (R$);Observação';

  const totaisMensaisLines = [
    'Mês;Vales emitidos;Valor emitido (R$);Descontos;Valor descontado (R$);Saldo gerado (R$)',
    ...meses.map((m) =>
      [
        MESES_NOME[m.mes - 1],
        m.qtdVales,
        brl(m.totalEmitido),
        m.qtdAbatimentos,
        brl(m.totalAbatido),
        brl(m.totalEmitido - m.totalAbatido),
      ]
        .map(csvCell)
        .join(';'),
    ),
  ];

  const body =
    `RELATÓRIO ANUAL LULU ARTEIRA — ${ano}\n` +
    `Total emitido (R$);${brl(totalEmitido)}\n` +
    `Total descontado (R$);${brl(totalAbatido)}\n` +
    `Saldo gerado no ano (R$);${brl(totalEmitido - totalAbatido)}\n` +
    `Quantidade de vales emitidos;${totalVales}\n` +
    `Quantidade de descontos;${totalAbatimentos}\n\n` +
    `## RESUMO POR MÊS\n` +
    totaisMensaisLines.join('\n') +
    `\n\n## VALES EMITIDOS\n` +
    valesHeader +
    `\n` +
    (valesLines.length > 0 ? valesLines.join('\n') : '(nenhum vale neste ano)') +
    `\n\n## DESCONTOS APLICADOS\n` +
    abatHeader +
    `\n` +
    (abatLines.length > 0 ? abatLines.join('\n') : '(nenhum desconto neste ano)') +
    `\n`;

  const bom = '﻿';
  return new NextResponse(bom + body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="relatorio-lulu-${ano}.csv"`,
    },
  });
}
