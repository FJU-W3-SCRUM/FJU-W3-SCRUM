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

export async function GET(request: NextRequest) {
  try {
    const currentUser = parseUser(request);
    if (!currentUser) {
      return NextResponse.json({ ok: false, error: '未授權' }, { status: 401 });
    }

    const { data: senderAccount, error: senderError } = await supabaseAdmin
      .from('accounts')
      .select('class_id')
      .eq('id', Number(currentUser.id))
      .maybeSingle();

    if (senderError) {
      return NextResponse.json({ ok: false, error: senderError.message }, { status: 500 });
    }

    const classFilter = senderAccount?.class_id ? Number(senderAccount.class_id) : null;

    let recipientsQuery = supabaseAdmin
      .from('accounts')
      .select('id,name,student_no')
      .neq('id', Number(currentUser.id))
      .order('name', { ascending: true });

    if (classFilter) {
      recipientsQuery = recipientsQuery.eq('class_id', classFilter);
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery;

    if (recipientsError) {
      return NextResponse.json({ ok: false, error: recipientsError.message }, { status: 500 });
    }

    type Recipient = { id: number; name: string; student_no: string };
    const recipientRows = (recipients || []) as Recipient[];
    const recipientList = recipientRows.map((item) => ({ id: item.id, name: item.name, student_no: item.student_no }));

    const { data: rawPosts, error: postsError } = await supabaseAdmin
      .from('gratitude_cards')
      .select('id, content, created_at, sender_account_id (id, name, student_no), recipient_account_id (id, name, student_no)')
      .order('created_at', { ascending: false });

    if (postsError) {
      return NextResponse.json({ ok: false, error: postsError.message }, { status: 500 });
    }

    type GratitudePost = {
      id: number;
      content: string;
      created_at: string;
      sender_account_id?: { name?: string; student_no?: string } | null;
      recipient_account_id?: { name?: string; student_no?: string } | null;
    };
    const rawPostRows = (rawPosts || []) as GratitudePost[];
    const filteredPosts = rawPostRows.map((post) => ({
      id: post.id,
      content: post.content,
      created_at: post.created_at,
      sender_name: post.sender_account_id?.name,
      recipient_name: post.recipient_account_id?.name,
    }));

    return NextResponse.json({
      ok: true,
      posts: filteredPosts,
      recipients: recipientList,
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) || '伺服器錯誤' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const currentUser = parseUser(request);
  if (!currentUser) {
    return NextResponse.json({ ok: false, error: '未授權' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const recipientId = Number(body.recipient_id);
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!recipientId) {
      return NextResponse.json({ ok: false, error: '請選擇感謝者' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ ok: false, error: '感謝內容不得為空' }, { status: 400 });
    }
    if (content.length > 200) {
      return NextResponse.json({ ok: false, error: '感謝內容不得超過 200 字' }, { status: 400 });
    }
    if (Number(currentUser.id) === recipientId) {
      return NextResponse.json({ ok: false, error: '不可發送讚賞卡給自己' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('gratitude_cards')
      .insert([{ sender_account_id: Number(currentUser.id), recipient_account_id: recipientId, content }])
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
