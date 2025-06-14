import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let tier: 'FREE' | 'PREMIUM' | 'PRO' = 'FREE';

    // Development override - check environment variable first
    const devTierOverride = process.env.DEV_USER_TIER_OVERRIDE;
    if (devTierOverride && ['FREE', 'PREMIUM', 'PRO'].includes(devTierOverride)) {
      tier = devTierOverride as 'FREE' | 'PREMIUM' | 'PRO';
      return NextResponse.json({ 
        tier,
        source: 'development_override',
        message: `Using development tier override: ${tier}`
      });
    }

    // Check for development tier override in cookies (for individual user testing)
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      const cookieStore = await cookies();
      const devTierCookie = cookieStore.get('dev_user_tier');
      
      if (devTierCookie && ['FREE', 'PREMIUM', 'PRO'].includes(devTierCookie.value)) {
        tier = devTierCookie.value as 'FREE' | 'PREMIUM' | 'PRO';
        return NextResponse.json({ 
          tier,
          source: 'dev_cookie',
          message: `Using development tier from cookie: ${tier}`
        });
      }
    }

    // Try to check user metadata for tier (fallback for development)
    const userMetadata = user.user_metadata || {};
    if (userMetadata.tier && ['FREE', 'PREMIUM', 'PRO'].includes(userMetadata.tier)) {
      tier = userMetadata.tier as 'FREE' | 'PREMIUM' | 'PRO';
      return NextResponse.json({ 
        tier,
        source: 'user_metadata',
        message: `Using tier from user metadata: ${tier}`
      });
    }

    // Try to check for active subscription (production)
    try {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!subError && subscription) {
        switch (subscription.plan_id) {
          case 'premium':
            tier = 'PREMIUM';
            break;
          case 'pro':
            tier = 'PRO';
            break;
          default:
            tier = 'FREE';
        }
        return NextResponse.json({ 
          tier,
          source: 'subscription',
          message: `Using tier from subscription: ${tier}`
        });
      }
    } catch {
      console.log('Subscriptions table not available, using fallback tier detection');
    }

    // Default to FREE tier
    return NextResponse.json({ 
      tier: 'FREE',
      source: 'default',
      message: 'Using default FREE tier (no subscription found)'
    }, { status: 200 }); // Still return 200 with FREE tier

  } catch (error) {
    console.error('Error determining user tier:', error);
    return NextResponse.json({ 
      tier: 'FREE',
      source: 'error_fallback',
      message: 'Error occurred, defaulting to FREE tier'
    }, { status: 200 }); // Still return 200 with FREE tier
  }
}

// POST endpoint to update user tier (development only)
export async function POST(request: Request) {
  try {
    // Only allow in development
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
      return NextResponse.json({ error: 'Tier updates not allowed in production' }, { status: 403 });
    }

    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await request.json();
    
    if (!tier || !['FREE', 'PREMIUM', 'PRO'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be FREE, PREMIUM, or PRO' }, { status: 400 });
    }

    // Create response with cookie
    const response = NextResponse.json({ 
      success: true,
      tier,
      message: `User tier updated to ${tier}`
    });

    // Set development tier cookie (expires in 30 days)
    response.cookies.set('dev_user_tier', tier, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;

  } catch (error) {
    console.error('Error updating user tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 