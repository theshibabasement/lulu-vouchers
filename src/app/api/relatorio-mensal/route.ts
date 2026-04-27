import { NextResponse } from 'next/server';
import { getRelatorioMensal } from '@/lib/metricas';

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(';')];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(';'));
  return lines.join('\n');
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
    const valesCsv = toCsv(data.vales as unknown as Record<string, unknown>[]);
    const abatCsv = toCsv(data.abatimentos as unknown as Record<string, unknown>[]);
    const body =
      `Relatório Lulu Arteira — ${tag}\n` +
      `Total emitido;${data.totalEmitido.toFixed(2)}\n` +
      `Total abatido;${data.totalAbatido.toFixed(2)}\n` +
      `Qtd vales;${data.qtdVales}\n` +
      `Qtd abatimentos;${data.qtdAbatimentos}\n\n` +
      `# VALES EMITIDOS\n` +
      valesCsv +
      `\n\n# ABATIMENTOS\n` +
      abatCsv +
      `\n`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="relatorio-lulu-${tag}.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}
