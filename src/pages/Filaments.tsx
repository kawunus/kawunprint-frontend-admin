import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilaments } from '../hooks/useFilaments';
import FilamentTable from '../components/filaments/FilamentTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const Filaments: React.FC = () => {
  const { filaments, types, loading, fetchAll, create, remove } = useFilaments();
  const { t } = useTranslation();
  const [searchColor, setSearchColor] = useState('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minResidue, setMinResidue] = useState<string>('');
  const [maxResidue, setMaxResidue] = useState<string>('');
  const [sortBy, setSortBy] = useState<'color' | 'price' | 'residue'>('color');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [color, setColor] = useState('');
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number>(0);
  const [residue, setResidue] = useState<number>(0);
  const [hexColor, setHexColor] = useState('#000000');
  
  const [filamentError, setFilamentError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
          setShowNew(false);
          setShowFilters(false);
        }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const numericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // disallow 'e', '+', '-' to avoid scientific notation and negatives
    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
      e.preventDefault();
    }
  };

  // sanitize decimal input (allow digits and one dot)
  const sanitizeDecimal = (value: string) => {
    if (!value) return '';
    // remove invalid chars
    let s = value.replace(/[^0-9.]/g, '');
    // keep only first dot
    const parts = s.split('.');
    if (parts.length <= 1) return parts[0];
    const first = parts.shift();
    return first + '.' + parts.join('');
  };

  const sanitizeInteger = (value: string) => {
    if (!value) return '';
    return value.replace(/\D/g, '');
  };

  const handleMinPriceChange = (v: string) => setMinPrice(sanitizeDecimal(v));
  const handleMaxPriceChange = (v: string) => setMaxPrice(sanitizeDecimal(v));
  const handleMinResidueChange = (v: string) => setMinResidue(sanitizeInteger(v));
  const handleMaxResidueChange = (v: string) => setMaxResidue(sanitizeInteger(v));

  const handleCreate = async () => {
    // client-side validation
    setFilamentError('');
    if (!color.trim()) {
      setFilamentError(t('errors.colorRequired'));
      return;
    }
    if (!typeId && types.length === 0) {
      setFilamentError(t('errors.selectType'));
      return;
    }
    if (price <= 0) {
      setFilamentError(t('errors.pricePositive'));
      return;
    }
    if (residue < 0) {
      setFilamentError(t('errors.residueNonNegative'));
      return;
    }
    if (!/^#([0-9A-Fa-f]{6})$/.test(hexColor)) {
      setFilamentError(t('errors.hexInvalid'));
      return;
    }

    try {
      await create({ color, typeId: typeId || types[0]?.id, pricePerGram: price, residue, hexColor } as any);
      await fetchAll();
      setShowNew(false);
    } catch (err: any) {
      setFilamentError(err.response?.data?.message || err.message || t('errors.createFilamentFailed'));
    }
  };

  // apply filters (compute filtered array before rendering)
  const numMinPrice = minPrice ? Number(minPrice) : undefined;
  const numMaxPrice = maxPrice ? Number(maxPrice) : undefined;
  const numMinResidue = minResidue ? Number(minResidue) : undefined;
  const numMaxResidue = maxResidue ? Number(maxResidue) : undefined;

  const filtered = filaments.filter(f => {
    if (searchColor.trim()) {
      const q = searchColor.trim().toLowerCase();
      const colorMatch = String(f.color || '').toLowerCase().includes(q);
      const hexMatch = String(f.hexColor || '').toLowerCase().includes(q);
      if (!colorMatch && !hexMatch) return false;
    }
    if (typeof numMinPrice === 'number' && (f.pricePerGram ?? 0) < numMinPrice) return false;
    if (typeof numMaxPrice === 'number' && (f.pricePerGram ?? 0) > numMaxPrice) return false;
    if (typeof numMinResidue === 'number' && (f.residue ?? 0) < numMinResidue) return false;
    if (typeof numMaxResidue === 'number' && (f.residue ?? 0) > numMaxResidue) return false;
    return true;
  });

  // apply sorting
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'color') {
      const A = String(a.color || a.hexColor || '').toLowerCase();
      const B = String(b.color || b.hexColor || '').toLowerCase();
      return A.localeCompare(B) * dir;
    }
    if (sortBy === 'price') {
      return ((a.pricePerGram ?? 0) - (b.pricePerGram ?? 0)) * dir;
    }
    if (sortBy === 'residue') {
      return ((a.residue ?? 0) - (b.residue ?? 0)) * dir;
    }
    return 0;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('filaments.title')}</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowNew(s => { const next = !s; if (next) { setShowFilters(false); } return next; })} variant="primary">{t('filaments.newFilament')}</Button>
          {/* New Type moved to separate page */}
          <Button aria-label={t('filters.open')} className="px-4 py-2 text-base flex items-center justify-center" onClick={() => setShowFilters(s => { const next = !s; if (next) { setShowNew(false); } return next; })} variant="secondary"> 
            {/* Inline SVG uses currentColor so we can control it via Tailwind (text-white) */}
            <svg className="h-5 w-5 text-white" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M0 3H16V1H0V3Z" fill="currentColor"/>
              <path d="M2 7H14V5H2V7Z" fill="currentColor"/>
              <path d="M4 11H12V9H4V11Z" fill="currentColor"/>
              <path d="M10 15H6V13H10V15Z" fill="currentColor"/>
            </svg>
          </Button>
          { (searchColor || minPrice || maxPrice || minResidue || maxResidue) ? (
            <Button variant="secondary" size="sm" onClick={() => { setSearchColor(''); setMinPrice(''); setMaxPrice(''); setMinResidue(''); setMaxResidue(''); }}>{t('filters.clear')}</Button>
          ) : null }
        </div>
      </div>

      {/* Inline compact filters removed — filters are available via the Filters modal */}

      {showNew && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowNew(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{t('filaments.newFilamentTitle')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('filaments.color')} value={color} onChange={e => setColor(e.target.value)} />
              <select value={typeId} onChange={e => setTypeId(Number(e.target.value))} className="border rounded px-3 py-2">
                <option value={undefined}>{t('filaments.selectType')}</option>
                {types.map(tp => (<option key={tp.id} value={tp.id}>{tp.name}</option>))}
              </select>
              <Input label={t('filaments.pricePerGram')} type="number" value={String(price)} onChange={e => setPrice(Number(e.target.value))} />
              <Input label={t('filaments.residue')} type="number" value={String(residue)} onChange={e => setResidue(Number(e.target.value))} />
              <Input label={t('filaments.hexColor')} value={hexColor} onChange={e => setHexColor(e.target.value)} />
            </div>
            {filamentError && (
              <div className="mt-3 text-sm text-red-600">{filamentError}</div>
            )}
            <div className="mt-4">
              <Button onClick={handleCreate} variant="primary">{t('common.create')}</Button>
              <Button onClick={() => setShowNew(false)} variant="secondary" className="ml-2">{t('common.cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowFilters(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{t('filters.open')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder={t('filters.color')}
                aria-label={t('filters.color')}
                value={searchColor}
                onChange={e => setSearchColor(e.target.value)}
                className="py-1 text-sm"
              />
              <div className="flex space-x-2">
                <Input
                  placeholder={t('filters.priceMin')}
                  aria-label={t('filters.priceMin')}
                  type="number"
                  min={0}
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  onKeyDown={numericKeyDown}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); const text = e.clipboardData.getData('text'); handleMinPriceChange(text); }}
                  value={minPrice}
                  onChange={e => handleMinPriceChange(e.target.value)}
                  className="py-1 text-sm"
                />
                <Input
                  placeholder={t('filters.priceMax')}
                  aria-label={t('filters.priceMax')}
                  type="number"
                  min={0}
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  onKeyDown={numericKeyDown}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); const text = e.clipboardData.getData('text'); handleMaxPriceChange(text); }}
                  value={maxPrice}
                  onChange={e => handleMaxPriceChange(e.target.value)}
                  className="py-1 text-sm"
                />
              </div>
              <div className="flex space-x-2">
                <Input
                  placeholder={t('filters.residueMin')}
                  aria-label={t('filters.residueMin')}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyDown={numericKeyDown}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); const text = e.clipboardData.getData('text'); handleMinResidueChange(text); }}
                  value={minResidue}
                  onChange={e => handleMinResidueChange(e.target.value)}
                  className="py-1 text-sm"
                />
                <Input
                  placeholder={t('filters.residueMax')}
                  aria-label={t('filters.residueMax')}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyDown={numericKeyDown}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); const text = e.clipboardData.getData('text'); handleMaxResidueChange(text); }}
                  value={maxResidue}
                  onChange={e => handleMaxResidueChange(e.target.value)}
                  className="py-1 text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">{t('filters.sortBy')}:</label>
                <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                  <option value="color">{t('filters.sortField.color')}</option>
                  <option value="price">{t('filters.sortField.price')}</option>
                  <option value="residue">{t('filters.sortField.residue')}</option>
                </select>
                <button className="px-2 py-1 text-sm border rounded" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>{sortOrder === 'asc' ? t('filters.order.asc') : t('filters.order.desc')}</button>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={() => setShowFilters(false)}>{t('common.apply') || 'Apply'}</Button>
              <Button variant="secondary" className="ml-2" onClick={() => setShowFilters(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Filament types UI moved to /filament-types */}

  <FilamentTable filaments={sorted} loading={loading} onEdit={() => {}} onDelete={(id) => remove(id)} />

      {/* Types listing removed from this page — moved to Filament Types page */}
    </div>
  );
};

export default Filaments;
