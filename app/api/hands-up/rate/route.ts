import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
        
    // In a real app we'd verify the JWT user role first:
    // const { data: { user } } = await supabase.auth.getUser();
    
    const { session_id, target_account_id, rater_account_id, stars } = await request.json();

    if (!session_id || !target_account_id || !rater_account_id || !stars) {
      return NextResponse.json({ error: 'Missing required fields (session_id, target_account_id, rater_account_id, stars)' }, { status: 400 });
    }
    
    if (stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Stars must be between 1 and 5' }, { status: 400 });
    }

    // Since rating spans across answering and hand_raises tables, let's use a transaction or serial await
    // 1. Create a dummy answer representing oral reply
    const { data: answerData, error: answerError } = await supabase
      .from('answers')
      .insert({
        session_id,
        account_id: target_account_id,
        content: '口頭回答 (Oral Response)' // Pre-filled text denoting standard spoken answer
      })
      .select('id')
      .single();

    if (answerError) {
      return NextResponse.json({ error: answerError.message }, { status: 500 });
    }

    // 2. Insert the rating pointing to this new answer
    const answer_id = answerData.id;
    const { data: ratingData, error: ratingError } = await supabase
      .from('ratings')
      .insert({
        session_id,
        answer_id,
        rater_account_id,
        star: stars,
        source: 'group_representative'
      })
      .select()
      .single();

    if (ratingError) {
      return NextResponse.json({ error: ratingError.message }, { status: 500 });
    }

    // 3. Mark the student's hand lower/answered if they were raising hand previously
    const { data: handsUpUpdate, error: handsUpError } = await supabase
      .from('hand_raises')
      .update({ status: 'Y' }) // Get picked
      .eq('session_id', session_id)
      .eq('account_id', target_account_id)
      .eq('status', 'R')
      .select();

    return NextResponse.json({ message: 'Rated successfully', rating: ratingData }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
