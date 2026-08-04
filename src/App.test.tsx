import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Smoke Test', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getAllByText(/Kajian Ustadz Abu Haidar/i).length).toBeGreaterThan(0);
  });
});
