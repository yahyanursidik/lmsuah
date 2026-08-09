import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { registerParticipant, getRegisteredParticipants } from '../src/lib/userStore';
import { RegisterPage } from '../src/pages/public/RegisterPage';

describe('Register Flow & UserStore', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  it('registers a new participant in userStore', () => {
    const res = registerParticipant({
      name: 'Peserta Baru',
      email: 'pesertabaru@test.com',
      phone: '081122334455',
      password: 'password123',
    });

    expect(res.success).toBe(true);
    expect(res.user?.name).toBe('Peserta Baru');
    expect(res.user?.email).toBe('pesertabaru@test.com');

    const all = getRegisteredParticipants();
    expect(all.some((u) => u.email === 'pesertabaru@test.com')).toBe(true);
  });

  it('prevents registering duplicate email', () => {
    registerParticipant({
      name: 'Peserta Pertama',
      email: 'duplikat@test.com',
      password: 'password123',
    });

    const res2 = registerParticipant({
      name: 'Peserta Kedua',
      email: 'duplikat@test.com',
      password: 'password456',
    });

    expect(res2.success).toBe(false);
    expect(res2.message).toContain('Email sudah terdaftar');
  });

  it('renders RegisterPage form fields', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Daftar Mandiri/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/Ahmad Abdullah/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/nama@email.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/081234567890/i)).toBeDefined();
  });
});
