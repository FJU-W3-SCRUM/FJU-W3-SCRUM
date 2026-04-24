import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { session_id, account_id } = await request.json();

    if (!session_id || !account_id) {
      return NextResponse.json({ error: 'Missing session_id or account_id' }, { status: 400 });
    }

    // Check if the student already has a raised hand ('R') for this session
    const { data: existing, error: checkError } = await supabase
      .from('hand_raises')
      .select('id')
      .eq('session_id', session_id)
      .eq('account_id', account_id)
      .eq('status', 'R')
      .maybeSingle();

    if (checkError) {
       return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ message: 'Hand is already raised', ok: true }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('hand_raises')
      .insert({
        session_id,
        account_id,
        status: 'R' // Raise hand
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...data, ok: true }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE or PUT down hand
export async function DELETE(request: Request) {
    try {
      const url = new URL(request.url);
      const session_id = url.searchParams.get('session_id');
      const account_id = url.searchParams.get('account_id');
  
      if (!session_id || !account_id) {
        return NextResponse.json({ error: 'Missing session_id or account_id parameter' }, { status: 400 });
      }
  
      // Update status to 'P' (Put down hand)
      const { data, error } = await supabase
        .from('hand_raises')
        .update({ status: 'P' })
        .eq('session_id', session_id)
        .eq('account_id', account_id)
        .eq('status', 'R')
        .select();
  
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
  
      return NextResponse.json({ message: 'Hand raise put down (P)', ok: true }, { status: 200 });
  
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
