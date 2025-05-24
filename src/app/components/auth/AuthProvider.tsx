'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  console.log(`%c[AuthProvider] INSTANCE CREATED. Initial isLoading: ${isLoading}`, 'color: blue; font-weight: bold;');

  const fetchProfileAndSetSession = useCallback(async (newSession: Session | null, source: string) => {
    console.log(`%c[AuthProvider] fetchProfileAndSetSession CALLED. Source: ${source}. New User ID: ${newSession?.user?.id}. Current Session User ID: ${session?.user?.id}. Current isLoading: ${isLoading}`, 'color: red; font-weight: bold;');
    
    if (newSession?.user?.id === session?.user?.id && newSession?.access_token === session?.access_token && !isLoading) {
        console.log(`[AuthProvider] fetchProfileAndSetSession: New session same as current and not loading. Skipping. (Source: ${source})`);
        return;
    }

    setIsLoading(true); // Set loading true before async operations

    if (newSession?.user) {
      // Only fetch profile if user ID changed or profile is null
      if (newSession.user.id !== userProfile?.id || !userProfile) {
        console.log(`[AuthProvider] Attempting profile fetch for user: ${newSession.user.id} (Source: ${source})`);
        try {
          const { data: profile, error: profileError, status: profileStatus } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
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
        console.log(`[AuthProvider] User ID ${newSession.user.id} same as current profile ID ${userProfile?.id}. Profile not re-fetched. (Source: ${source})`);
      }
    } else {
      console.log(`[AuthProvider] No user in newSession. Clearing profile. (Source: ${source})`);
      setUserProfile(null);
    }
    setSession(newSession); // Update session regardless
    setIsLoading(false); // Critical: set loading to false after all operations
    console.log(`%c[AuthProvider] fetchProfileAndSetSession FINISHED. setIsLoading(false). User ID: ${newSession?.user?.id}. Session set: ${!!newSession}. Profile set: ${!!userProfile} (Source: ${source})`, 'color: red; font-weight: bold;');
  }, [supabase, userProfile, session, isLoading]); // Added session and isLoading to dependencies of useCallback


  useEffect(() => {
    console.log(`%c[AuthProvider] Main useEffect RUN. Supabase client: ${!!supabase}`, 'color: green;');
    // setIsLoading(true); // Moved setIsLoading(true) to the beginning of fetchProfileAndSetSession

    console.log('[AuthProvider] Attempting supabase.auth.getSession() in useEffect...');
    supabase.auth.getSession().then(({ data: { session: initialSessionFromGetSession }, error: getSessionError }) => {
      if (getSessionError) {
        console.error('[AuthProvider] Error from getSession():', getSessionError);
      }
      console.log(`%c[AuthProvider] getSession() RESPONSE. User ID: ${initialSessionFromGetSession?.user?.id}. Has error: ${!!getSessionError}`, 'color: purple;');
      fetchProfileAndSetSession(initialSessionFromGetSession, 'initialGetSession');
    }).catch(catchError => {
      console.error('[AuthProvider] CATCH from getSession() promise:', catchError);
      fetchProfileAndSetSession(null, 'initialGetSessionError');
    });

    console.log('[AuthProvider] Setting up onAuthStateChange listener in useEffect...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSessionFromAuthStateChange) => { // Removed async here as fetchProfileAndSetSession is async
        console.log(`%c[AuthProvider] onAuthStateChange FIRED. Event: ${_event}. New User ID: ${newSessionFromAuthStateChange?.user?.id}`, 'color: orange;');
        fetchProfileAndSetSession(newSessionFromAuthStateChange, `onAuthStateChange-${_event}`);
      }
    );

    return () => {
      console.log('%c[AuthProvider] Main useEffect CLEANUP. Unsubscribing from onAuthStateChange.', 'color: green;');
      subscription?.unsubscribe();
    };
  }, [supabase, fetchProfileAndSetSession]); // fetchProfileAndSetSession is now a dependency

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