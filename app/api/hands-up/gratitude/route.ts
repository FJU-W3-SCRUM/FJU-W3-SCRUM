import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

const MAX_MESSAGE_LENGTH = 200;
type StudentParticipant = { id: number; name: string; role: string };

export async function POST(request: Request) {
  try {
    const { session_id, sender_account_id, recipient_account_id, message } = await request.json();
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    const senderId = Number(sender_account_id);
    const recipientId = Number(recipient_account_id);

    if (!session_id || !sender_account_id || !recipient_account_id || !trimmedMessage) {
      return NextResponse.json(
        { error: '投稿失敗：感謝卡必須具名，且需包含投稿者、受助者與內容。' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(senderId) || !Number.isFinite(recipientId)) {
      return NextResponse.json({ error: '投稿失敗：投稿者或受助者資料格式錯誤。' }, { status: 400 });
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `投稿失敗：內容不可超過 ${MAX_MESSAGE_LENGTH} 字。` },
        { status: 400 }
      );
    }

    const { data: sessionInfo, error: sessionError } = await supabase
      .from('sessions')
      .select('id, class_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionInfo?.class_id) {
      return NextResponse.json({ error: '投稿失敗：找不到課堂資料。' }, { status: 404 });
    }

    const { data: participants, error: participantsError } = await supabase
      .from('accounts')
      .select('id, name, role')
      .eq('class_id', sessionInfo.class_id)
      .in('id', [senderId, recipientId]);

    if (participantsError) {
      return NextResponse.json({ error: participantsError.message }, { status: 500 });
    }

    const sender = (participants as StudentParticipant[] | null)?.find((p) => p.id === senderId);
    const recipient = (participants as StudentParticipant[] | null)?.find((p) => p.id === recipientId);

    if (!sender || !recipient || sender.role !== 'student' || recipient.role !== 'student') {
      return NextResponse.json(
        { error: '投稿失敗：感謝卡僅限同班學生間具名發送。' },
        { status: 400 }
      );
    }

    const { data: insertedCard, error: insertError } = await supabase
      .from('gratitude_cards')
      .insert({
        session_id,
        sender_account_id: senderId,
        recipient_account_id: recipientId,
        message: trimmedMessage
      })
      .select('id, session_id, sender_account_id, recipient_account_id, message, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        card: {
          ...insertedCard,
          sender_name: sender.name,
          recipient_name: recipient.name
        }
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '投稿失敗' },
      { status: 500 }
    );
  }
}
