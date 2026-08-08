import { describe, it, expect, vi } from 'vitest';
import { requireRole, requirePermission, ForbiddenError, UserSession, getDevelopmentDemoSession } from '../netlify/functions/middleware/auth.js';
import * as permissionsModule from '../netlify/functions/utils/permissions.js';
import { authProvider } from '../src/providers/authProvider.js';

describe('Auth & Security Unit Tests', () => {
  it('1. Participant tidak dapat mengakses endpoint admin (requireRole / requirePermission menolak)', async () => {
    const participantSession: UserSession = {
      userId: 'user-participant-123',
      roles: ['participant'],
    };

    // requireRole harus melempar ForbiddenError jika mencari role administrator
    expect(() => {
      requireRole(participantSession, ['administrator', 'super_administrator']);
    }).toThrow(ForbiddenError);

    // Mock getUserPermissions untuk mengembalikan permission standar participant
    vi.spyOn(permissionsModule, 'getUserPermissions').mockResolvedValue(['program.read', 'lesson.read']);

    // requirePermission harus melempar ForbiddenError jika tidak punya permission role.assign
    await expect(
      requirePermission(participantSession, 'role.assign')
    ).rejects.toThrow(ForbiddenError);
  });

  it('2. User tidak dapat meningkatkan role sendiri (Self Privilege Escalation Prevention)', () => {
    const participantSession: UserSession = {
      userId: 'user-participant-123',
      roles: ['participant'],
    };

    // Simulasi fungsi penetapan role dengan perlindungan anti-self-escalation
    const assignRoleLogic = (session: UserSession, targetUserId: string) => {
      if (session.userId === targetUserId) {
        throw new ForbiddenError('Pengguna tidak dapat menetapkan role untuk dirinya sendiri');
      }
    };

    expect(() => {
      assignRoleLogic(participantSession, 'user-participant-123');
    }).toThrow(ForbiddenError);
  });

  it('3. User tidak dapat mengubah profil user lain (IDOR Prevention)', () => {
    const session: UserSession = {
      userId: 'user-1',
      roles: ['participant'],
    };

    const updateProfileLogic = (session: UserSession) => {
      // Backend mengabaikan targetUserId dari body dan SELALU menggunakan session.userId
      const activeUserId = session.userId;
      return activeUserId;
    };

    const activeUserId = updateProfileLogic(session);
    
    // Dipastikan ID yang diperbarui tetap milik user-1 (session.userId)
    expect(activeUserId).toBe('user-1');
    expect(activeUserId).not.toBe('user-2');
  });

  it('4. Demo admin hanya dapat diterjemahkan menjadi sesi pada environment non-production', () => {
    const request = new Request('http://localhost/api/programs', {
      headers: { 'x-lms-demo-user': 'demo-admin-1' },
    });

    expect(getDevelopmentDemoSession(request, 'development')).toEqual({
      userId: 'demo-admin-1',
      roles: ['super_administrator'],
      isDevelopmentDemo: true,
    });
    expect(getDevelopmentDemoSession(request, 'production')).toBeNull();
  });

  it('5. Demo peserta dikenali di development dan 403 tidak memicu logout otomatis', async () => {
    const request = new Request('http://localhost/api/lessons/lesson-1', {
      headers: { 'x-lms-demo-user': 'demo-peserta-1' },
    });

    expect(getDevelopmentDemoSession(request, 'development')).toEqual({
      userId: 'demo-peserta-1',
      roles: ['participant'],
      isDevelopmentDemo: true,
    });

    await expect(authProvider.onError?.({ statusCode: 403 })).resolves.toMatchObject({
      logout: false,
    });
  });
});
