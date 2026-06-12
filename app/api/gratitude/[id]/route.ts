import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { updateGratitudePost, deleteGratitudePost } from '@/lib/services/gratitude.service';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });

    const body = await request.json();
    const { content, role } = body;

    if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json({ ok: false, error: '無權限修改' }, { status: 403 });
    }

    if (!content?.trim()) {
      return NextResponse.json({ ok: false, error: 'content is required' }, { status: 400 });
    }

    await updateGratitudePost(supabase, id, { content: content.trim() });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('PATCH /api/gratitude/[id] error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });

    const url = new URL(request.url);
    const role = url.searchParams.get('role');

    if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json({ ok: false, error: '無權限刪除' }, { status: 403 });
    }

    await deleteGratitudePost(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('DELETE /api/gratitude/[id] error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
