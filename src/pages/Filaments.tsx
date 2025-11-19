import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilaments } from '../hooks/useFilaments';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Filament, FilamentType } from '../types';
import { useAuth } from '../hooks/useAuth';

export const Filaments: React.FC = () => {
  const { filaments: allFilaments, types, loading, error, create, update, remove } = useFilaments();
  const { t, i18n } = useTranslation();
  const isRu = i18n.language?.startsWith('ru');
  const { isAdmin } = useAuth();

  // Filters toolbar state (search + applied filters)
  const [searchColor, setSearchColor] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState<string>('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<string>('');
  const [appliedMinResidue, setAppliedMinResidue] = useState<string>('');
  const [appliedMaxResidue, setAppliedMaxResidue] = useState<string>('');
  const [appliedTypeId, setAppliedTypeId] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'type' | 'color' | 'price' | 'residue'>('color');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  // Filters modal temp state
  const [modalMinPrice, setModalMinPrice] = useState<string>('');
  const [modalMaxPrice, setModalMaxPrice] = useState<string>('');
  const [modalMinResidue, setModalMinResidue] = useState<string>('');
  const [modalMaxResidue, setModalMaxResidue] = useState<string>('');
  const [modalTypeId, setModalTypeId] = useState<number | ''>('');

  // Edit/Create modal state
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filamentEditError, setFilamentEditError] = useState<string>('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFilters(false);
        setEditingFilament(null);
        setIsCreating(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const numericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
      e.preventDefault();
    }
  };

  const hexToRgb = (hex: string) => {
    const m = /^#?([0-9a-fA-F]{6})$/.exec((hex || '').trim());
    if (!m) return null;
    const v = m[1];
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return { r, g, b };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  const sanitizeDecimal = (value: string) => {
    if (!value) return '';
    const s = value.replace(/[^0-9.]/g, '');
    const parts = s.split('.');
    if (parts.length <= 1) return parts[0];
    const first = parts.shift();
    return first + '.' + parts.join('');
  };

  const sanitizeInteger = (value: string) => {
    if (!value) return '';
    return value.replace(/\D/g, '');
  };

  // Active filters numeric values
  const numMinPrice = appliedMinPrice ? Number(appliedMinPrice) : undefined;
  const numMaxPrice = appliedMaxPrice ? Number(appliedMaxPrice) : undefined;
  const numMinResidue = appliedMinResidue ? Number(appliedMinResidue) : undefined;
  const numMaxResidue = appliedMaxResidue ? Number(appliedMaxResidue) : undefined;

  // Compute filtered list
  const filtered = allFilaments.filter(f => {
    if (searchColor.trim()) {
      const q = searchColor.trim().toLowerCase();
      const colorMatch = String(f.color || '').toLowerCase().includes(q);
      const hexMatch = String(f.hexColor || '').toLowerCase().includes(q);
      if (!colorMatch && !hexMatch) return false;
    }
    if (appliedTypeId && f.type.id !== appliedTypeId) return false;
    if (typeof numMinPrice === 'number' && (f.pricePerGram ?? 0) < numMinPrice) return false;
    if (typeof numMaxPrice === 'number' && (f.pricePerGram ?? 0) > numMaxPrice) return false;
    if (typeof numMinResidue === 'number' && (f.residue ?? 0) < numMinResidue) return false;
    if (typeof numMaxResidue === 'number' && (f.residue ?? 0) > numMaxResidue) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'type') {
      const A = String(a.type?.name || '').toLowerCase();
      const B = String(b.type?.name || '').toLowerCase();
      return A.localeCompare(B) * dir;
    }
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

  const closeEditingModal = () => {
    try {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === 'function') active.blur();
      (document.body as HTMLElement).focus?.();
  } catch (e) { void e; }
    setTimeout(() => {
      setEditingFilament(null);
      setFilamentEditError('');
      setIsCreating(false);
    }, 120);
  };

  const handleSaveEdit = async () => {
    if (!editingFilament) return;
    try {
      setFilamentEditError('');
      const y = window.scrollY;
      const colorVal = String(editingFilament.color || '').trim();
      if (!colorVal) { setFilamentEditError(t('errors.colorRequired') || 'Color is required'); return; }
      if (colorVal.length > 30) { setFilamentEditError('Color must be at most 30 characters'); return; }
      const price = Number(editingFilament.pricePerGram);
      if (Number.isNaN(price) || price < 0) { setFilamentEditError(t('errors.pricePositive') || 'Price per gram must be greater than 0'); return; }
      const residueVal = Number(editingFilament.residue);
      if (Number.isNaN(residueVal) || residueVal < 0) { setFilamentEditError(t('errors.residueNonNegative') || 'Residue must be 0 or positive'); return; }
      let hex = String(editingFilament.hexColor || '').trim();
      if (!hex.startsWith('#')) hex = '#' + hex;
      if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) { setFilamentEditError(t('errors.hexInvalid') || 'Hex color must be a valid 6-digit hex, e.g. #00FF00'); return; }

      const payload = {
        color: colorVal,
        typeId: editingFilament.type.id,
        pricePerGram: price,
        residue: residueVal,
        hexColor: hex,
      } as any;

      if (isCreating) {
        await create(payload as any);
        closeEditingModal();
      } else {
        if (!editingFilament.id) return;
        await update(editingFilament.id, payload);
        closeEditingModal();
      }
      requestAnimationFrame(() => window.scrollTo(0, y));
    } catch (err) {
      setFilamentEditError((err as any)?.response?.data?.message || String(err));
    }
  };

  const handleDelete = async (fid: number) => {
    try {
      const y = window.scrollY;
      await remove(fid);
      setDeleteId(null);
      requestAnimationFrame(() => window.scrollTo(0, y));
    } catch (err) {
      console.error('Failed to delete filament', err);
    }
  };

  const currentHexDigits = editingFilament ? String(editingFilament.hexColor || '').replace(/^#+/, '') : '';
  const isHexComplete = currentHexDigits.length === 6;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('filaments.title') || 'Filaments'}</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('filaments.searchColorPlaceholder') || 'Search color or hex'}
              value={searchColor}
              onChange={e => setSearchColor(e.target.value)}
              className="w-64 text-sm py-1.5 h-9 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="sr-only">{t('filters.sortBy') || 'Sort by'}</label>
            <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="type">{t('filters.sortField.type') || 'Type'}</option>
              <option value="color">{t('filters.sortField.color') || 'Color'}</option>
              <option value="price">{t('filters.sortField.price') || 'Price'}</option>
              <option value="residue">{t('filters.sortField.residue') || 'Residue'}</option>
            </select>
            <button className="px-2 py-1 text-sm border rounded" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? (isRu ? (t('filters.orderDisplayAsc') || 'А → Я') : (t('filters.orderDisplayAsc') || 'A → Z')) : (isRu ? (t('filters.orderDisplayDesc') || 'Я → А') : (t('filters.orderDisplayDesc') || 'Z → A'))}
            </button>
          </div>

          <Button aria-label="filters" size="sm" onClick={() => {
            if (!showFilters) {
              setModalMinPrice(appliedMinPrice);
              setModalMaxPrice(appliedMaxPrice);
              setModalMinResidue(appliedMinResidue);
              setModalMaxResidue(appliedMaxResidue);
              setModalTypeId(appliedTypeId);
            }
            setShowFilters(s => !s);
          }} variant="secondary">{t('filaments.filters') || 'Filters'}</Button>
          {isAdmin && (
            <Button variant="primary" size="sm" onClick={() => {
              const defaultType: FilamentType | undefined = types[0];
              setEditingFilament({ id: 0, color: '', type: (defaultType as any) as FilamentType, pricePerGram: 0, residue: 0, hexColor: '#FFFFFF' });
              setIsCreating(true);
            }}>
              <svg className="w-4 h-4 mr-1 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('filaments.newFilament') || 'Add Filament'}
            </Button>
          )}
          {(searchColor || appliedMinPrice || appliedMaxPrice || appliedMinResidue || appliedMaxResidue || appliedTypeId !== '') ? (
            <Button variant="secondary" size="sm" onClick={() => {
              setSearchColor('');
              setAppliedMinPrice('');
              setAppliedMaxPrice('');
              setAppliedMinResidue('');
              setAppliedMaxResidue('');
              setAppliedTypeId('');
            }}>{t('filters.clear') || 'Clear'}</Button>
          ) : null}
        </div>
      </div>

      {/* Filters modal */}
      {showFilters && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowFilters(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('filaments.filters') || 'Filters'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('filaments.pricePerGram') || 'Price per gram'}</label>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">{t('filaments.filter.from') || 'From'}</div>
                    <Input placeholder={t('filaments.filter.priceExample') || '0.00 BYN/g'} type="number" value={modalMinPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModalMinPrice(sanitizeDecimal(e.target.value))} onKeyDown={numericKeyDown} className="py-1 text-sm" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">{t('filaments.filter.to') || 'To'}</div>
                    <Input placeholder={t('filaments.filter.priceExample') || '0.00 BYN/g'} type="number" value={modalMaxPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModalMaxPrice(sanitizeDecimal(e.target.value))} onKeyDown={numericKeyDown} className="py-1 text-sm" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('filaments.residue') || 'Residue'}</label>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">{t('filaments.filter.from') || 'From'}</div>
                    <Input placeholder={t('filaments.filter.residueExample') || '0'} type="number" value={modalMinResidue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModalMinResidue(sanitizeInteger(e.target.value))} onKeyDown={numericKeyDown} className="py-1 text-sm" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">{t('filaments.filter.to') || 'To'}</div>
                    <Input placeholder={t('filaments.filter.residueExample') || '0'} type="number" value={modalMaxResidue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModalMaxResidue(sanitizeInteger(e.target.value))} onKeyDown={numericKeyDown} className="py-1 text-sm" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('filaments.type') || 'Type'}</label>
                <select className="border rounded px-2 py-2 text-sm w-full" value={modalTypeId as any} onChange={(e) => setModalTypeId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">{t('filaments.allTypes') || 'All types'}</option>
                  {types.map(tp => (
                    <option key={tp.id} value={tp.id}>{tp.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={() => {
                setAppliedMinPrice(modalMinPrice);
                setAppliedMaxPrice(modalMaxPrice);
                setAppliedMinResidue(modalMinResidue);
                setAppliedMaxResidue(modalMaxResidue);
                setAppliedTypeId(modalTypeId);
                setShowFilters(false);
              }}>{t('common.apply') || 'Apply'}</Button>
              <Button variant="secondary" className="ml-2" onClick={() => setShowFilters(false)}>{t('common.cancel') || 'Cancel'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
        ) : (
          <div className="space-y-3">
            {sorted.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 rounded-md" style={{ background: f.hexColor || '#ddd' }} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.color || (t('filaments.unnamed') || 'Unnamed')}</div>
                    <div className="text-sm text-gray-500 truncate">{f.type?.name ? `${t('filaments.type') || 'Type'}: ${f.type.name}` : ''}</div>
                    <div className="text-sm text-gray-500 truncate">{f.residue ? `${t('filaments.residueLabel') || 'Residue'}: ${f.residue}` : (t('filaments.noResidueInfo') || 'No residue info')}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{(f.pricePerGram ?? 0).toFixed(2)} BYN/g</div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="secondary" onClick={() => { setEditingFilament(f); setIsCreating(false); }}>{t('common.edit') || 'Edit'}</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteId(f.id)}>{t('common.delete') || 'Delete'}</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sorted.length === 0 && (
              <p className="text-gray-500 text-center py-6">{t('filaments.noFilaments') || 'No filaments found.'}</p>
            )}
          </div>
        )}
      </div>

      {/* Edit/Create modal */}
      {editingFilament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => closeEditingModal()} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{isCreating ? (t('filaments.newFilamentTitle') || 'New Filament') : (t('filaments.editFilament') || 'Edit Filament')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type selector only when creating */}
              {isCreating && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('filaments.type') || 'Type'}</label>
                  <select className="border rounded px-2 py-2 text-sm w-full" value={editingFilament.type?.id || ''} onChange={(e) => {
                    const id = Number(e.target.value);
                    const tp = types.find(x => x.id === id) as FilamentType | undefined;
                    if (tp) setEditingFilament({ ...editingFilament, type: tp });
                  }}>
                    {types.map(tp => (
                      <option key={tp.id} value={tp.id}>{tp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex space-x-4 sm:col-span-2 items-start">
                <Input label={t('filaments.color') || 'Color'} className="flex-1" value={editingFilament.color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingFilament({ ...editingFilament, color: e.target.value })} maxLength={30} />
                <Input
                  label={t('filaments.hexColor') || 'Hex color'}
                  className="w-44"
                  value={editingFilament.hexColor}
                  maxLength={7}
                  customCounter={(() => {
                    const digits = String(editingFilament.hexColor || '').replace(/^#+/, '');
                    const count = Math.min(digits.length, 6);
                    const complete = digits.length === 6;
                    return (
                      <p className={"mt-1 text-sm " + (complete ? 'text-gray-500' : 'text-red-600')}>
                        {count} / 6
                      </p>
                    );
                  })()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    let raw = String(e.target.value || '');
                    raw = raw.replace(/[^#0-9a-fA-F]/g, '');
                    const digits = raw.replace(/^#+/, '').slice(0, 6);
                    const v = '#' + digits;
                    setEditingFilament({ ...editingFilament, hexColor: v });
                  }}
                />
              </div>
              <div className="sm:col-span-2 flex items-start space-x-2">
                <div className="w-36 h-24 rounded-md border" style={{ background: (editingFilament.hexColor && /^#([0-9A-Fa-f]{6})$/.test(editingFilament.hexColor) ? editingFilament.hexColor : '#FFFFFF') }} />
                <div className="flex-1">
                  {(() => {
                    const rgb = hexToRgb(String(editingFilament.hexColor || '')) || { r: 255, g: 255, b: 255 };
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-xs w-6">R</div>
                          <input className="flex-1 w-full" type="range" min={0} max={255} value={rgb.r} onChange={(e) => setEditingFilament({ ...editingFilament, hexColor: rgbToHex(Number(e.target.value), rgb.g, rgb.b) })} />
                          <input type="number" min={0} max={255} value={rgb.r} onChange={(e) => { const v = Number(e.target.value) || 0; setEditingFilament({ ...editingFilament, hexColor: rgbToHex(v, rgb.g, rgb.b) }); }} className="w-16 text-sm border rounded px-1" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs w-6">G</div>
                          <input className="flex-1 w-full" type="range" min={0} max={255} value={rgb.g} onChange={(e) => setEditingFilament({ ...editingFilament, hexColor: rgbToHex(rgb.r, Number(e.target.value), rgb.b) })} />
                          <input type="number" min={0} max={255} value={rgb.g} onChange={(e) => { const v = Number(e.target.value) || 0; setEditingFilament({ ...editingFilament, hexColor: rgbToHex(rgb.r, v, rgb.b) }); }} className="w-16 text-sm border rounded px-1" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs w-6">B</div>
                          <input className="flex-1 w-full" type="range" min={0} max={255} value={rgb.b} onChange={(e) => setEditingFilament({ ...editingFilament, hexColor: rgbToHex(rgb.r, rgb.g, Number(e.target.value)) })} />
                          <input type="number" min={0} max={255} value={rgb.b} onChange={(e) => { const v = Number(e.target.value) || 0; setEditingFilament({ ...editingFilament, hexColor: rgbToHex(rgb.r, rgb.g, v) }); }} className="w-16 text-sm border rounded px-1" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <Input label={t('filaments.pricePerGram') || 'Price per gram'} type="number" value={String(editingFilament.pricePerGram)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                  setEditingFilament({ ...editingFilament, pricePerGram: value as any });
                }
              }} onKeyDown={numericKeyDown} />
              <Input label={t('filaments.residue') || 'Residue'} type="number" value={String(editingFilament.residue)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingFilament({ ...editingFilament, residue: Number(e.target.value) })} onKeyDown={numericKeyDown} />
            </div>
            {filamentEditError && (
              <div className="sm:col-span-2 mt-3 text-sm text-red-600">{filamentEditError}</div>
            )}
            <div className="sm:col-span-2 mt-4">
              <Button variant="primary" onClick={handleSaveEdit} disabled={!isHexComplete}>{t('common.save') || 'Save'}</Button>
              <Button variant="secondary" className="ml-2" onClick={() => closeEditingModal()}>{t('common.cancel') || 'Cancel'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setDeleteId(null)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">{t('common.confirm') || 'Confirm'}</h3>
            <p className="mb-4">{t('common.confirmDeleteGeneric')}</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDeleteId(null)}>{t('common.cancel') || 'Cancel'}</Button>
              <Button variant="danger" className="ml-2" onClick={() => handleDelete(deleteId as number)}>{t('common.delete') || 'Delete'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Filaments;
