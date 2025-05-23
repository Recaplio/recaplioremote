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
      console.log('[AuthProvider] fetchProfileAndSetSession called with session:', currentSession?.user?.id);
      setIsLoading(true);
      console.log('[AuthProvider] setIsLoading(true)');
      if (currentSession?.user) {
        try {
          console.log('[AuthProvider] Fetching profile for user:', currentSession.user.id);
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (error) {
            console.error('[AuthProvider] Error fetching profile:', error);
            setUserProfile(null);
          } else {
            console.log('[AuthProvider] Profile fetched:', profile);
            setUserProfile(profile as UserProfile);
          }
        } catch (e) {
          console.error('[AuthProvider] Exception fetching profile:', e);
          setUserProfile(null);
        }
      } else {
        console.log('[AuthProvider] No user in current session, clearing profile.');
        setUserProfile(null);
      }
      setSession(currentSession);
      console.log('[AuthProvider] Session state updated.');
      setIsLoading(false);
      console.log('[AuthProvider] setIsLoading(false)');
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