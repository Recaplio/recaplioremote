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
  let navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/library", label: "Library" },
    { href: "/discover", label: "Discover" },
    { href: "/settings", label: "Settings" },
    { href: "/plans", label: "View Plans", className: "font-semibold text-yellow-400" },
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
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
          Recaplio
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden md:flex space-x-6 items-center">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={`hover:text-gray-300 transition-colors ${link.className || ''}`}>
                {link.label}
              </Link>
            </li>
          ))}
          {session && (
            <li>
              <button onClick={handleSignOut} className="hover:text-gray-300 transition-colors">
                Logout
              </button>
            </li>
          )}
        </ul>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-3 bg-gray-700 rounded-md shadow-lg">
          <ul className="flex flex-col space-y-1 p-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link 
                  href={link.href} 
                  className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-600 hover:text-white transition-colors ${link.className || ''}`}
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
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-gray-600 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header; 