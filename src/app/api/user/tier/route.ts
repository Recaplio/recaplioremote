import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return a default tier since we don't have Stripe integration yet
    // In production, this would check the user's subscription status
    return NextResponse.json({ 
      tier: 'FREE',
      userId: user.id 
    });

  } catch (error) {
    console.error('Error fetching user tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 