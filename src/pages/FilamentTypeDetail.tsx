import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Filament, FilamentType } from '../types';
import { useFilaments } from '../hooks/useFilaments';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTranslation } from 'react-i18next';

const FilamentTypeDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRu = i18n.language?.startsWith('ru');

  const { 
    types, 
    filaments: allFilaments, 
    loading: dataLoading, 
    error: dataError,
    create, 
    update, 
    remove,
    updateType,
    deleteType,
  } = useFilaments();

  const [type, setType] = useState<FilamentType | null>(null);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  
  const [error, setError] = useState('');
  const [searchColor, setSearchColor] = useState('');
  // modal (temporary) filter values — users edit these inside the Filters modal
  const [modalMinPrice, setModalMinPrice] = useState<string>('');
  const [modalMaxPrice, setModalMaxPrice] = useState<string>('');
  const [modalMinResidue, setModalMinResidue] = useState<string>('');
  const [modalMaxResidue, setModalMaxResidue] = useState<string>('');
  // applied filter values — used by the actual filtering logic
  const [appliedMinPrice, setAppliedMinPrice] = useState<string>('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<string>('');
  const [appliedMinResidue, setAppliedMinResidue] = useState<string>('');
  const [appliedMaxResidue, setAppliedMaxResidue] = useState<string>('');
  const [sortBy, setSortBy] = useState<'color' | 'price' | 'residue'>('color');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  // type edit/delete state
  const [editingType, setEditingType] = useState(false);
  const [typeNameEdit, setTypeNameEdit] = useState('');
  const [typeDescriptionEdit, setTypeDescriptionEdit] = useState('');
  const [typeEditError, setTypeEditError] = useState('');
  const [confirmDeleteType, setConfirmDeleteType] = useState(false);

  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filamentEditError, setFilamentEditError] = useState<string>('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (dataLoading) return;

    let found: FilamentType | null = null;
    if (slug) {
      const decoded = decodeURIComponent(slug);
      const asNumber = Number(decoded);
      if (!Number.isNaN(asNumber)) {
        found = types.find(t => t.id === asNumber) || null;
      }
      if (!found) {
        const q = decoded.trim().toLowerCase();
        found = types.find(t => (t.name || '').trim().toLowerCase() === q) || null;
      }
    }
    setType(found);

    if (found) {
      setFilaments(allFilaments.filter(f => f.type.id === found!.id));
    } else {
      setFilaments([]);
    }
    
    if (dataError) {
      setError(dataError);
    }

  }, [slug, types, allFilaments, dataLoading, dataError]);

  if (dataLoading && !type) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !type) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-700">{error || t('filaments.typeNotFound') || 'Type not found'}</div>
          <Button onClick={() => navigate('/filament-types')} className="mt-2">
            {t('common.back') || 'Back'}
          </Button>
        </div>
      </div>
    );
  }

  const numericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
      e.preventDefault();
    }
  };

  const hexToRgb = (hex: string) => {
    // accept only 6-digit (#RRGGBB) hex format
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

  const numMinPrice = appliedMinPrice ? Number(appliedMinPrice) : undefined;
  const numMaxPrice = appliedMaxPrice ? Number(appliedMaxPrice) : undefined;
  const numMinResidue = appliedMinResidue ? Number(appliedMinResidue) : undefined;
  const numMaxResidue = appliedMaxResidue ? Number(appliedMaxResidue) : undefined;

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

  const closeEditingModal = () => {
    // attempt to reliably close the native color picker before unmounting the input
    try {
      // also blur whatever currently has focus
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === 'function') active.blur();
      // as a fallback, focus body then blur
      (document.body as HTMLElement).focus?.();
    } catch (e) {
      void e; // ignore
    }
    // Delay unmount slightly to give native picker a chance to close
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
      // validations similar to type edit
      // validations similar to type edit
      const colorVal = String(editingFilament.color || '').trim();
      if (!colorVal) {
        setFilamentEditError(t('errors.colorRequired') || 'Color is required');
        return;
      }
      if (colorVal.length > 30) {
        setFilamentEditError('Color must be at most 30 characters');
        return;
      }
      const price = Number(editingFilament.pricePerGram);
      if (Number.isNaN(price) || price < 0) {
        setFilamentEditError(t('errors.pricePositive') || 'Price per gram must be greater than 0');
        return;
      }
      const residueVal = Number(editingFilament.residue);
      if (Number.isNaN(residueVal) || residueVal < 0) {
        setFilamentEditError(t('errors.residueNonNegative') || 'Residue must be 0 or positive');
        return;
      }
      let hex = String(editingFilament.hexColor || '').trim();
      if (!hex.startsWith('#')) hex = '#' + hex;
      // allow only 6-hex digits after '#'
      if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) {
        setFilamentEditError(t('errors.hexInvalid') || 'Hex color must be a valid 6-digit hex, e.g. #00FF00');
        return;
      }

      const payload = {
        color: colorVal,
        typeId: editingFilament.type.id,
        pricePerGram: price,
        residue: residueVal,
        hexColor: hex,
      } as any;

      if (isCreating) {
        // create new filament for this type
        if (!type) {
          setFilamentEditError('Cannot create filament: type information is missing.');
          return;
        }
        await create(payload, type);
        // create() in the hook already updates the shared filaments list; just close modal
        setIsCreating(false);
        closeEditingModal();
      } else {
        if (!editingFilament.id) {
          console.error('No id on editingFilament, aborting update');
          return;
        }
  await update(editingFilament.id, payload);
        closeEditingModal();
      }
      requestAnimationFrame(() => window.scrollTo(0, y));
    } catch (err) {
      console.error('Failed to update filament', err);
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
        <div className="flex items-center space-x-4">
          <Button onClick={() => navigate('/filament-types')} variant="secondary">
            {t('common.back') || 'Back'}
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{type.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={() => {
            setTypeNameEdit(type.name);
            setTypeDescriptionEdit(type.description || '');
            setTypeEditError('');
            setEditingType(true);
          }}>{t('common.edit') || 'Edit'}</Button>
          <Button variant="danger" onClick={() => setConfirmDeleteType(true)}>{t('common.delete') || 'Delete'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
      <h2 className="text-lg font-semibold mb-3">{t('filaments.description') || 'Description'}</h2>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{type.description || '—'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t('filaments.filamentsTitle', {count: filaments.length}) || `Filaments (${filaments.length})`}</h2>
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
                  <option value="color">{t('filters.sortField.color') || 'Color'}</option>
                  <option value="price">{t('filters.sortField.price') || 'Price'}</option>
                  <option value="residue">{t('filters.sortField.residue') || 'Residue'}</option>
                </select>
                <button className="px-2 py-1 text-sm border rounded" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>{sortOrder === 'asc' ? (isRu ? (t('filters.orderDisplayAsc') || 'А → Я') : (t('filters.orderDisplayAsc') || 'A → Z')) : (isRu ? (t('filters.orderDisplayDesc') || 'Я → А') : (t('filters.orderDisplayDesc') || 'Z → A'))}</button>
              </div>

              <Button aria-label="filters" size="sm" onClick={() => {
                if (!showFilters) {
                  // prefill modal inputs from applied filters when opening
                  setModalMinPrice(appliedMinPrice);
                  setModalMaxPrice(appliedMaxPrice);
                  setModalMinResidue(appliedMinResidue);
                  setModalMaxResidue(appliedMaxResidue);
                }
                setShowFilters(s => !s);
              }} variant="secondary">{t('filaments.filters') || 'Filters'}</Button>
              <Button variant="primary" size="sm" onClick={() => {
                setEditingFilament({ id: 0, color: '', type: type as FilamentType, pricePerGram: 0, residue: 0, hexColor: '#FFFFFF' });
                setIsCreating(true);
              }}>
                <svg className="w-4 h-4 mr-1 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('filaments.newFilament') || 'Add Filament'}
              </Button>
              {(searchColor || appliedMinPrice || appliedMaxPrice || appliedMinResidue || appliedMaxResidue) ? (
                <Button variant="secondary" size="sm" onClick={() => { setSearchColor(''); setAppliedMinPrice(''); setAppliedMaxPrice(''); setAppliedMinResidue(''); setAppliedMaxResidue(''); }}>{t('filters.clear') || 'Clear'}</Button>
              ) : null}
            </div>
          </div>

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
                  <div className="flex items-center space-x-2">
                    {/* sort controls removed from modal; rendered in toolbar */}
                    <div />
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="primary" onClick={() => {
                    // apply modal values to the active filters
                    setAppliedMinPrice(modalMinPrice);
                    setAppliedMaxPrice(modalMaxPrice);
                    setAppliedMinResidue(modalMinResidue);
                    setAppliedMaxResidue(modalMaxResidue);
                    setShowFilters(false);
                  }}>{t('common.apply') || 'Apply'}</Button>
                  <Button variant="secondary" className="ml-2" onClick={() => setShowFilters(false)}>{t('common.cancel') || 'Cancel'}</Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Type modal */}
          {editingType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black opacity-50" onClick={() => setEditingType(false)} />
              <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4">{t('common.edit') || 'Edit Type'}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={t('filaments.typeName')} value={typeNameEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeNameEdit(e.target.value)} maxLength={10} />
                  <Input label={t('filaments.description')} value={typeDescriptionEdit} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTypeDescriptionEdit(e.target.value)} maxLength={300} multiline rows={4} />
                </div>
                {typeEditError && (
                  <div className="mt-3 text-sm text-red-600">{typeEditError}</div>
                )}
                <div className="mt-4">
                  <Button onClick={async () => {
                    setTypeEditError('');
                    const name = typeNameEdit.trim();
                    if (!name) {
                      setTypeEditError(t('errors.typeNameRequired'));
                      return;
                    }
                    if (name.length > 10) {
                      setTypeEditError(t('errors.typeNameTooLong'));
                      return;
                    }
                    if (typeDescriptionEdit.trim().length > 300) {
                      setTypeEditError('Description must be at most 300 characters');
                      return;
                    }
                    try {
                      if (type && type.id) {
                        const updated = await updateType(type.id, { name, description: typeDescriptionEdit });
                        setType(updated);
                      }
                      setEditingType(false);
                    } catch (err: any) {
                      setTypeEditError(err.response?.data?.message || err.message || t('errors.updateTypeFailed'));
                    }
                  }} variant="primary">{t('common.save') || 'Save'}</Button>
                  <Button variant="secondary" className="ml-2" onClick={() => setEditingType(false)}>{t('common.cancel') || 'Cancel'}</Button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Type confirmation modal */}
          {confirmDeleteType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black opacity-50" onClick={() => setConfirmDeleteType(false)} />
              <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-3">{t('common.confirm') || 'Confirm'}</h3>
                <p className="mb-4">{t('common.confirmDeleteGeneric')}</p>
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setConfirmDeleteType(false)}>{t('common.cancel') || 'Cancel'}</Button>
                  <Button variant="danger" className="ml-2" onClick={async () => {
                    try {
                      if (type && type.id) {
                        await deleteType(type.id);
                      }
                      setConfirmDeleteType(false);
                      navigate(-1);
                    } catch (err) {
                      console.error('Failed to delete type', err);
                      setConfirmDeleteType(false);
                    }
                  }}>{t('common.delete') || 'Delete'}</Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {sorted.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 rounded-md" style={{ background: f.hexColor || '#ddd' }} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.color || (t('filaments.unnamed') || 'Unnamed')}</div>
                    <div className="text-sm text-gray-500 truncate">{f.residue ? `${t('filaments.residueLabel') || 'Residue'}: ${f.residue}` : (t('filaments.noResidueInfo') || 'No residue info')}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{(f.pricePerGram ?? 0).toFixed(2)} BYN/g</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => { setEditingFilament(f); setIsCreating(false); }}>{t('common.edit') || 'Edit'}</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteId(f.id)}>{t('common.delete') || 'Delete'}</Button>
                  </div>
                </div>
              </div>
            ))}
            {sorted.length === 0 && (
              <p className="text-gray-500 text-center py-6">{t('filaments.noFilaments') || 'No filaments available for this type.'}</p>
            )}
          </div>
          {/* Edit modal */}
          {editingFilament && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black opacity-50" onClick={() => closeEditingModal()} />
              <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">{isCreating ? (t('filaments.newFilamentTitle') || 'New Filament') : (t('filaments.editFilament') || 'Edit Filament')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        // allow user to type '#' optionally; count only hex digits and cap to 6
                        let raw = String(e.target.value || '');
                        // remove any non-hex/non-# chars
                        raw = raw.replace(/[^#0-9a-fA-F]/g, '');
                        // strip leading hashes then take up to 6 hex chars
                        const digits = raw.replace(/^#+/, '').slice(0, 6);
                        const v = '#' + digits;
                        setEditingFilament({ ...editingFilament, hexColor: v });
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-start space-x-2">
                    <div className="w-36 h-24 rounded-md border" style={{ background: (editingFilament.hexColor && /^#([0-9A-Fa-f]{6})$/.test(editingFilament.hexColor) ? editingFilament.hexColor : '#FFFFFF') }} />
                    <div className="flex-1">
                      {/* RGB sliders */}
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
                    // Allow empty string, numbers, and a single decimal point
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
            (() => {
              return (
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
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default FilamentTypeDetail;
