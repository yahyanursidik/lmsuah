import { describe, it, expect, vi } from 'vitest';
import {
  parseQueryParams,
  requireContentCreateAccess,
  requireContentUpdateAccess,
  requireContentDeleteAccess,
  isGuest,
  isContributor,
  isPublisher,
  logMutationAudit,
} from '../netlify/functions/utils/contentHelper';
import { ForbiddenError } from '../netlify/functions/middleware/auth';
import { logger } from '../netlify/functions/utils/logger';

vi.mock('../netlify/functions/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Content API Utilities & Security Rules', () => {
  describe('Allowlist Query Parsing', () => {
    it('should extract allowed filters and ignore illegal filter parameters', () => {
      const url = new URL('https://example.com/api/programs?status=published&title=kajian&hacked=true&dropTable=1');
      const allowedFilters = ['status', 'title', 'slug'];
      const allowedSorts = ['createdAt', 'title'];

      const result = parseQueryParams(url, allowedFilters, allowedSorts);

      expect(result.filters).toEqual({
        status: 'published',
        title: 'kajian',
      });
      expect(result.filters).not.toHaveProperty('hacked');
      expect(result.filters).not.toHaveProperty('dropTable');
    });

    it('should extract allowed sort field and fallback if sort field is not in allowlist', () => {
      const urlAllowed = new URL('https://example.com/api/programs?_sort=title&_order=desc');
      const allowedSorts = ['createdAt', 'title'];
      const resAllowed = parseQueryParams(urlAllowed, ['status'], allowedSorts);
      expect(resAllowed.sortField).toBe('title');
      expect(resAllowed.sortOrder).toBe('desc');

      const urlIllegal = new URL('https://example.com/api/programs?_sort=secretColumn&_order=asc');
      const resIllegal = parseQueryParams(urlIllegal, ['status'], allowedSorts);
      expect(resIllegal.sortField).toBeUndefined();
    });

    it('should parse pagination parameters correctly', () => {
      const url = new URL('https://example.com/api/programs?_start=10&_end=20');
      const res = parseQueryParams(url, [], []);
      expect(res.limit).toBe(10);
      expect(res.page).toBe(2);
      expect(res.offset).toBe(10);
    });
  });

  describe('Role-Based Content Access Scoping', () => {
    const guestSession = null;
    const participantSession = { userId: 'user-1', roles: ['participant'] };
    const contributorSession = { userId: 'user-2', roles: ['contributor'] };
    const publisherSession = { userId: 'user-3', roles: ['publisher'] };
    const adminSession = { userId: 'user-4', roles: ['admin'] };

    it('should correctly identify guest, contributor, and publisher roles', () => {
      expect(isGuest(guestSession)).toBe(true);
      expect(isGuest(participantSession)).toBe(false);

      expect(isContributor(contributorSession)).toBe(true);
      expect(isContributor(publisherSession)).toBe(true);
      expect(isContributor(adminSession)).toBe(true);
      expect(isContributor(participantSession)).toBe(false);

      expect(isPublisher(publisherSession)).toBe(true);
      expect(isPublisher(adminSession)).toBe(true);
      expect(isPublisher(contributorSession)).toBe(false);
    });

    it('should allow contributor to create draft but prevent contributor from publishing', () => {
      // Contributor membuat draft -> diizinkan
      expect(() => requireContentCreateAccess(contributorSession, 'draft')).not.toThrow();

      // Contributor membuat published -> ditolak
      expect(() => requireContentCreateAccess(contributorSession, 'published')).toThrow(ForbiddenError);

      // Publisher membuat published -> diizinkan
      expect(() => requireContentCreateAccess(publisherSession, 'published')).not.toThrow();
    });

    it('should enforce update permissions', () => {
      // Contributor memperbarui draft -> diizinkan
      expect(() => requireContentUpdateAccess(contributorSession, 'draft', 'draft')).not.toThrow();

      // Contributor mengubah status ke published -> ditolak
      expect(() => requireContentUpdateAccess(contributorSession, 'draft', 'published')).toThrow(ForbiddenError);

      // Publisher mengubah status ke published -> diizinkan
      expect(() => requireContentUpdateAccess(publisherSession, 'draft', 'published')).not.toThrow();
    });

    it('should restrict delete access to publisher/admin only', () => {
      expect(() => requireContentDeleteAccess(contributorSession)).toThrow(ForbiddenError);
      expect(() => requireContentDeleteAccess(publisherSession)).not.toThrow();
      expect(() => requireContentDeleteAccess(adminSession)).not.toThrow();
    });
  });

  describe('Mutation Audit Logging', () => {
    it('should invoke logger.info with MUTATION_AUDIT payload', () => {
      logMutationAudit('CREATE', 'programs', 'prog-123', 'user-456', { title: 'Program Baru' });

      expect(logger.info).toHaveBeenCalledWith(
        'MUTATION_AUDIT',
        expect.objectContaining({
          action: 'CREATE',
          entityName: 'programs',
          entityId: 'prog-123',
          userId: 'user-456',
          details: { title: 'Program Baru' },
        })
      );
    });
  });
});
