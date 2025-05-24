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

  console.log(`%c[AuthProvider] Component Instantiated. Initial isLoading: ${isLoading}`, 'color: blue; font-weight: bold;');

  useEffect(() => {
    console.log(`%c[AuthProvider] useEffect RUN. Supabase client available: ${!!supabase}`, 'color: green;');

    const fetchProfileAndSetSession = async (currentSession: Session | null, source: string) => {
      // THIS IS THE MOST CRITICAL LOG TO SEE
      console.log(`%c[AuthProvider] fetchProfileAndSetSession ENTERED. Source: ${source}. User ID: ${currentSession?.user?.id}. Current isLoading: ${isLoading}`, 'color: red; font-weight: bold;');
      setIsLoading(true);

      if (currentSession?.user) {
        try {
          console.log(`[AuthProvider] Attempting profile fetch for user: ${currentSession.user.id}`);
          const { data: profile, error: profileError, status: profileStatus } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          console.log(`[AuthProvider] Profile fetch completed. Status: ${profileStatus}, Error: ${JSON.stringify(profileError)}, Data: ${JSON.stringify(profile)}`);
          if (profileError && profileStatus !== 406) { // 406 can occur with .single() if no row found and not using .maybeSingle()
            setUserProfile(null);
          } else {
            setUserProfile(profile as UserProfile);
          }
        } catch (e: unknown) {
          console.error('[AuthProvider] CATCH during profile fetch:', e);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setSession(currentSession);
      setIsLoading(false);
      console.log(`%c[AuthProvider] fetchProfileAndSetSession COMPLETED. setIsLoading(false). User ID: ${currentSession?.user?.id}`, 'color: red; font-weight: bold;');
    };

    // Initial session check
    console.log('[AuthProvider] Attempting supabase.auth.getSession()...');
    supabase.auth.getSession().then(({ data: { session: initialSession }, error: getSessionError }) => {
      if (getSessionError) {
        console.error('[AuthProvider] Error from getSession():', getSessionError);
      }
      console.log(`%c[AuthProvider] getSession() response. User ID: ${initialSession?.user?.id}. Has error: ${!!getSessionError}`, 'color: purple;');
      fetchProfileAndSetSession(initialSession, 'initialGetSession');
    }).catch(catchError => {
      console.error('[AuthProvider] CATCH from getSession() promise:', catchError);
      fetchProfileAndSetSession(null, 'initialGetSessionError');
    });

    // Auth state change listener
    console.log('[AuthProvider] Setting up onAuthStateChange listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log(`%c[AuthProvider] onAuthStateChange FIRED. Event: ${_event}. New User ID: ${newSession?.user?.id}`, 'color: orange;');
        // No matter what, call fetchProfileAndSetSession
        await fetchProfileAndSetSession(newSession, `onAuthStateChange-${_event}`);
      }
    );

    return () => {
      console.log('[AuthProvider] useEffect cleanup: Unsubscribing from onAuthStateChange.');
      subscription?.unsubscribe();
    };
  }, [supabase]); // Dependency: supabase client instance

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