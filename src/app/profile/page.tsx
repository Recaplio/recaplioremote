'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthProvider';

// Helper function to format dates
const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export default function ProfilePage() {
  const { session, userProfile, isLoading, supabase } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editableFullName, setEditableFullName] = useState(userProfile?.full_name || '');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      console.log('[ProfilePage] No session, redirecting to login.');
      router.replace('/login');
    }
  }, [session, isLoading, router]);

  // Update editableFullName when userProfile changes and not in edit mode
  useEffect(() => {
    if (userProfile && !isEditing) {
      setEditableFullName(userProfile.full_name || '');
    }
  }, [userProfile, isEditing]);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditableFullName(userProfile?.full_name || ''); // Reset form field on entering edit mode
    }
    setIsEditing(!isEditing);
    setFeedbackMessage(null); // Clear feedback when toggling edit mode
  };

  const handleUpdateProfile = async () => {
    if (!editableFullName.trim()) {
      setFeedbackMessage({ type: 'error', message: 'Full name cannot be empty.' });
      return;
    }
    if (editableFullName.trim() === userProfile?.full_name) {
      setFeedbackMessage({ type: 'info', message: 'No changes made to full name.' });
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    setFeedbackMessage(null);

    // Update user_metadata in auth.users first
    const { data: authUpdateData, error: authUpdateError } = await supabase.auth.updateUser({
      data: { full_name: editableFullName.trim() }
    });

    if (authUpdateError) {
      console.error('[ProfilePage] Error updating auth user metadata:', authUpdateError);
      setFeedbackMessage({ type: 'error', message: `Failed to update profile: ${authUpdateError.message}` });
      setIsUpdating(false);
      return;
    }

    // If auth.users metadata updated, then update the public.profiles table
    if (session?.user?.id && authUpdateData.user) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          full_name: editableFullName.trim(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', session.user.id);

      if (profileUpdateError) {
        console.error('[ProfilePage] Error updating public profile:', profileUpdateError);
        setFeedbackMessage({ type: 'error', message: `Failed to update profile: ${profileUpdateError.message}. Auth data might be out of sync.` });
      } else {
        setFeedbackMessage({ type: 'success', message: 'Profile updated successfully!' });
        // AuthProvider's onAuthStateChange with USER_UPDATED event should pick up the change 
        // and refresh userProfile automatically. If not, manual refresh would be needed.
        setIsEditing(false);
      }
    } else {
      setFeedbackMessage({ type: 'error', message: 'User session not found for profile update.' });
    }
    setIsUpdating(false);
  };

  const handleLogout = async () => {
    console.log('[ProfilePage] Attempting logout.');
    setIsUpdating(true); // Use isUpdating for logout as well to disable buttons
    const { error } = await supabase.auth.signOut();
    setIsUpdating(false);
    if (error) {
      console.error('[ProfilePage] Error logging out:', error);
      setFeedbackMessage({ type: 'error', message: `Logout failed: ${error.message}` });
    } else {
      console.log('[ProfilePage] Logout successful, redirecting to login.');
      router.push('/login'); 
      router.refresh(); 
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-lg">Loading profile...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-lg">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Your Profile</h1>

      {feedbackMessage && (
        <div 
          className={`p-4 mb-6 rounded-md text-sm ${feedbackMessage.type === 'success' ? 'bg-green-100 text-green-700' : feedbackMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
          role="alert"
        >
          {feedbackMessage.message}
        </div>
      )}

      <div className="bg-white shadow-xl rounded-lg p-6 sm:p-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">User ID</label>
            <p className="mt-1 text-sm text-gray-900 break-all">{session.user?.id || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email Address</label>
            <p className="mt-1 text-sm text-gray-900">{session.user?.email || 'N/A'}</p>
          </div>
          
          {isEditing ? (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input 
                type="text" 
                id="fullName" 
                value={editableFullName}
                onChange={(e) => setEditableFullName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={isUpdating}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-500">Full Name</label>
              <p className="mt-1 text-sm text-gray-900">{userProfile?.full_name || 'Not provided'}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-500">Profile Last Updated</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(userProfile?.updated_at)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Account Created</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(session.user?.created_at)}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
          {isEditing ? (
            <>
              <button 
                onClick={handleUpdateProfile}
                disabled={isUpdating}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                onClick={handleEditToggle}
                disabled={isUpdating}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={handleEditToggle}
              disabled={isUpdating}
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 text-center">
        <button 
          onClick={handleLogout}
          disabled={isUpdating}
          className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {isUpdating && !isEditing ? 'Logging out...' : 'Logout'} 
        </button>
      </div>
    </div>
  );
} 