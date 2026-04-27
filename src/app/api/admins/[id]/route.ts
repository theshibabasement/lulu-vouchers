import { NextResponse } from 'next/server';
import { deleteAdmin, getAdmin, updateAdmin } from '@/lib/admins';
import { getCurrentAdmin } from '@/lib/session';

async function requireDona() {
  const cur = await getCurrentAdmin();
  if (!cur) return { res: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (cur.perfil !== 'dona') {
    return { res: NextResponse.json({ error: 'Apenas a dona pode gerenciar usuários.' }, { status: 403 }) };
  }
  return { admin: cur };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireDona();
  if ('res' in guard) return guard.res;
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  const admin = await getAdmin(idNum);
  if (!admin) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ admin });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireDona();
  if ('res' in guard) return guard.res;
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as
    | { nome?: string; senha?: string; perfil?: 'dona' | 'atendente'; ativo?: boolean }
    | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const admin = await updateAdmin(idNum, body);
    return NextResponse.json({ admin });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireDona();
  if ('res' in guard) return guard.res;
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  // Não deixa excluir a si mesma
  if (guard.admin.id === idNum) {
    return NextResponse.json({ error: 'Não pode excluir o próprio usuário.' }, { status: 400 });
  }
  try {
    await deleteAdmin(idNum);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
