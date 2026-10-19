import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAccessGuard } from '../src/components/ui/AdminAccessGuard';

const state = vi.hoisted(() => ({ failed: false, role: 'administrator', refetch: vi.fn() }));
vi.mock('@refinedev/core', () => ({ usePermissions: () => ({ data: state.role, isLoading: false, isError: state.failed, error: { message: 'Server belum dapat dihubungi.' }, refetch: state.refetch }) }));
afterEach(() => { cleanup(); state.failed = false; state.role = 'administrator'; state.refetch.mockClear(); });

describe('Admin permissions loading errors', () => {
  it('shows a retryable network error instead of claiming the account is not an admin', () => {
    state.failed = true;
    render(<MemoryRouter><AdminAccessGuard>Isi admin</AdminAccessGuard></MemoryRouter>);
    expect(screen.getByRole('alert').textContent).toContain('Server belum dapat dihubungi.');
    expect(screen.queryByText(/tidak memiliki hak/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it('keeps the participant blocked and allows an administrator', () => {
    state.role = 'participant';
    const view = render(<MemoryRouter><AdminAccessGuard>Isi admin</AdminAccessGuard></MemoryRouter>);
    expect(screen.queryByText('Isi admin')).toBeNull();
    state.role = 'administrator';
    view.rerender(<MemoryRouter><AdminAccessGuard>Isi admin</AdminAccessGuard></MemoryRouter>);
    expect(screen.getByText('Isi admin')).toBeDefined();
  });
});
