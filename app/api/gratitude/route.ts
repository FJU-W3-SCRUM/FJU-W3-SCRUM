import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { getGratitudePostsByClass, createGratitudePost } from '@/lib/services/gratitude.service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get('class_id');

    if (!classId) {
      return NextResponse.json({ ok: false, error: 'class_id is required' }, { status: 400 });
    }

    const posts = await getGratitudePostsByClass(supabase, Number(classId));
    return NextResponse.json({ ok: true, data: posts });
  } catch (error: any) {
    console.error('GET /api/gratitude error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sender_account_id, recipient_account_id, content, class_id } = body;

    if (!sender_account_id || !recipient_account_id || !content?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'sender_account_id, recipient_account_id, content are required' },
        { status: 400 }
      );
    }

    const post = await createGratitudePost(supabase, {
      sender_account_id: Number(sender_account_id),
      recipient_account_id: Number(recipient_account_id),
      content: content.trim(),
      class_id: class_id ? Number(class_id) : undefined,
    });

    return NextResponse.json({ ok: true, data: post }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/gratitude error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
