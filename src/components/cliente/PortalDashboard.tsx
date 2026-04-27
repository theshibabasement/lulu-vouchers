'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatBRL, formatDate, formatDateTime } from '@/lib/format';
import type { Avaliacao, Cliente, Vale } from '@/lib/types';
import { ValeCard } from './ValeCard';
import { ValeFullView } from './ValeFullView';
import { CadastrarSenhaForm } from './CadastrarSenhaForm';

interface Props {
  cliente: Cliente;
  vales: Vale[];
  avaliacoes: Avaliacao[];
  portalBase: string;
}

export function PortalDashboard({ cliente, vales, avaliacoes, portalBase }: Props) {
  const [openVale, setOpenVale] = useState<Vale | null>(null);
  const [showSenha, setShowSenha] = useState(false);

  const totalSaldo = vales.reduce((s, v) => s + v.saldo, 0);
  const totalEmitido = vales.reduce((s, v) => s + v.valorOriginal, 0);
  const ativos = vales.filter((v) => v.saldo > 0);

  const proximaAvaliacao = avaliacoes
    .filter((a) => a.status !== 'cancelada' && a.status !== 'realizada' && new Date(a.dataHora).getTime() > Date.now() - 1000 * 60 * 60)
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())[0];

  async function logout() {
    await fetch('/api/cliente/auth/logout', { method: 'POST' });
    window.location.href = '/cliente';
  }

  if (openVale) {
    return (
      <ValeFullView
        vale={openVale}
        portalBase={portalBase}
        onBack={() => setOpenVale(null)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-paper-sparkle pb-24">
      <header className="bg-paper border-b-2 border-line sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-ink shrink-0">
            <Image src="/lulu-logo.jpg" alt="Lulu" fill sizes="40px" className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg text-lulu-purple leading-none truncate">
              Oi, {cliente.nome.split(' ')[0]} 🩷
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-mute mt-0.5">
              Lulu Arteira · Brechó Infantil
            </div>
          </div>
          <button
            onClick={logout}
            className="text-[11px] font-bold uppercase tracking-wider text-ink-soft hover:text-lulu-magenta transition px-3 py-1.5 rounded-full border-2 border-line"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Saldo grande */}
        <div className="rounded-xl p-6 bg-gradient-to-br from-lulu-magenta to-lulu-purple text-white shadow-lg">
          <div className="text-xs uppercase tracking-[0.18em] opacity-80">
            Teu crédito disponível
          </div>
          <div className="font-display text-5xl font-extrabold my-2">
            {formatBRL(totalSaldo)}
          </div>
          <div className="text-sm opacity-90 flex justify-between">
            <span>Emitido: {formatBRL(totalEmitido)}</span>
            <span>{ativos.length} ativo{ativos.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Cadastrar senha */}
        {!cliente.temSenha && !showSenha && (
          <button
            onClick={() => setShowSenha(true)}
            className="w-full p-4 rounded-lg bg-lulu-yellow border-[3px] border-ink shadow-sticker text-left hover:translate-y-[-1px] transition"
          >
            <div className="font-display font-bold text-base text-ink">
              Criar uma senha 🔒
            </div>
            <div className="text-sm text-ink-soft mt-1">
              Pra acessar de qualquer celular sem precisar do recibo.
            </div>
          </button>
        )}

        {showSenha && (
          <CadastrarSenhaForm onDone={() => { setShowSenha(false); window.location.reload(); }} onCancel={() => setShowSenha(false)} />
        )}

        {/* Próxima avaliação */}
        {proximaAvaliacao && (
          <div className="rounded-lg p-4 bg-paper border-2 border-lulu-cyan-soft">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-lulu-cyan mb-1">
              Próxima avaliação
            </div>
            <div className="font-display text-lg font-bold text-ink">
              {formatDateTime(proximaAvaliacao.dataHora)}
            </div>
            <div className="text-sm text-ink-soft">
              Status: <b>{labelStatus(proximaAvaliacao.status)}</b>
            </div>
          </div>
        )}

        {/* Botões ação */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/agendar"
            className="lulu-btn-primary text-center"
          >
            Agendar avaliação
          </Link>
          <a
            href="https://wa.me/" // Placeholder — ideal é usar telefone configurável da loja
            target="_blank"
            rel="noreferrer"
            className="lulu-btn-secondary text-center"
          >
            Falar pelo WhatsApp
          </a>
        </div>

        {/* Vales */}
        <section>
          <h2 className="font-display text-2xl text-lulu-purple mb-3">
            Teus vales ({vales.length})
          </h2>
          {vales.length === 0 ? (
            <div className="bg-paper rounded-lg p-6 border-2 border-line text-center text-ink-soft">
              Você ainda não tem vales registrados.
            </div>
          ) : (
            <div className="space-y-3">
              {vales.map((v) => (
                <ValeCard key={v.id} vale={v} onOpen={() => setOpenVale(v)} />
              ))}
            </div>
          )}
        </section>

        {/* Avaliações histórico */}
        {avaliacoes.length > 0 && (
          <section>
            <h2 className="font-display text-2xl text-lulu-purple mb-3">
              Avaliações
            </h2>
            <div className="space-y-2">
              {avaliacoes.map((a) => (
                <div key={a.id} className="bg-paper rounded-md p-4 border-2 border-line">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-ink">{formatDate(a.dataHora)}</div>
                      <div className="text-xs text-ink-soft">
                        {formatDateTime(a.dataHora).split(' ')[1]} · {a.qtdPecas ? `${a.qtdPecas} peças` : 'sem qtd.'}
                      </div>
                    </div>
                    <span className={`lulu-pill ${pillTone(a.status)}`}>
                      {labelStatus(a.status)}
                    </span>
                  </div>
                  {a.tamanhos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {a.tamanhos.map((t) => (
                        <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded bg-paper-tint border border-line">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function labelStatus(s: Avaliacao['status']): string {
  switch (s) {
    case 'pendente': return 'aguardando confirmação';
    case 'confirmada': return 'confirmada';
    case 'realizada': return 'realizada';
    case 'cancelada': return 'cancelada';
    case 'no_show': return 'não compareceu';
  }
}

function pillTone(s: Avaliacao['status']): string {
  switch (s) {
    case 'pendente': return 'bg-lulu-yellow text-ink';
    case 'confirmada': return 'bg-lulu-mint text-ink';
    case 'realizada': return 'bg-lulu-purple-soft text-lulu-purple';
    case 'cancelada':
    case 'no_show': return 'bg-lulu-cheek-pink text-lulu-heart-red';
  }
}
