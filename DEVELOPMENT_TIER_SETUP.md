# Development Tier Setup Guide

Since payment/subscription features aren't implemented yet, here are the ways to test different user tiers during development:

## Method 1: Environment Variable Override (Recommended)

Add this to your `.env.local` file:

```bash
# Set this to override user tier for ALL users during development
# Options: FREE, PREMIUM, PRO
DEV_USER_TIER_OVERRIDE=PRO
```

This will make all users appear as PRO tier users, allowing you to test all features.

**Examples:**
- `DEV_USER_TIER_OVERRIDE=FREE` - Test basic features only
- `DEV_USER_TIER_OVERRIDE=PREMIUM` - Test premium features
- `DEV_USER_TIER_OVERRIDE=PRO` - Test all pro features
- Leave empty or comment out to use normal tier detection

## Method 2: Settings Page Tier Switcher (Recommended for Individual Testing)

1. Go to `/settings` in your development environment
2. You'll see a "🧪 Development: Test Different Tiers" section
3. Click on any tier button to switch your user's tier
4. The page will refresh and all tier-dependent features will update

**Note:** This method stores your tier preference in a browser cookie, so it persists across browser sessions until the cookie expires (30 days) or you clear your cookies.

## Method 3: API Direct Call

You can also call the tier update API directly:

```javascript
// In browser console or your code
fetch('/api/user/tier', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tier: 'PRO' })
})
```

## How Tier Detection Works

The app checks for user tier in this order:

1. **Environment Override** - `DEV_USER_TIER_OVERRIDE` (development only, affects all users)
2. **Cookie Override** - Individual user tier stored in browser cookie (development only)
3. **User Metadata** - Stored in Supabase Auth user metadata
4. **Subscriptions Table** - Production subscription data (when available)
5. **Default** - Falls back to FREE tier

## Testing Different Features by Tier

### FREE Tier
- Basic AI responses (shorter, simpler)
- Limited quick actions
- Basic summaries
- 1 book limit (not enforced yet)

### PREMIUM Tier  
- Enhanced AI responses (longer, more detailed)
- More quick actions
- Advanced summaries
- 10 book limit (not enforced yet)
- Enhanced reading analytics

### PRO Tier
- Professional-grade AI responses (longest, most sophisticated)
- All quick actions available
- Professional summaries
- Unlimited books
- All study tools (flashcards, exports, quizzes)
- Knowledge maps and timeline features

## Troubleshooting

### "Subscriptions table not available" in logs
This is normal during development. The app will fall back to other tier detection methods.

### Tier not updating
1. Check your `.env.local` file for `DEV_USER_TIER_OVERRIDE`
2. Try refreshing the page after changing tier in settings
3. Check browser console for any errors

### Features still showing as locked
1. Verify your tier is actually updated by checking `/api/user/tier`
2. Some components might need a page refresh to update
3. Check that the component is properly checking the user tier

## Production Notes

- Environment override is disabled in production
- Settings page tier switcher is hidden in production  
- Only subscription-based tier detection works in production
- All development tier methods are safely disabled in production builds 