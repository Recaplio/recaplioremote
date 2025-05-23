'use client';

import Link from 'next/link';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">Profile</h2>
            <p className="text-gray-700">Manage your profile information (Not implemented yet).</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">Preferences</h2>
            <p className="text-gray-700">Set your reading preferences (Not implemented yet).</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">Subscription</h2>
            <p className="text-gray-700 mb-2">Manage your subscription plan.</p>
            <Link href="/plans">
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm transition-colors">
                  View Plans & Upgrade
              </button>
            </Link>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
} 