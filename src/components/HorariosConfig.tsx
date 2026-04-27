'use client';

import { useEffect, useState } from 'react';

interface Janela {
  start: string;
  end: string;
}

interface ConfigHorario {
  id: number;
  tipo: 'padrao' | 'semanal' | 'data';
  diaSemana: number | null;
  data: string | null;
  janelas: Janela[];
  atualizadoEm: string;
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface Props {
  onToast: (msg: string, kind?: 'success' | 'error') => void;
}

export function HorariosConfig({ onToast }: Props) {
  const [configs, setConfigs] = useState<ConfigHorario[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/horarios', { cache: 'no-store' });
      const j = (await r.json()) as { configs: ConfigHorario[] };
      setConfigs(j.configs ?? []);
    } catch (e) {
      onToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const padrao = configs.find((c) => c.tipo === 'padrao');
  const semanais = configs.filter((c) => c.tipo === 'semanal');
  const datas = configs.filter((c) => c.tipo === 'data');

  return (
    <div className="space-y-5">
      {loading && <div className="text-ink-soft text-sm">Carregando…</div>}

      <Section title="Padrão (todos os dias)">
        <p className="text-sm text-ink-soft mb-3">
          Horário padrão de avaliação. Aplica a qualquer dia que não tenha
          configuração específica.
        </p>
        <JanelasEditor
          janelas={padrao?.janelas ?? []}
          onSave={async (janelas) => {
            try {
              const r = await fetch('/api/horarios/padrao', {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ janelas }),
              });
              if (!r.ok) throw new Error((await r.json()).error || 'Falha.');
              onToast('Padrão salvo.', 'success');
              load();
            } catch (e) {
              onToast((e as Error).message, 'error');
            }
          }}
        />
      </Section>

      <Section title="Outros horários · por dia da semana">
        <p className="text-sm text-ink-soft mb-3">
          Use pra fechar dias inteiros (ex: segunda) ou definir horário diferente
          em algum dia recorrente. Sem configuração = usa o padrão.
        </p>
        <div className="space-y-3">
          {DIAS_SEMANA.map((nome, i) => {
            const cfg = semanais.find((c) => c.diaSemana === i);
            return (
              <DiaSemanaRow
                key={i}
                index={i}
                nome={nome}
                config={cfg}
                onSave={async (janelas) => {
                  try {
                    const r = await fetch(`/api/horarios/semanal/${i}`, {
                      method: 'PUT',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ janelas }),
                    });
                    if (!r.ok) throw new Error((await r.json()).error || 'Falha.');
                    onToast(`${nome} salvo.`, 'success');
                    load();
                  } catch (e) {
                    onToast((e as Error).message, 'error');
                  }
                }}
                onClear={async () => {
                  try {
                    const r = await fetch(`/api/horarios/semanal/${i}`, { method: 'DELETE' });
                    if (!r.ok) throw new Error((await r.json()).error || 'Falha.');
                    onToast(`${nome}: voltou ao padrão.`, 'success');
                    load();
                  } catch (e) {
                    onToast((e as Error).message, 'error');
                  }
                }}
              />
            );
          })}
        </div>
      </Section>

      <Section title="Outros horários · por data específica">
        <p className="text-sm text-ink-soft mb-3">
          Pra fechar um dia específico (feriado, viagem) ou abrir horário
          diferente pontualmente.
        </p>
        <DataEspecificaForm
          onAdd={async (data, janelas) => {
            try {
              const r = await fetch(`/api/horarios/data/${data}`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ janelas }),
              });
              if (!r.ok) throw new Error((await r.json()).error || 'Falha.');
              onToast(`${data} salvo.`, 'success');
              load();
            } catch (e) {
              onToast((e as Error).message, 'error');
            }
          }}
        />
        {datas.length > 0 && (
          <div className="space-y-2 mt-4">
            {datas.map((c) => (
              <div key={c.id} className="bg-paper-tint rounded-md p-3 border border-line flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-ink">{c.data}</div>
                  <div className="text-xs text-ink-soft">
                    {c.janelas.length === 0
                      ? 'fechado'
                      : c.janelas.map((j) => `${j.start}–${j.end}`).join(' · ')}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`Remover horário específico de ${c.data}?`)) return;
                    try {
                      const r = await fetch(`/api/horarios/data/${c.data}`, {
                        method: 'DELETE',
                      });
                      if (!r.ok) throw new Error((await r.json()).error || 'Falha.');
                      onToast('Removido.', 'success');
                      load();
                    } catch (e) {
                      onToast((e as Error).message, 'error');
                    }
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink-mute hover:text-lulu-heart-red hover:border-lulu-heart-red transition"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-paper rounded-lg p-5 border-2 border-line shadow-sm">
      <h3 className="font-display text-xl text-lulu-purple mb-3">{title}</h3>
      {children}
    </section>
  );
}

function JanelasEditor({
  janelas: initial,
  onSave,
}: {
  janelas: Janela[];
  onSave: (j: Janela[]) => Promise<void>;
}) {
  const [janelas, setJanelas] = useState<Janela[]>(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setJanelas(initial);
  }, [JSON.stringify(initial)]); // eslint-disable-line react-hooks/exhaustive-deps

  function addJanela() {
    setJanelas((cur) => [...cur, { start: '09:00', end: '12:00' }]);
  }
  function update(i: number, patch: Partial<Janela>) {
    setJanelas((cur) => cur.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  }
  function remove(i: number) {
    setJanelas((cur) => cur.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {janelas.length === 0 && (
        <p className="text-sm text-ink-mute italic">Sem janelas — fechado.</p>
      )}
      {janelas.map((j, i) => (
        <div key={i} className="flex items-center gap-2 flex-wrap">
          <input
            type="time"
            value={j.start}
            onChange={(e) => update(i, { start: e.target.value })}
            className="lulu-input w-28"
          />
          <span className="text-ink-mute">até</span>
          <input
            type="time"
            value={j.end}
            onChange={(e) => update(i, { end: e.target.value })}
            className="lulu-input w-28"
          />
          <button
            onClick={() => remove(i)}
            className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink-mute hover:text-lulu-heart-red hover:border-lulu-heart-red transition"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={addJanela} className="lulu-btn-secondary text-sm">
          + Adicionar janela
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(janelas);
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="lulu-btn-primary text-sm disabled:opacity-60"
        >
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function DiaSemanaRow({
  index: _index,
  nome,
  config,
  onSave,
  onClear,
}: {
  index: number;
  nome: string;
  config: ConfigHorario | undefined;
  onSave: (j: Janela[]) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-2 border-line rounded-md p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="font-bold text-ink">{nome}</span>
          <span className="text-xs text-ink-soft ml-3">
            {!config
              ? 'usa padrão'
              : config.janelas.length === 0
              ? 'fechado'
              : config.janelas.map((j) => `${j.start}–${j.end}`).join(' · ')}
          </span>
        </div>
        <div className="flex gap-2">
          {config && (
            <button
              onClick={onClear}
              className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink-mute hover:border-ink-mute transition"
            >
              Voltar p/ padrão
            </button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink hover:border-ink-mute transition"
          >
            {open ? 'Fechar' : 'Editar'}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-line">
          <JanelasEditor
            janelas={config?.janelas ?? []}
            onSave={async (j) => {
              await onSave(j);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function DataEspecificaForm({
  onAdd,
}: {
  onAdd: (data: string, janelas: Janela[]) => Promise<void>;
}) {
  const [data, setData] = useState('');
  const [janelas, setJanelas] = useState<Janela[]>([]);
  const [busy, setBusy] = useState(false);

  return (
    <div className="bg-paper-tint rounded-md p-3 border border-line space-y-3">
      <div>
        <label className="lulu-label">Data</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="lulu-input"
        />
      </div>
      <div>
        <label className="lulu-label">Janelas (vazio = fechado)</label>
        <JanelasEditor
          janelas={janelas}
          onSave={async (j) => {
            if (!data) {
              alert('Escolhe a data.');
              return;
            }
            setBusy(true);
            try {
              await onAdd(data, j);
              setData('');
              setJanelas([]);
            } finally {
              setBusy(false);
            }
          }}
        />
        {busy && <p className="text-xs text-ink-mute">Salvando…</p>}
      </div>
    </div>
  );
}
