'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login'); // Use replace to avoid adding login to history stack
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    // You can render a loading spinner or a blank page while checking auth state
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p> {/* Replace with a proper spinner/loader component */}
      </div>
    );
  }

  if (!session) {
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback, don't render children if no session after loading.
    return null; 
  }

  return <>{children}</>;
};

export default ProtectedRoute; 