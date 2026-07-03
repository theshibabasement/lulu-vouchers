'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { NovaVendaForm } from './NovaVendaForm';
import { NovaVendaOnlineForm } from './NovaVendaOnlineForm';
import { VendasList, type VendasFilter } from './VendasList';
import { PrintAreaVenda } from './PrintAreaVenda';
import { AvisarRetiradaModal } from './AvisarRetiradaModal';
import { formatCodigo, type GuiaVendaData } from './GuiaVenda';
import { ValesList } from './ValesList';
import { ValeDetail } from './ValeDetail';
import { ClientesList } from './ClientesList';
import { ClienteDetail } from './ClienteDetail';
import { AvaliacoesAdmin } from './AvaliacoesAdmin';
import { Dashboard } from './Dashboard';
import { AdminsList } from './AdminsList';
import { PrintArea } from './PrintArea';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { ToastStack, type ToastMsg } from './Toast';
import { playSuccessSound } from '@/lib/sound';
import type { Vale, ClienteComAgregados, Venda } from '@/lib/types';
import type { ReceiptData } from './Receipt';

interface Props {
  initialVales: Vale[];
  portalBase: string;
}

type View = 'nova' | 'vales' | 'vendas' | 'clientes' | 'avaliacoes' | 'painel' | 'usuarios';

interface MeAdmin {
  id: number;
  username: string;
  nome: string;
  perfil: 'dona' | 'atendente';
}
type PrintMode = 'ambas' | 'cliente' | 'loja';
type Filter = 'all' | 'active' | 'used' | 'deleted';

export function AppShell({ initialVales, portalBase }: Props) {
  const [view, setView] = useState<View>('nova');
  const [vales, setVales] = useState<Vale[]>(initialVales);
  const [clientes, setClientes] = useState<ClienteComAgregados[]>([]);
  const [valesFilter, setValesFilter] = useState<Filter>('all');
  const [clientesFilter, setClientesFilter] = useState<'all' | 'deleted'>('all');
  const [detail, setDetail] = useState<Vale | null>(null);
  const [clienteDetailId, setClienteDetailId] = useState<number | null>(null);
  const [print, setPrint] = useState<
    | { data: ReceiptData; mode: PrintMode; lote?: undefined }
    | { lote: ReceiptData[]; mode: PrintMode; data?: undefined }
    | null
  >(null);
  const [shareVale, setShareVale] = useState<Vale | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasFilter, setVendasFilter] = useState<VendasFilter>('aguardando');
  const [vendasSubview, setVendasSubview] = useState<'nova' | 'lista'>('nova');
  const [printVenda, setPrintVenda] = useState<GuiaVendaData | null>(null);
  const [avisarVenda, setAvisarVenda] = useState<Venda | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [me, setMe] = useState<MeAdmin | null>(null);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { admin?: MeAdmin } | null) => {
        if (j?.admin) setMe(j.admin);
      })
      .catch(() => {});
  }, []);

  const pushToast = useCallback(
    (msg: string, kind?: ToastMsg['kind'], code?: string) => {
      setToasts((cur) => [...cur, { id: Date.now() + Math.random(), msg, kind, code }]);
    },
    [],
  );
  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const refreshVales = useCallback(async (filter: Filter = valesFilter) => {
    try {
      const url = filter === 'deleted' ? '/api/vales?includeDeleted=1' : '/api/vales';
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { vales: Vale[] };
      setVales(j.vales);
    } catch {
      /* ignore */
    }
  }, [valesFilter]);

  const refreshClientes = useCallback(async (filter: 'all' | 'deleted' = clientesFilter) => {
    try {
      const url = filter === 'deleted' ? '/api/clientes?includeDeleted=1' : '/api/clientes';
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { clientes: ClienteComAgregados[] };
      setClientes(j.clientes);
    } catch {
      /* ignore */
    }
  }, [clientesFilter]);

  const refreshVendas = useCallback(async () => {
    try {
      const r = await fetch('/api/vendas?includeCanceladas=1', { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { vendas: Venda[] };
      setVendas(j.vendas);
    } catch {
      /* ignore */
    }
  }, []);

  const handleVendaCreated = useCallback(
    (venda: Venda) => {
      setVendas((cur) => [venda, ...cur]);
      setPrintVenda(vendaToGuia(venda));
      playSuccessSound();
      pushToast(`Pedido ${formatCodigo(venda.codigo)} registrado e enviado pra impressão`, 'success');
    },
    [pushToast],
  );

  const handleRetirar = useCallback(
    async (id: number) => {
      try {
        const r = await fetch(`/api/vendas/${id}/retirar`, { method: 'POST' });
        const j = (await r.json()) as { venda?: Venda; error?: string };
        if (!r.ok || !j.venda) throw new Error(j.error || 'Falha ao marcar retirada.');
        setVendas((cur) => cur.map((v) => (v.id === id ? j.venda! : v)));
        pushToast('Pedido marcado como retirado.', 'success');
      } catch (e) {
        pushToast((e as Error).message, 'error');
      }
    },
    [pushToast],
  );

  const handleCancelarVenda = useCallback(
    async (id: number) => {
      try {
        const r = await fetch(`/api/vendas/${id}`, { method: 'DELETE' });
        const j = (await r.json()) as { venda?: Venda; error?: string };
        if (!r.ok || !j.venda) throw new Error(j.error || 'Falha ao cancelar.');
        setVendas((cur) => cur.map((v) => (v.id === id ? j.venda! : v)));
        pushToast('Venda cancelada.', 'success');
      } catch (e) {
        pushToast((e as Error).message, 'error');
      }
    },
    [pushToast],
  );

  useEffect(() => {
    if (detail) {
      const fresh = vales.find((v) => v.id === detail.id);
      if (fresh && fresh !== detail) setDetail(fresh);
    }
  }, [vales, detail]);

  useEffect(() => {
    document.body.style.overflow = detail || clienteDetailId !== null ? 'hidden' : '';
  }, [detail, clienteDetailId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detail) setDetail(null);
        else if (clienteDetailId !== null) setClienteDetailId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, clienteDetailId]);

  const handleCreated = useCallback(
    (vale: Vale, mode: PrintMode) => {
      setVales((cur) => [vale, ...cur]);
      setPrint({ data: vale, mode });
      // Guarda pra abrir o modal de WhatsApp depois do afterprint
      setShareVale(vale);
      playSuccessSound();
      pushToast('Vale criado e enviado para impressão', 'success', vale.id);
    },
    [pushToast],
  );

  async function handleAbater(id: string, valor: number, obs: string) {
    try {
      const r = await fetch(`/api/vales/${id}/abater`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ valor, obs }),
      });
      const j = (await r.json()) as { vale?: Vale; error?: string };
      if (!r.ok || !j.vale) throw new Error(j.error || 'Falha ao abater.');
      setVales((cur) => cur.map((v) => (v.id === j.vale!.id ? j.vale! : v)));
      setDetail(j.vale);
      playSuccessSound();
      pushToast(`Descontado. Saldo: R$ ${j.vale.saldo.toFixed(2).replace('.', ',')}`, 'success');
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }

  async function handleDeleteVale(id: string) {
    try {
      const r = await fetch(`/api/vales/${id}`, { method: 'DELETE' });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao excluir.');
      setDetail(null);
      pushToast('Vale excluído.', 'success', id);
      refreshVales();
      refreshClientes();
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }

  function openDetail(id: string) {
    const v = vales.find((x) => x.id === id);
    if (v) {
      setDetail(v);
      setClienteDetailId(null);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  const switchView = (v: View) => {
    setView(v);
    if (v === 'vales') refreshVales();
    if (v === 'clientes') refreshClientes();
    if (v === 'vendas') refreshVendas();
  };

  return (
    <div className="app-shell max-w-[1180px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16 overflow-x-clip">
      <header className="flex items-center justify-between flex-wrap gap-3 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-[3px] border-ink shadow-sticker shrink-0">
            <Image
              src="/lulu-logo.jpg"
              alt="Lulu Arteira"
              fill
              sizes="48px"
              priority
              className="object-cover"
            />
          </div>
          <div>
            <div className="font-display text-3xl text-lulu-purple leading-none">
              Lulu Arteira
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-lulu-magenta mt-1">
              Brechó Infantil
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {me ? (
            <span className="text-xs text-ink-soft tracking-wide hidden sm:inline">
              {me.nome} <span className="text-ink-mute">·</span>{' '}
              <span className="uppercase tracking-wider font-bold">{me.perfil}</span>
            </span>
          ) : (
            <span className="text-xs text-ink-soft tracking-wide hidden sm:inline">
              Sistema de vales 🩷
            </span>
          )}
          <button
            onClick={logout}
            className="text-xs font-bold uppercase tracking-wider text-ink-soft hover:text-lulu-magenta transition px-3 py-1.5 rounded-full border-2 border-line hover:border-lulu-magenta"
          >
            Sair
          </button>
        </div>
      </header>

      <nav className="flex border-b-2 border-line mb-7 overflow-x-auto">
        <TabBtn active={view === 'nova'} onClick={() => switchView('nova')}>
          Nova troca
        </TabBtn>
        <TabBtn active={view === 'vales'} onClick={() => switchView('vales')}>
          Consultar vales
          <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-lulu-purple-soft text-lulu-purple">
            {vales.filter((v) => !v.deletadoEm).length}
          </span>
        </TabBtn>
        <TabBtn active={view === 'vendas'} onClick={() => switchView('vendas')}>
          Vendas online
          <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-lulu-magenta-soft text-lulu-magenta">
            {vendas.filter((v) => v.status === 'aguardando').length}
          </span>
        </TabBtn>
        <TabBtn active={view === 'clientes'} onClick={() => switchView('clientes')}>
          Clientes
          <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-lulu-cyan-soft text-lulu-cyan">
            {clientes.length}
          </span>
        </TabBtn>
        <TabBtn active={view === 'avaliacoes'} onClick={() => switchView('avaliacoes')}>
          Avaliações
        </TabBtn>
        <TabBtn active={view === 'painel'} onClick={() => switchView('painel')}>
          Painel
        </TabBtn>
        {me?.perfil === 'dona' && (
          <TabBtn active={view === 'usuarios'} onClick={() => switchView('usuarios')}>
            Usuários
          </TabBtn>
        )}
      </nav>

      {view === 'nova' && (
        <NovaVendaForm
          onCreated={handleCreated}
          onError={(m) => pushToast(m, 'error')}
          portalBase={portalBase}
          recentes={vales}
          onOpenVale={openDetail}
          onVerTodos={() => switchView('vales')}
        />
      )}

      {view === 'vales' && (
        <ValesList
          vales={vales}
          onOpen={openDetail}
          onPrintLote={(list) => {
            setPrint({ lote: list, mode: 'ambas' });
          }}
          filter={valesFilter}
          onFilterChange={(f) => {
            setValesFilter(f);
            refreshVales(f);
          }}
        />
      )}

      {view === 'vendas' && (
        <div className="min-w-0">
          <div className="flex gap-1.5 mb-6">
            <button
              onClick={() => setVendasSubview('nova')}
              className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition ${
                vendasSubview === 'nova'
                  ? 'bg-lulu-magenta text-white border-lulu-magenta'
                  : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
              }`}
            >
              + Nova venda
            </button>
            <button
              onClick={() => {
                setVendasSubview('lista');
                refreshVendas();
              }}
              className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition ${
                vendasSubview === 'lista'
                  ? 'bg-lulu-magenta text-white border-lulu-magenta'
                  : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
              }`}
            >
              Pedidos
              <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/25">
                {vendas.filter((v) => v.status === 'aguardando').length}
              </span>
            </button>
          </div>

          {vendasSubview === 'nova' ? (
            <NovaVendaOnlineForm
              onCreated={handleVendaCreated}
              onError={(m) => pushToast(m, 'error')}
              recentes={vendas}
              onOpenVenda={() => setVendasSubview('lista')}
              onVerTodas={() => setVendasSubview('lista')}
            />
          ) : (
            <VendasList
              vendas={vendas}
              filter={vendasFilter}
              onFilterChange={setVendasFilter}
              onRetirar={handleRetirar}
              onCancelar={handleCancelarVenda}
              onReimprimir={(v) => setPrintVenda(vendaToGuia(v))}
              onAvisar={(v) => setAvisarVenda(v)}
            />
          )}
        </div>
      )}

      {view === 'clientes' && (
        <ClientesList
          clientes={clientes}
          onOpen={(id) => setClienteDetailId(id)}
          filter={clientesFilter}
          onFilterChange={(f) => {
            setClientesFilter(f);
            refreshClientes(f);
          }}
        />
      )}

      {view === 'avaliacoes' && (
        <AvaliacoesAdmin onToast={(m, k) => pushToast(m, k)} />
      )}

      {view === 'painel' && (
        <Dashboard onOpenCliente={(id) => setClienteDetailId(id)} />
      )}

      {view === 'usuarios' && me?.perfil === 'dona' && (
        <AdminsList selfId={me.id} onToast={(m, k) => pushToast(m, k)} />
      )}

      <ValeDetail
        vale={detail}
        onClose={() => setDetail(null)}
        onAbater={handleAbater}
        onReprint={(v) => setPrint({ data: v, mode: 'ambas' })}
        onDelete={handleDeleteVale}
      />

      <ClienteDetail
        clienteId={clienteDetailId}
        portalBase={portalBase}
        onClose={() => setClienteDetailId(null)}
        onChanged={() => refreshClientes()}
        onOpenVale={(id) => {
          setClienteDetailId(null);
          // garante que vales atualizados
          (async () => {
            await refreshVales();
            setView('vales');
            const v = vales.find((x) => x.id === id);
            if (v) setDetail(v);
            else {
              const r = await fetch(`/api/vales/${id}`);
              const j = (await r.json()) as { vale?: Vale };
              if (j.vale) setDetail(j.vale);
            }
          })();
        }}
      />

      <PrintArea
        data={print && 'data' in print && print.data ? print.data : null}
        lote={print && 'lote' in print && print.lote ? print.lote : undefined}
        mode={print?.mode ?? null}
        portalBase={portalBase}
        onAfterPrint={() => setPrint(null)}
      />

      <PrintAreaVenda data={printVenda} onAfterPrint={() => setPrintVenda(null)} />

      <AvisarRetiradaModal
        venda={avisarVenda}
        portalBase={portalBase}
        onClose={() => setAvisarVenda(null)}
        onWhatsappSaved={() => refreshVendas()}
      />

      <WhatsAppShareModal
        vale={shareVale}
        portalBase={portalBase}
        onClose={() => setShareVale(null)}
        onWhatsappSaved={() => {
          refreshClientes();
          refreshVales();
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-0 mr-7 py-3 font-display font-bold text-sm border-b-[3px] transition whitespace-nowrap ${
        active
          ? 'text-lulu-magenta border-lulu-magenta'
          : 'text-ink-soft border-transparent hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function vendaToGuia(v: Venda): GuiaVendaData {
  return {
    codigo: v.codigo,
    nome: v.nome,
    cpf: v.cpf,
    whatsapp: v.whatsapp,
    instagram: v.instagram,
    valor: v.valor,
    criadoEm: v.criadoEm,
    prazoRetirada: v.prazoRetirada,
    observacoes: v.observacoes,
  };
}
