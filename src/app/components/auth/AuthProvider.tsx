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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    const fetchProfileAndSetSession = async (currentSession: Session | null) => {
      if (currentSession?.user) {
        try {
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
      setIsLoading(false);
    };


    const initialFetch = async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error getting initial session:", error);
        }
        await fetchProfileAndSetSession(data.session);
    };

    initialFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        // When auth state changes, fetch profile for the new session
        // setIsLoading(true); // Optionally set loading true while profile might be fetching
        await fetchProfileAndSetSession(newSession);
      }
    );

    return () => {
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