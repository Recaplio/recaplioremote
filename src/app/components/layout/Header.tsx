'use client'; // Needed for useState

import Link from 'next/link';
import { useState } from 'react'; // Import useState
import { useAuth } from '@/app/components/auth/AuthProvider'; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { session, supabase, userProfile } = useAuth(); // Get session, supabase client, and userProfile
  const router = useRouter();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      // Optionally show an error message to the user
    } else {
      router.push('/login'); // Redirect to login page after sign out
      router.refresh(); // Refresh to update auth state across app
    }
    setIsMobileMenuOpen(false); // Close mobile menu if open
  };

  // Base navigation links
  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/library", label: "Library" },
    { href: "/discover", label: "Discover" },
    { href: "/settings", label: "Settings" },
    { href: "/plans", label: "View Plans", className: "font-semibold text-brand-300 hover:text-brand-200" },
  ];

  // Add Login/Signup or Profile/Logout links based on session state
  if (session) {
    // Use full_name from profile if available, otherwise fallback to email
    const profileLabel = userProfile?.full_name 
      ? userProfile.full_name 
      : (session.user.email ? session.user.email.split('@')[0] : 'Profile');
    navLinks.push({ href: "/profile", label: `Profile (${profileLabel})` });
    // The logout button is handled separately for the onClick handler
  } else {
    navLinks.push({ href: "/login", label: "Login" });
    navLinks.push({ href: "/signup", label: "Sign Up" });
  }

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg border-b border-gray-700">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 text-white hover:text-brand-300 transition-colors group">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-secondary-500 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
              <span className="text-lg font-bold text-white">🦁</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">Recaplio</span>
          </Link>

          {/* Desktop Menu */}
          <ul className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link 
                  href={link.href} 
                  className={`text-sm font-medium hover:text-brand-300 transition-colors duration-200 ${link.className || 'text-gray-300'}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {session && (
              <li>
                <button 
                  onClick={handleSignOut} 
                  className="text-sm font-medium text-gray-300 hover:text-brand-300 transition-colors duration-200"
                >
                  Logout
                </button>
              </li>
            )}
          </ul>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded-md p-2 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 pb-4">
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
              <ul className="flex flex-col">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href} 
                      className={`block px-4 py-3 text-sm font-medium hover:bg-gray-700 hover:text-brand-300 transition-all duration-200 border-b border-gray-700 last:border-b-0 ${link.className || 'text-gray-300'}`}
                      onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {session && (
                  <li>
                    <button 
                      onClick={handleSignOut} 
                      className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-brand-300 transition-all duration-200"
                    >
                      Logout
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header; 