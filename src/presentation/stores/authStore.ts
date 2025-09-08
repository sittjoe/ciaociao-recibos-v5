import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthenticationService, User } from '../../core/application/services/AuthenticationService.js';
import { container } from '../../core/infrastructure/di/index.js';

export interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiresAt: Date | null;
  
  // Actions
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  checkSession: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(  persist(
    (set, get) => {
      const authService = container.resolve(AuthenticationService);

      return {
        // Initial state
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionExpiresAt: null,

        // Actions
        login: async (username: string, password: string, rememberMe = false) => {
          set({ isLoading: true, error: null });
          
          try {
            const result = await authService.authenticate(username, password);
            
            if (!result.success) {
              set({ 
                error: result.error || 'Login failed', 
                isLoading: false 
              });
              return false;
            }

            // Generate tokens
            const tokenDuration = rememberMe ? '30d' : '24h';
            const token = await authService.generateToken(result.user!.id, tokenDuration);
            const refreshToken = await authService.generateRefreshToken(result.user!.id);
            
            // Calculate expiration
            const expirationHours = rememberMe ? 24 * 30 : 24;
            const sessionExpiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
            
            // Update last login
            await authService.updateLastLogin(result.user!.id);

            set({
              user: result.user!,
              token,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              sessionExpiresAt,
            });

            return true;
          } catch (error: any) {
            set({ 
              error: error.message || 'Login failed', 
              isLoading: false 
            });
            return false;
          }
        },

        logout: async () => {
          const { token } = get();
          
          if (token) {
            try {
              await authService.logout(token);
            } catch (error) {
              console.warn('Error during logout:', error);
            }
          }

          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiresAt: null,
          });
        },

        refreshSession: async () => {
          const { refreshToken: currentRefreshToken } = get();
          
          if (!currentRefreshToken) {
            return false;
          }

          try {
            const result = await authService.refreshAccessToken(currentRefreshToken);
            
            if (!result.success) {
              // Refresh token is invalid, need to login again
              await get().logout();
              return false;
            }

            set({
              user: result.user!,
              token: result.token!,
              isAuthenticated: true,
              error: null,
              sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            });

            return true;
          } catch (error) {
            await get().logout();
            return false;
          }
        },

        checkSession: async () => {
          const { token, sessionExpiresAt, refreshToken } = get();
          
          if (!token) {
            return false;
          }

          // Check if session is expired
          if (sessionExpiresAt && new Date() > sessionExpiresAt) {
            // Try to refresh the session
            return get().refreshSession();
          }

          // Validate current token
          try {
            const validation = await authService.validateToken(token);
            
            if (!validation.valid) {
              // Token is invalid, try to refresh
              if (refreshToken) {
                return get().refreshSession();
              } else {
                await get().logout();
                return false;
              }
            }

            // Update user data if changed
            if (validation.user) {
              set({ user: validation.user });
            }

            return true;
          } catch (error) {
            await get().logout();
            return false;
          }
        },

        changePassword: async (currentPassword: string, newPassword: string) => {
          const { user } = get();
          
          if (!user) {
            set({ error: 'Not authenticated' });
            return false;
          }

          set({ isLoading: true, error: null });
          
          try {
            const result = await authService.changePassword(
              user.id, 
              currentPassword, 
              newPassword
            );
            
            if (!result.success) {
              set({ 
                error: result.error || 'Password change failed', 
                isLoading: false 
              });
              return false;
            }

            // Password changed successfully, user will be logged out from all devices
            await get().logout();
            set({ 
              isLoading: false,
              error: 'Password changed successfully. Please log in again.'
            });
            
            return true;
          } catch (error: any) {
            set({ 
              error: error.message || 'Password change failed', 
              isLoading: false 
            });
            return false;
          }
        },

        updateProfile: (updates: Partial<User>) => {
          const { user } = get();
          
          if (user) {
            set({ 
              user: { ...user, ...updates, updatedAt: new Date() } 
            });
          }
        },

        clearError: () => {
          set({ error: null });
        },
      };
    },
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
    }
  )
);

// Auto-check session on store initialization
if (typeof window !== 'undefined') {
  const checkInitialSession = async () => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      await store.checkSession();
    }
  };
  
  checkInitialSession();
  
  // Set up periodic session checks
  setInterval(() => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      store.checkSession();
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}
