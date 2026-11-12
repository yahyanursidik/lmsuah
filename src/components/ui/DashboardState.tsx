import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import './dashboard.css';

export function DashboardState({ loading, error, empty, onRetry, busy }: {
  loading?: string;
  error?: string;
  empty?: ReactNode;
  onRetry?: () => void;
  busy?: boolean;
}) {
  if (loading || (error && busy)) {
    return <div className="dash-state" role="status">{loading || 'Memuat ulang…'}<div className="dash-skeleton" aria-hidden="true" /></div>;
  }
  if (error) return <div className="dash-state dash-state--error">
    <p role="alert"><CircleAlert size={16} aria-hidden="true" /> {error}</p>
    {onRetry && <button type="button" className="portal-button" onClick={onRetry}>Coba lagi</button>}
  </div>;
  return <div className="dash-state">{empty}</div>;
}
