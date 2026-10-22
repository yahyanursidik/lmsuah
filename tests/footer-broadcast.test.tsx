import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublicLayout } from '../src/pages/public/PublicLayout';
import { SchedulesPage } from '../src/pages/public/SchedulesPage';
import { ParticipantSchedulePage } from '../src/pages/participant/ParticipantSchedulePage';
import { TARBIYAH_STREAMS_URL } from '../shared/schedule-stream';

const state = vi.hoisted(() => ({ schedules: [{ id: 'fixture', title: 'Kajian fixture', type: 'Rutin', status: 'Rutin', day: 'Kamis', date: '2026-10-22', isLiveStream: true, streamUrl: 'https://youtube.com/@tarbiyahSUnnah' }] }));
vi.mock('@refinedev/core', () => ({
  useGetIdentity: () => ({ data: { id: 'demo-participant', role: 'participant' } }),
  useList: ({ resource }: { resource: string }) => ({ result: { data: resource === 'schedules' ? state.schedules : [] }, query: { isFetched: true, isLoading: false, isError: false, refetch: vi.fn() } }),
}));
vi.mock('../src/providers/authProvider', () => ({ isAdminRole: () => false }));
vi.mock('../src/lib/useLearningData', () => ({ useLearningData: () => ({ enrollments: [], progress: [], loading: false, pending: false, error: '' }) }));
vi.mock('../src/pages/participant/useParticipantPortalData', () => ({ useParticipantPortalData: () => ({ schedules: state.schedules, programs: [], isLoading: false }) }));
beforeEach(() => { state.schedules = [{ id: 'fixture', title: 'Kajian fixture', type: 'Rutin', status: 'Rutin', day: 'Kamis', date: '2026-10-22', isLiveStream: true, streamUrl: 'https://youtube.com/@tarbiyahSUnnah' }]; });
afterEach(cleanup);

describe('Technical support footer and broadcast destinations', () => {
  it('explains when to contact support and provides the exact email, advisor and profile', () => {
    render(<MemoryRouter><PublicLayout /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Bantuan teknis' })).toBeDefined();
    expect(screen.getByText(/Mengalami kendala, error, atau kegagalan sistem/)).toBeDefined();
    expect(screen.getByRole('link', { name: 'ahlan@yahyanursidik.my.id' }).getAttribute('href')).toBe('mailto:ahlan@yahyanursidik.my.id');
    expect(screen.getByRole('link', { name: 'Yahya Nursidik' }).getAttribute('href')).toBe('https://yahyanursidik.my.id/');
    expect(screen.getByText(/Special Advisor for Digital Transformation, Innovation & Business YTS/)).toBeDefined();
  });

  it.each([SchedulesPage, ParticipantSchedulePage])('corrects the old channel link and label in %s', Page => {
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.getByText(/Live Tarbiyah Sunnah Channel/)).toBeDefined();
    expect(screen.queryByText(/Live Radio Rodja/)).toBeNull();
    expect(screen.getByRole('link', { name: /Tonton live/i }).getAttribute('href')).toBe(TARBIYAH_STREAMS_URL);
  });

  it.each([SchedulesPage, ParticipantSchedulePage])('preserves manual URLs and hides unsafe, inactive and cancelled links in %s', Page => {
    state.schedules[0].streamUrl = 'https://youtu.be/fixture';
    const view = render(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Tonton live/i }).getAttribute('href')).toBe('https://youtu.be/fixture');
    state.schedules[0].isLiveStream = false; view.rerender(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Tonton live/i })).toBeNull();
    state.schedules[0].isLiveStream = true; state.schedules[0].status = 'Dibatalkan'; view.rerender(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Tonton live/i })).toBeNull();
    state.schedules[0].status = 'Rutin'; state.schedules[0].streamUrl = 'javascript:alert(1)'; view.rerender(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Tonton live/i })).toBeNull();
  });
});
