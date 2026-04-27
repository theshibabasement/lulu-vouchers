import { withClient } from './db';

export interface MetricasGerais {
  totalEmitido: number;
  totalAbatido: number;
  saldoCirculacao: number;
  qtdVales: number;
  qtdAtivos: number;
  qtdEsgotados: number;
  qtdClientes: number;
  qtdAvaliacoesPendentes: number;
  qtdAvaliacoesConfirmadas: number;
}

export interface MetricasMensal {
  mes: string; // 'YYYY-MM'
  emitido: number;
  abatido: number;
  qtdVales: number;
  qtdAbatimentos: number;
}

export interface TopCliente {
  id: number;
  nome: string;
  cpf: string;
  totalEmitido: number;
  qtdVales: number;
}

export interface DashboardData {
  geral: MetricasGerais;
  porMes: MetricasMensal[]; // últimos 12 meses
  topClientes: TopCliente[]; // top 10
  hoje: {
    valesEmitidos: number;
    valorEmitido: number;
    valesAbatidos: number;
    valorAbatido: number;
  };
}

export async function getDashboard(): Promise<DashboardData> {
  return withClient(async (c) => {
    const [geralRes, porMesRes, topRes, hojeEmitidosRes, hojeAbatidosRes] = await Promise.all([
      c.query(`
        SELECT
          COALESCE(SUM(v.valor_original) FILTER (WHERE v.deletado_em IS NULL), 0) AS total_emitido,
          COALESCE(SUM(v.valor_original - v.saldo) FILTER (WHERE v.deletado_em IS NULL), 0) AS total_abatido,
          COALESCE(SUM(v.saldo) FILTER (WHERE v.deletado_em IS NULL), 0) AS saldo_circulacao,
          COUNT(v.id) FILTER (WHERE v.deletado_em IS NULL) AS qtd_vales,
          COUNT(v.id) FILTER (WHERE v.deletado_em IS NULL AND v.status = 'ativo' AND v.saldo > 0) AS qtd_ativos,
          COUNT(v.id) FILTER (WHERE v.deletado_em IS NULL AND v.status = 'esgotado') AS qtd_esgotados,
          (SELECT COUNT(*) FROM clientes WHERE deletado_em IS NULL) AS qtd_clientes,
          (SELECT COUNT(*) FROM avaliacoes WHERE status = 'pendente') AS qtd_pendentes,
          (SELECT COUNT(*) FROM avaliacoes WHERE status = 'confirmada') AS qtd_confirmadas
        FROM vales v
      `),
      c.query(`
        SELECT
          to_char(v.criado_em, 'YYYY-MM') AS mes,
          COALESCE(SUM(v.valor_original), 0) AS emitido,
          COUNT(v.id) AS qtd_vales
        FROM vales v
        WHERE v.deletado_em IS NULL
          AND v.criado_em >= NOW() - INTERVAL '12 months'
        GROUP BY mes
        ORDER BY mes ASC
      `),
      c.query(`
        SELECT
          c.id, c.cpf, c.nome,
          COALESCE(SUM(v.valor_original), 0) AS total_emitido,
          COUNT(v.id) AS qtd_vales
        FROM clientes c
        LEFT JOIN vales v ON v.cliente_id = c.id AND v.deletado_em IS NULL
        WHERE c.deletado_em IS NULL
        GROUP BY c.id
        HAVING COUNT(v.id) > 0
        ORDER BY total_emitido DESC, qtd_vales DESC
        LIMIT 10
      `),
      c.query(`
        SELECT
          COUNT(id) AS qtd,
          COALESCE(SUM(valor_original), 0) AS valor
        FROM vales
        WHERE deletado_em IS NULL
          AND criado_em >= date_trunc('day', NOW())
          AND criado_em < date_trunc('day', NOW()) + INTERVAL '1 day'
      `),
      c.query(`
        SELECT
          COUNT(t.id) AS qtd,
          COALESCE(SUM(t.valor), 0) AS valor
        FROM transacoes t
        WHERE t.tipo = 'abatimento'
          AND t.data >= date_trunc('day', NOW())
          AND t.data < date_trunc('day', NOW()) + INTERVAL '1 day'
      `),
    ]);

    // Abatido por mês (separado pra simplicidade)
    const abatidoMesRes = await c.query(`
      SELECT
        to_char(t.data, 'YYYY-MM') AS mes,
        COALESCE(SUM(t.valor), 0) AS abatido,
        COUNT(t.id) AS qtd_abatimentos
      FROM transacoes t
      WHERE t.tipo = 'abatimento'
        AND t.data >= NOW() - INTERVAL '12 months'
      GROUP BY mes
      ORDER BY mes ASC
    `);

    const g = geralRes.rows[0];
    const porMesMap = new Map<string, MetricasMensal>();
    for (const r of porMesRes.rows) {
      porMesMap.set(r.mes as string, {
        mes: r.mes as string,
        emitido: Number(r.emitido),
        abatido: 0,
        qtdVales: Number(r.qtd_vales),
        qtdAbatimentos: 0,
      });
    }
    for (const r of abatidoMesRes.rows) {
      const m = r.mes as string;
      const cur = porMesMap.get(m) ?? {
        mes: m, emitido: 0, abatido: 0, qtdVales: 0, qtdAbatimentos: 0,
      };
      cur.abatido = Number(r.abatido);
      cur.qtdAbatimentos = Number(r.qtd_abatimentos);
      porMesMap.set(m, cur);
    }
    const porMes = [...porMesMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

    return {
      geral: {
        totalEmitido: Number(g.total_emitido),
        totalAbatido: Number(g.total_abatido),
        saldoCirculacao: Number(g.saldo_circulacao),
        qtdVales: Number(g.qtd_vales),
        qtdAtivos: Number(g.qtd_ativos),
        qtdEsgotados: Number(g.qtd_esgotados),
        qtdClientes: Number(g.qtd_clientes),
        qtdAvaliacoesPendentes: Number(g.qtd_pendentes),
        qtdAvaliacoesConfirmadas: Number(g.qtd_confirmadas),
      },
      porMes,
      topClientes: topRes.rows.map((r) => ({
        id: Number(r.id),
        nome: r.nome as string,
        cpf: r.cpf as string,
        totalEmitido: Number(r.total_emitido),
        qtdVales: Number(r.qtd_vales),
      })),
      hoje: {
        valesEmitidos: Number(hojeEmitidosRes.rows[0].qtd),
        valorEmitido: Number(hojeEmitidosRes.rows[0].valor),
        valesAbatidos: Number(hojeAbatidosRes.rows[0].qtd),
        valorAbatido: Number(hojeAbatidosRes.rows[0].valor),
      },
    };
  });
}

/** Dados detalhados de um mês específico — usado pelo relatório fiscal. */
export async function getRelatorioMensal(year: number, month: number) {
  // month: 1..12
  return withClient(async (c) => {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const [emitidosRes, abatimentosRes, totaisRes] = await Promise.all([
      c.query(
        `SELECT id, cliente_id, nome, cpf, valor_original, saldo, status, criado_em
         FROM vales
         WHERE deletado_em IS NULL
           AND criado_em >= $1::date
           AND criado_em <  ($1::date + INTERVAL '1 month')
         ORDER BY criado_em ASC`,
        [startStr],
      ),
      c.query(
        `SELECT t.id, t.vale_id, t.valor, t.data, t.obs, v.nome, v.cpf
         FROM transacoes t
         JOIN vales v ON v.id = t.vale_id
         WHERE t.tipo = 'abatimento'
           AND t.data >= $1::date
           AND t.data <  ($1::date + INTERVAL '1 month')
           AND v.deletado_em IS NULL
         ORDER BY t.data ASC`,
        [startStr],
      ),
      c.query(
        `SELECT
          COALESCE(SUM(v.valor_original) FILTER (WHERE v.deletado_em IS NULL
            AND v.criado_em >= $1::date
            AND v.criado_em <  ($1::date + INTERVAL '1 month')), 0) AS total_emitido,
          COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'abatimento'
            AND t.data >= $1::date
            AND t.data <  ($1::date + INTERVAL '1 month')), 0) AS total_abatido
         FROM vales v
         FULL OUTER JOIN transacoes t ON t.vale_id = v.id`,
        [startStr],
      ),
    ]);

    return {
      ano: year,
      mes: month,
      totalEmitido: Number(totaisRes.rows[0].total_emitido),
      totalAbatido: Number(totaisRes.rows[0].total_abatido),
      qtdVales: emitidosRes.rowCount ?? 0,
      qtdAbatimentos: abatimentosRes.rowCount ?? 0,
      vales: emitidosRes.rows.map((r) => ({
        id: r.id as string,
        nome: r.nome as string,
        cpf: r.cpf as string,
        valorOriginal: Number(r.valor_original),
        saldo: Number(r.saldo),
        status: r.status as string,
        criadoEm: (r.criado_em as Date).toISOString(),
      })),
      abatimentos: abatimentosRes.rows.map((r) => ({
        id: Number(r.id),
        valeId: r.vale_id as string,
        nome: r.nome as string,
        cpf: r.cpf as string,
        valor: Number(r.valor),
        data: (r.data as Date).toISOString(),
        obs: (r.obs as string | null) ?? null,
      })),
    };
  });
}
