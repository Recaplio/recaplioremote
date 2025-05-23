'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

// Define a type for the user profile
interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  // Add other profile fields as needed
}

type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  userProfile: UserProfile | null; // Add userProfile to context
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // State for profile
  const [isLoading, setIsLoading] = useState(true); // Start true for initial load

  console.log('[AuthProvider] Initializing, isLoading:', isLoading);

  useEffect(() => {
    console.log('[AuthProvider] useEffect triggered');

    const fetchProfileAndSetSession = async (currentSession: Session | null) => {
      console.log('[AuthProvider] fetchProfileAndSetSession called. User ID:', currentSession?.user?.id, 'Current isLoading state:', isLoading);
      setIsLoading(true);
      if (currentSession?.user) {
        try {
          console.log('[AuthProvider] TRYING to fetch profile for user:', currentSession.user.id);
          const { data: profile, error: profileError, status: profileStatus } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          console.log('[AuthProvider] Profile fetch ATTEMPTED. Status:', profileStatus, 'Error object:', profileError, 'Returned profile data:', profile);

          if (profileError && profileStatus !== 406) {
            console.error('[AuthProvider] Error fetching profile (logged with status check):', { error: profileError, status: profileStatus });
            setUserProfile(null);
          } else if (!profileError && profile) {
            console.log('[AuthProvider] Profile fetched successfully:', profile);
            setUserProfile(profile as UserProfile);
          } else {
            console.log('[AuthProvider] No profile data returned or a non-blocking error occurred (e.g., no profile row for user), setting profile to null. Error:', profileError);
            setUserProfile(null);
          }
        } catch (e: unknown) {
          console.error('[AuthProvider] CATCH BLOCK for exception during profile fetch:', e);
          setUserProfile(null);
        }
      } else {
        console.log('[AuthProvider] No user in current session, clearing profile.');
        setUserProfile(null);
      }
      setSession(currentSession);
      console.log('[AuthProvider] Session state updated. New session user ID:', currentSession?.user?.id);
      setIsLoading(false);
      console.log('[AuthProvider] setIsLoading(false). isLoading is now:', isLoading);
    };

    console.log('[AuthProvider] Setting up initial session fetch and auth state listener.');
    supabase.auth.getSession().then(({ data: { session: initialSession } , error }) => {
      console.log('[AuthProvider] getSession completed. User ID:', initialSession?.user?.id, 'Error:', error);
      fetchProfileAndSetSession(initialSession);
    }).catch(error => {
        console.error('[AuthProvider] Error in getSession promise:', error);
        fetchProfileAndSetSession(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log('[AuthProvider] onAuthStateChange triggered. Event:', _event, 'New User ID:', newSession?.user?.id);
        await fetchProfileAndSetSession(newSession);
      }
    );

    return () => {
      console.log('[AuthProvider] Unsubscribing from auth state changes.');
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ supabase, session, userProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 