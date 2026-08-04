import type { AuthProvider } from '@refinedev/core';
import { authClient, signIn, signOut } from '../lib/auth-client';

const DEMO_STORAGE_KEY = 'lms_demo_user';

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
  login: async ({ email, password: _password, providerName }) => {
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

    // 2. Demo or Email/Password Login
    if (email) {
      const lowerEmail = String(email).trim().toLowerCase();

      // Admin demo login
      if (
        lowerEmail === 'admin@abutaidar.id' ||
        lowerEmail === 'admin@lms.id' ||
        lowerEmail === 'admin@gmail.com' ||
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

      // Peserta demo login
      if (
        lowerEmail === 'peserta@abutaidar.id' ||
        lowerEmail === 'peserta@gmail.com' ||
        lowerEmail === 'peserta' ||
        lowerEmail === 'user@gmail.com'
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

      // Any custom email login fallback
      const user = {
        id: `demo-user-${Date.now()}`,
        name: email.split('@')[0] || 'Pengguna',
        email,
        role: lowerEmail.includes('admin') ? 'admin' : 'participant',
        avatar: '/logo-abu-haidar.jpg',
      };
      setStoredDemo(JSON.stringify(user));
      return {
        success: true,
        redirectTo: user.role === 'admin' ? '/admin' : '/dashboard',
      };
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
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        return {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image,
        };
      }
    } catch {
      // Ignore
    }

    return null;
  },

  onError: async (error) => {
    console.error(error);
    if (error?.status === 401 || error?.status === 403) {
      return {
        logout: true,
        redirectTo: '/login',
        error: new Error('Sesi Anda telah berakhir'),
      };
    }
    return { error };
  },
};
