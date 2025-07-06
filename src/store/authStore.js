import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null,
      isAuthenticated: false,
      isLoading: false,
      theme: 'light', // 'light' or 'dark'
      
      // Set user data
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      
      // Set user profile from Firestore
      setUserProfile: (profile) => set({ userProfile: profile }),
      
      // Set loading state
      setLoading: (loading) => set({ isLoading: loading }),
      
      // Toggle theme
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      
      // Set theme
      setTheme: (theme) => set({ theme }),
      
      // Logout
      logout: () => set({ 
        user: null, 
        userProfile: null, 
        isAuthenticated: false 
      }),
      
      // Check if user is admin
      isAdmin: () => {
        const { userProfile } = get();
        return userProfile?.role === 'admin';
      },
      
      // Check if user is in a specific team
      isInTeam: (teamId) => {
        const { userProfile } = get();
        return userProfile?.teams?.includes(teamId) || false;
      },
      
      // Check if user is team admin
      isTeamAdmin: (teamId) => {
        const { userProfile } = get();
        return userProfile?.teamRoles?.[teamId] === 'admin' || false;
      },
      
      // Check if user is team creator
      isTeamCreator: (teamId) => {
        const { userProfile } = get();
        return userProfile?.teamRoles?.[teamId] === 'creator' || false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        theme: state.theme 
      }),
    }
  )
);

export default useAuthStore; 