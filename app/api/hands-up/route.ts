import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
        const { session_id, account_id } = await request.json();

    if (!session_id || !account_id) {
      return NextResponse.json({ error: 'Missing session_id or account_id' }, { status: 400 });
    }

    // Check if the student already has a pending hand raise for this session
    const { data: existing, error: checkError } = await supabase
      .from('hand_raises')
      .select('id')
      .eq('session_id', session_id)
      .eq('account_id', account_id)
      .eq('status', 'pending')
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
       return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ message: 'Hand is already raised' }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('hand_raises')
      .insert({
        session_id,
        account_id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
            const url = new URL(request.url);
      const session_id = url.searchParams.get('session_id');
      const account_id = url.searchParams.get('account_id');
  
      if (!session_id || !account_id) {
        return NextResponse.json({ error: 'Missing session_id or account_id parameter' }, { status: 400 });
      }
  
      // Update status to 'cleared' rather than deleting the row
      const { data, error } = await supabase
        .from('hand_raises')
        .update({ status: 'cleared' })
        .eq('session_id', session_id)
        .eq('account_id', account_id)
        .eq('status', 'pending')
        .select();
  
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
  
      return NextResponse.json({ message: 'Hand raise cleared' }, { status: 200 });
  
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }