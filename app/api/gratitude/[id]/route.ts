import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

function parseUser(request: NextRequest) {
  const cookieValue = request.cookies.get('ch_user')?.value;
  if (!cookieValue) return null;
  try {
    return JSON.parse(decodeURIComponent(cookieValue));
  } catch {
    return null;
  }
}

function isAdminUser(request: NextRequest) {
  const user = parseUser(request);
  return user?.role === 'admin';
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAdminUser(request)) {
    return NextResponse.json({ ok: false, error: '無權限' }, { status: 403 });
  }

  const params = await context.params;
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: '無效的讚賞卡 ID' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json({ ok: false, error: '感謝內容不得為空' }, { status: 400 });
    }
    if (content.length > 200) {
      return NextResponse.json({ ok: false, error: '感謝內容不得超過 200 字' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('gratitude_cards')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, post: data });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) || '伺服器錯誤' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAdminUser(request)) {
    return NextResponse.json({ ok: false, error: '無權限' }, { status: 403 });
  }

  const params = await context.params;
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: '無效的讚賞卡 ID' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('gratitude_cards')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: data });
}
