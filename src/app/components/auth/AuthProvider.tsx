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

  useEffect(() => {
    // No setIsLoading(true) here, fetchProfileAndSetSession will handle it.

    const fetchProfileAndSetSession = async (currentSession: Session | null) => {
      setIsLoading(true); // Set loading true at the start of processing any session state
      if (currentSession?.user) {
        try {
          // Fetch profile
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
            setUserProfile(null);
          } else {
            setUserProfile(profile as UserProfile);
          }
        } catch (e) {
          console.error('Exception fetching profile:', e);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null); // Clear profile if no user
      }
      setSession(currentSession);
      setIsLoading(false); // Set loading false after all processing for this session state is done
    };

    // Get initial session
    // setIsLoading(true); // Set loading before the async call
    supabase.auth.getSession().then(({ data: { session: initialSession } , error }) => {
      if (error) {
        console.error("Error getting initial session:", error);
      }
      fetchProfileAndSetSession(initialSession); // This will set isLoading appropriately
    }).catch(error => {
        console.error("Error handling initial session promise:", error);
        fetchProfileAndSetSession(null); // Ensure loading state is handled on error too
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        // fetchProfileAndSetSession will handle isLoading states internally
        await fetchProfileAndSetSession(newSession);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]); // Added supabase to dependency array

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