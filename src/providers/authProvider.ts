import type { AuthProvider } from '@refinedev/core';
import { authClient, signIn, signOut } from '../lib/auth-client';

const DEMO_STORAGE_KEY = 'lms_demo_user';

type LoginParams = {
  email?: string;
  password?: string;
  providerName?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getStoredDemo(): string | null {
  if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
    try {
      return localStorage.getItem(DEMO_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return null;
}

function setStoredDemo(val: string): void {
  if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, val);
    } catch {
      // Ignore storage errors
    }
  }
}

function removeStoredDemo(): void {
  if (typeof window !== 'undefined' && typeof window.localStorage?.removeItem === 'function') {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

export const authProvider: AuthProvider = {
  login: async ({ email, password, providerName }: LoginParams) => {
    // 1. Social provider login (Google)
    if (providerName === 'google') {
      try {
        await signIn.social({
          provider: 'google',
          callbackURL: '/',
        });
        return { success: true };
      } catch {
        // Fallback for demo
      }
    }

    // 2. Real Email/Password Login with Fallback to Demo
    if (email) {
      const lowerEmail = String(email).trim().toLowerCase();
      
      // Admin demo login bypass
      if (
        lowerEmail === 'admin@abutaidar.id' ||
        lowerEmail === 'admin@lms.id' ||
        lowerEmail === 'admin'
      ) {
        const user = {
          id: 'demo-admin-1',
          name: 'Administrator UAH',
          email: 'admin@abutaidar.id',
          role: 'admin',
          avatar: '/logo-abu-haidar.jpg',
        };
        setStoredDemo(JSON.stringify(user));
        return {
          success: true,
          redirectTo: '/admin',
        };
      }

      // Peserta demo login bypass
      if (
        lowerEmail === 'peserta@abutaidar.id' ||
        lowerEmail === 'peserta'
      ) {
        const user = {
          id: 'demo-peserta-1',
          name: 'Jamaah Penuntut Ilmu',
          email: 'peserta@abutaidar.id',
          role: 'participant',
          avatar: '/logo-abu-haidar.jpg',
        };
        setStoredDemo(JSON.stringify(user));
        return {
          success: true,
          redirectTo: '/dashboard',
        };
      }

      // 3. Real Backend Authentication
      try {
        const { error } = await signIn.email({
          email: lowerEmail,
          password: password || '',
        });

        if (error) {
          return {
            success: false,
            error: {
              name: 'LoginError',
              message: error.message || 'Gagal masuk. Periksa kembali email dan password.',
            },
          };
        }

        // We successfully logged in with real auth!
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            if (data.roles && (data.roles.includes('super_administrator') || data.roles.includes('administrator'))) {
              return {
                success: true,
                redirectTo: '/admin',
              };
            }
          }
        } catch {
          // Ignore
        }

        return {
          success: true,
          redirectTo: '/', // Will be redirected to dashboard
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: {
            name: 'LoginError',
            message: getErrorMessage(error, 'Terjadi kesalahan pada server auth.'),
          },
        };
      }
    }

    return {
      success: false,
      error: {
        name: 'LoginError',
        message: 'Email dan password tidak boleh kosong',
      },
    };
  },

  logout: async () => {
    removeStoredDemo();
    try {
      await signOut();
    } catch {
      // Ignore
    }
    return {
      success: true,
      redirectTo: '/login',
    };
  },

  check: async () => {
    // 1. Check local demo session
    const storedDemo = getStoredDemo();
    if (storedDemo) {
      return { authenticated: true };
    }

    // 2. Check authClient session
    try {
      const { data: session } = await authClient.getSession();
      if (session) {
        return { authenticated: true };
      }
    } catch {
      // Ignore
    }

    return {
      authenticated: false,
      logout: true,
      redirectTo: '/login',
    };
  },

  getPermissions: async () => {
    const storedDemo = getStoredDemo();
    if (storedDemo) {
      try {
        const user = JSON.parse(storedDemo);
        return user.role;
      } catch {
        // Ignore
      }
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.roles && data.roles.length > 0) {
          if (data.roles.includes('super_administrator')) return 'super_administrator';
          if (data.roles.includes('administrator')) return 'administrator';
          return data.roles[0];
        }
      }
    } catch {
      // Ignore
    }

    return 'participant';
  },

  getIdentity: async () => {
    const storedDemo = getStoredDemo();
    if (storedDemo) {
      try {
        const user = JSON.parse(storedDemo);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        };
      } catch {
        // Ignore
      }
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          let role = 'participant';
          if (data.roles && data.roles.length > 0) {
            if (data.roles.includes('super_administrator')) role = 'super_administrator';
            else if (data.roles.includes('administrator')) role = 'administrator';
            else role = data.roles[0];
          }
          return {
            id: data.user.authUserId || data.user.id,
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.avatarUrl,
            role: role,
          };
        }
      }

      // Fallback
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        return {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image,
          role: 'participant',
        };
      }
    } catch {
      // Ignore
    }

    return null;
  },

  onError: async (error) => {
    console.error('[AuthProvider Error]', error);
    const status = error?.statusCode || error?.status;

    // Jika sedang menggunakan akun demo lokal, jangan paksa logout saat terjadi error API 401
    const storedDemo = getStoredDemo();
    if (storedDemo) {
      return { error };
    }

    if (status === 401) {
      return {
        logout: true,
        redirectTo: '/login',
        error: new Error('Sesi Anda telah berakhir'),
      };
    }
    if (status === 403) {
      return {
        logout: false,
        error: new Error('Akses tidak diizinkan untuk halaman atau materi ini'),
      };
    }
    return { error };
  },
};
