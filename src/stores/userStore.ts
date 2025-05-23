import { create } from 'zustand';

export type ReadingMode = 'fiction' | 'non-fiction';

interface User {
  id: string | null;
  name: string | null;
  email: string | null;
  // Add other relevant user properties as needed
}

interface UserState {
  currentUser: User | null;
  activeReadingMode: ReadingMode;
  // Potentially other user-specific preferences
  setCurrentUser: (user: User | null) => void;
  setActiveReadingMode: (mode: ReadingMode) => void;
  clearUserSession: () => void;
}

// Mock user for initial UI development
// const mockUser: User = {
//   id: 'mock-user-123',
//   name: 'Alex Reader',
//   email: 'alex.reader@example.com',
// };

export const useUserStore = create<UserState>((set) => ({
  currentUser: null, // Set to mockUser for testing if needed, null by default
  activeReadingMode: 'non-fiction', // Default reading mode
  setCurrentUser: (user) => set({ currentUser: user }),
  setActiveReadingMode: (mode) => set({ activeReadingMode: mode }),
  clearUserSession: () => set({ currentUser: null }),
}));

// Example on how to initialize with mock user for development:
// To use mock user by default for UI testing:
// In your main app component or layout, you could call:
// useEffect(() => {
//   useUserStore.getState().setCurrentUser(mockUser);
// }, []); 