import { NextResponse } from 'next/server';
import { createAdmin, listAdmins } from '@/lib/admins';
import { getCurrentAdmin } from '@/lib/session';

async function requireDona() {
  const cur = await getCurrentAdmin();
  if (!cur) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (cur.perfil !== 'dona') {
    return NextResponse.json({ error: 'Apenas a dona pode gerenciar usuários.' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const guard = await requireDona();
  if (guard) return guard;
  const admins = await listAdmins();
  return NextResponse.json({ admins });
}

export async function POST(req: Request) {
  const guard = await requireDona();
  if (guard) return guard;
  const body = (await req.json().catch(() => null)) as
    | { username?: string; nome?: string; senha?: string; perfil?: 'dona' | 'atendente' }
    | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const admin = await createAdmin({
      username: body.username ?? '',
      nome: body.nome ?? '',
      senha: body.senha ?? '',
      perfil: body.perfil ?? 'atendente',
    });
    return NextResponse.json({ admin }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
