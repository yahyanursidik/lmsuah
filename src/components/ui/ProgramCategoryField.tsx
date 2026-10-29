import { useId } from 'react';
import { PROGRAM_CATEGORY_MAX_LENGTH, PROGRAM_CATEGORY_SUGGESTIONS } from '../../../shared/program-category';

export function ProgramCategoryField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold text-slate-800">Kategori program (opsional)</label>
    <input id={id} list={`${id}-options`} aria-describedby={`${id}-help`} value={value} onChange={event => onChange(event.target.value)} maxLength={PROGRAM_CATEGORY_MAX_LENGTH} placeholder="Contoh: Tauhid" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" />
    <datalist id={`${id}-options`}>{PROGRAM_CATEGORY_SUGGESTIONS.map(category => <option key={category} value={category} />)}</datalist>
    <p id={`${id}-help`} className="text-xs leading-5 text-slate-600">Pilih saran atau ketik kategori sendiri (maksimal 100 karakter). Kosongkan untuk label “Kajian”. Kategori program tidak mengikuti kategori jadwal.</p>
  </div>;
}
