'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

// Define a type for the user profile
interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  updated_at?: string; // Added for profile last updated
  created_at?: string; // Added for consistency, though session.user.created_at is also available
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
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log(`%c[AuthProvider] INSTANCE CREATED. Initial isLoading: ${isLoading}`, 'color: blue; font-weight: bold;');

  useEffect(() => {
    console.log(`%c[AuthProvider] useEffect RUN. Supabase client: ${!!supabase}`, 'color: green;');
    // Ensure isLoading is true at the start of the effect, especially if re-run
    setIsLoading(true); 

    const fetchProfileAndSetSession = async (currentSession: Session | null, source: string) => {
      console.log(`%c[AuthProvider] fetchProfileAndSetSession CALLED. Source: ${source}. User ID: ${currentSession?.user?.id}. Current isLoading (before fetch): ${isLoading}`, 'color: red; font-weight: bold;');
      // No need to setIsLoading(true) here again if it's done at effect start or if this function sets it at the end.

      if (currentSession?.user) {
        console.log(`[AuthProvider] Attempting profile fetch for user: ${currentSession.user.id} (Source: ${source})`);
        try {
          const { data: profile, error: profileError, status: profileStatus } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          console.log(`[AuthProvider] Profile fetch COMPLETED. Status: ${profileStatus}, Error: ${JSON.stringify(profileError)}, Data: ${JSON.stringify(profile)} (Source: ${source})`);
          if (profileError && profileStatus !== 406) {
            console.error(`[AuthProvider] Profile fetch FAILED (but not 406). Error: ${JSON.stringify(profileError)} (Source: ${source})`);
            setUserProfile(null);
          } else if (profile) {
            setUserProfile(profile as UserProfile);
          } else {
            console.warn(`[AuthProvider] Profile fetch returned no data and no error (or 406). Profile is null. (Source: ${source})`);
            setUserProfile(null);
          }
        } catch (e: unknown) {
          console.error(`[AuthProvider] CATCH during profile fetch (Source: ${source}):`, e);
          if (e instanceof Error) {
            console.error(`[AuthProvider] Profile fetch error name: ${e.name}, message: ${e.message} (Source: ${source})`);
          }
          setUserProfile(null);
        }
      } else {
        console.log(`[AuthProvider] No user in currentSession. Clearing profile. (Source: ${source})`);
        setUserProfile(null);
      }
      setSession(currentSession); // Update session regardless
      setIsLoading(false); // Critical: set loading to false after all operations
      console.log(`%c[AuthProvider] fetchProfileAndSetSession FINISHED. setIsLoading(false). User ID: ${currentSession?.user?.id}. Session set: ${!!currentSession}. Profile set: ${!!userProfile} (Source: ${source})`, 'color: red; font-weight: bold;');
    };

    console.log('[AuthProvider] Attempting supabase.auth.getSession() in useEffect...');
    supabase.auth.getSession().then(({ data: { session: initialSessionFromGetSession }, error: getSessionError }) => {
      if (getSessionError) {
        console.error('[AuthProvider] Error from getSession():', getSessionError);
      }
      console.log(`%c[AuthProvider] getSession() RESPONSE. User ID: ${initialSessionFromGetSession?.user?.id}. Has error: ${!!getSessionError}`, 'color: purple;');
      // Call fetchProfileAndSetSession with the result of getSession
      fetchProfileAndSetSession(initialSessionFromGetSession, 'initialGetSession');
    }).catch(catchError => {
      console.error('[AuthProvider] CATCH from getSession() promise:', catchError);
      fetchProfileAndSetSession(null, 'initialGetSessionError'); // Ensure loading state is handled
    });

    console.log('[AuthProvider] Setting up onAuthStateChange listener in useEffect...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSessionFromAuthStateChange) => {
        console.log(`%c[AuthProvider] onAuthStateChange FIRED. Event: ${_event}. New User ID: ${newSessionFromAuthStateChange?.user?.id}`, 'color: orange;');
        // Call fetchProfileAndSetSession with the new session from onAuthStateChange
        await fetchProfileAndSetSession(newSessionFromAuthStateChange, `onAuthStateChange-${_event}`);
      }
    );

    return () => {
      console.log('%c[AuthProvider] useEffect CLEANUP. Unsubscribing from onAuthStateChange.', 'color: green;');
      subscription?.unsubscribe();
    };
  }, [supabase]); // Dependency: supabase client instance

  const contextValue = useMemo(() => ({
    supabase,
    session,
    userProfile,
    isLoading
  }), [supabase, session, userProfile, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
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