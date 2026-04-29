import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
        
    // In a real app we'd verify the JWT user role first:
    // const { data: { user } } = await supabase.auth.getUser();
    
    const { session_id, hand_raise_id, target_account_id, rater_account_id, stars } = await request.json();

    if (!session_id || !target_account_id || !stars) {
      return NextResponse.json({ error: 'Missing required fields (session_id, target_account_id, stars)' }, { status: 400 });
    }
    
    if (stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Stars must be between 1 and 5' }, { status: 400 });
    }

    console.log(`[Rate API] Processing rating - Session: ${session_id}, Target: ${target_account_id}, Stars: ${stars}, Rater: ${rater_account_id}, HandRaiseId: ${hand_raise_id}`);

    // 驗證 rater_account_id 是否存在於 accounts 表
    let validRaterAccountId = rater_account_id;
    if (rater_account_id) {
      const { data: raterAccount, error: raterError } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', rater_account_id)
        .maybeSingle();

      if (raterError) {
        console.error('[Rate API] Error checking rater account:', raterError);
        return NextResponse.json({ error: `Failed to verify rater: ${raterError.message}` }, { status: 500 });
      }

      if (!raterAccount) {
        console.warn(`[Rate API] Rater account ${rater_account_id} not found in accounts table, will set rater_account_id to NULL`);
        validRaterAccountId = null;
      }
    }

    // Since rating spans across answering and hand_raises tables, let's use a transaction or serial await
    // 1. Create a dummy answer representing oral reply
    const { data: answerData, error: answerError } = await supabase
      .from('answers')
      .insert({
        session_id,
        account_id: target_account_id,
        content: '口頭回答 (Oral Response)'
      })
      .select('id')
      .single();

    if (answerError) {
      console.error('Error creating answer:', answerError);
      return NextResponse.json({ error: `Failed to create answer: ${answerError.message}` }, { status: 500 });
    }

    console.log(`[Rate API] Created answer record with ID: ${answerData.id}`);

    // 2. Insert the rating pointing to this new answer
    const answer_id = answerData.id;
    const { data: ratingData, error: ratingError } = await supabase
      .from('ratings')
      .insert({
        session_id,
        answer_id,
        rater_account_id: validRaterAccountId,
        star: stars,
        source: 'teacher'
      })
      .select()
      .single();

    if (ratingError) {
      console.error('Error creating rating:', ratingError);
      return NextResponse.json({ error: `Failed to create rating: ${ratingError.message}` }, { status: 500 });
    }

    console.log(`[Rate API] Created rating record: ${ratingData.id}`);

    // 3. Mark the student's hand as answered/picked if they were raising hand previously
    const { data: handsUpUpdate, error: handsUpError } = await supabase
      .from('hand_raises')
      .update({ status: 'A' }) // A = Answered / Picked (per spec)
      .eq('session_id', session_id)
      .eq('account_id', target_account_id)
      .eq('status', 'R')
      .select();

    if (handsUpError) {
      console.error('Error updating hand_raises:', handsUpError);
      // Don't fail the entire request if hand_raises update fails, as rating was already created
    } else {
      console.log(`[Rate API] Updated ${handsUpUpdate?.length || 0} hand_raises records to status 'A'`);
    }

    return NextResponse.json({ 
      message: 'Rated successfully', 
      rating: ratingData,
      answer_id: answer_id,
      hands_updated: handsUpUpdate?.length || 0
    }, { status: 201 });

  } catch (err: any) {
    console.error('[Rate API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
