'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';

type UserTier = 'FREE' | 'PREMIUM' | 'PRO';

export default function SettingsPage() {
  const [currentTier, setCurrentTier] = useState<UserTier>('FREE');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(false);

  useEffect(() => {
    fetchCurrentTier();
    // Check if we're in development by checking hostname
    setIsDevelopment(
      typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    );
  }, []);

  const fetchCurrentTier = async () => {
    try {
      const response = await fetch('/api/user/tier');
      if (response.ok) {
        const data = await response.json();
        setCurrentTier(data.tier);
      }
    } catch (error) {
      console.error('Error fetching user tier:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTier = async (newTier: UserTier) => {
    if (!isDevelopment) {
      alert('Tier updates are only available in development mode');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/user/tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: newTier }),
      });

      if (response.ok) {
        setCurrentTier(newTier);
        // Refresh the page to update all tier-dependent UI
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to update tier: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating tier:', error);
      alert('Failed to update tier');
    } finally {
      setUpdating(false);
    }
  };

  const getTierColor = (tier: UserTier) => {
    switch (tier) {
      case 'PRO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PREMIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <ProtectedRoute>
      <div>
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="space-y-8">
          
          {/* Current Tier Display */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Current Plan</h2>
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
            ) : (
              <div className="flex items-center space-x-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(currentTier)}`}>
                  {currentTier} Plan
                </span>
                <span className="text-gray-600">
                  {currentTier === 'FREE' && 'Basic features with AI assistance'}
                  {currentTier === 'PREMIUM' && 'Enhanced features with advanced AI'}
                  {currentTier === 'PRO' && 'All features with professional-grade AI'}
                </span>
              </div>
            )}
            <Link href="/plans">
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm transition-colors">
                View Plans & Upgrade
              </button>
            </Link>
          </section>

          {/* Development Tier Testing */}
          {isDevelopment && (
            <section className="border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50">
              <h2 className="text-xl font-semibold mb-3 text-orange-800">
                🧪 Development: Test Different Tiers
              </h2>
              <p className="text-orange-700 mb-4 text-sm">
                This section is only available in development mode. Use it to test how the app behaves with different subscription tiers.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['FREE', 'PREMIUM', 'PRO'] as UserTier[]).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => updateTier(tier)}
                    disabled={updating || currentTier === tier}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      currentTier === tier
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : 'border-gray-300 bg-white hover:border-indigo-500 hover:bg-indigo-50'
                    } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-semibold">{tier}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {tier === 'FREE' && 'Test basic features'}
                      {tier === 'PREMIUM' && 'Test premium features'}
                      {tier === 'PRO' && 'Test all pro features'}
                    </div>
                    {currentTier === tier && (
                      <div className="text-xs text-green-600 mt-2 font-medium">
                        ✓ Currently Active
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              {updating && (
                <div className="mt-4 text-center text-orange-700">
                  <div className="inline-flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-700 mr-2"></div>
                    Updating tier...
                  </div>
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold mb-3">Profile</h2>
            <p className="text-gray-700">Manage your profile information (Not implemented yet).</p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">Preferences</h2>
            <p className="text-gray-700">Set your reading preferences (Not implemented yet).</p>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
} 