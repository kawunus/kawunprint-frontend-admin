import React, { useEffect, useMemo, useState } from 'react';
import { usePrinters } from '../hooks/usePrinters';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Printer } from '../types';
import { useNavigate } from 'react-router-dom';

const Printers: React.FC = () => {
  const { printers, loading, error, create, update, remove, setActive } = usePrinters();
  const { t, i18n } = useTranslation();
  const isRu = i18n.language?.startsWith('ru');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'active' | 'multicolor'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  // Modal filters temp
  const [modalActive, setModalActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalMulticolor, setModalMulticolor] = useState<'all' | 'yes' | 'no'>('all');
  // Applied filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [multiFilter, setMultiFilter] = useState<'all' | 'yes' | 'no'>('all');

  const [editing, setEditing] = useState<Printer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFilters(false);
        setEditing(null);
        setIsCreating(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    let arr = printers;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (activeFilter !== 'all') {
      const state = activeFilter === 'active';
      arr = arr.filter(p => p.isActive === state);
    }
    if (multiFilter !== 'all') {
      const want = multiFilter === 'yes';
      arr = arr.filter(p => p.isMulticolor === want);
    }
    return arr;
  }, [printers, search, activeFilter, multiFilter]);

  const sorted = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      if (sortBy === 'active') {
        return ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0)) * dir;
      }
      if (sortBy === 'multicolor') {
        return ((a.isMulticolor ? 1 : 0) - (b.isMulticolor ? 1 : 0)) * dir;
      }
      return 0;
    });
  }, [filtered, sortBy, sortOrder]);

  const validate = (p: Printer) => {
    const name = (p.name || '').trim();
    if (!name) return t('errors.printers.nameRequired') || 'Name is required';
    if (name.length > 50) return t('errors.printers.nameTooLong') || 'Name must be at most 50 chars';
    if ((p.description || '').length > 200) return t('errors.printers.descTooLong') || 'Description at most 200 chars';
    return '';
  };

  const handleSave = async () => {
    if (!editing) return;
    const err = validate(editing);
    if (err) { setFormError(err); return; }
    if (isCreating) {
      await create({ name: editing.name.trim(), isMulticolor: !!editing.isMulticolor, isActive: editing.isActive, description: editing.description || '' });
    } else {
      await update(editing.id, { name: editing.name.trim(), isMulticolor: !!editing.isMulticolor, isActive: editing.isActive, description: editing.description || '' });
    }
    setIsCreating(false);
    setEditing(null);
    setFormError('');
  };

  const toggleActive = async (p: Printer) => {
    await setActive(p.id, !p.isActive);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('printers.title') || 'Printers'}</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('printers.searchPlaceholder') || (isRu ? 'поиск принтера' : 'Search printer')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 text-sm py-1.5 h-9 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="sr-only">{t('filters.sortBy') || 'Sort by'}</label>
            <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="name">{t('printers.sortField.name') || 'Name'}</option>
              <option value="active">{t('printers.sortField.active') || 'Active'}</option>
              <option value="multicolor">{t('printers.sortField.multicolor') || 'Multicolor'}</option>
            </select>
            <button className="px-2 py-1 text-sm border rounded" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? (isRu ? (t('filters.orderDisplayAsc') || 'А → Я') : (t('filters.orderDisplayAsc') || 'A → Z')) : (isRu ? (t('filters.orderDisplayDesc') || 'Я → А') : (t('filters.orderDisplayDesc') || 'Z → A'))}
            </button>
          </div>

          <Button aria-label="filters" size="sm" onClick={() => {
            if (!showFilters) {
              setModalActive(activeFilter);
              setModalMulticolor(multiFilter);
            }
            setShowFilters(s => !s);
          }} variant="secondary">{t('printers.filters') || 'Filters'}</Button>
          <Button variant="primary" size="sm" onClick={() => {
            setEditing({ id: 0, name: '', isMulticolor: false, isActive: false, description: '' });
            setIsCreating(true);
          }}>
            <svg className="w-4 h-4 mr-1 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('printers.new') || 'Add Printer'}
          </Button>
          {(search || activeFilter !== 'all' || multiFilter !== 'all') ? (
            <Button variant="secondary" size="sm" onClick={() => {
              setSearch('');
              setActiveFilter('all');
              setMultiFilter('all');
            }}>{t('filters.clear') || 'Clear'}</Button>
          ) : null}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowFilters(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('printers.filters') || 'Filters'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('printers.filter.active') || 'Active state'}</label>
                <select className="border rounded px-2 py-2 text-sm w-full" value={modalActive} onChange={(e) => setModalActive(e.target.value as any)}>
                  <option value="all">{t('printers.filter.all') || 'All'}</option>
                  <option value="active">{t('printers.filter.activeOnly') || 'Active only'}</option>
                  <option value="inactive">{t('printers.filter.inactiveOnly') || 'Inactive only'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('printers.filter.multicolor') || 'Multicolor'}</label>
                <select className="border rounded px-2 py-2 text-sm w-full" value={modalMulticolor} onChange={(e) => setModalMulticolor(e.target.value as any)}>
                  <option value="all">{t('printers.filter.all') || 'All'}</option>
                  <option value="yes">{t('printers.filter.yes') || 'Yes'}</option>
                  <option value="no">{t('printers.filter.no') || 'No'}</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={() => { setActiveFilter(modalActive); setMultiFilter(modalMulticolor); setShowFilters(false); }}>{t('common.apply') || 'Apply'}</Button>
              <Button variant="secondary" className="ml-2" onClick={() => setShowFilters(false)}>{t('common.cancel') || 'Cancel'}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
        ) : (
          <div className="space-y-3">
            {sorted.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-sm text-gray-500 truncate">{p.description || (t('printers.noDescription') || 'No description')}</div>
                    <div className="text-xs text-gray-500 truncate">{p.isMulticolor ? (t('printers.multicolor') || 'Multicolor') : (t('printers.singlecolor') || 'Single color')}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Active switch */}
                  <button onClick={() => toggleActive(p)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${p.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${p.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  {/* Actions: Edit/Delete on top row, Details below spanning exactly their combined width */}
                  <div className="flex flex-col items-stretch gap-2">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="secondary" onClick={() => { setEditing(p); setIsCreating(false); }}>{t('common.edit') || 'Edit'}</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteId(p.id)}>{t('common.delete') || 'Delete'}</Button>
                    </div>
                    <Button size="sm" variant="primary" className="w-full justify-center" onClick={() => navigate(`/printers/${p.id}`)}>{t('printers.details') || 'Details'}</Button>
                  </div>
                </div>
              </div>
            ))}
            {sorted.length === 0 && (
              <p className="text-gray-500 text-center py-6">{t('printers.empty') || 'No printers found.'}</p>
            )}
          </div>
        )}
      </div>

      {/* Edit/Create modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setEditing(null); setIsCreating(false); setFormError(''); }} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{isCreating ? (t('printers.newTitle') || 'New Printer') : (t('printers.editTitle') || 'Edit Printer')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="sm:col-span-2">
                <Input
                  label={t('printers.name') || 'Name'}
                  value={editing.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, name: e.target.value })}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('printers.multicolor') || 'Multicolor'}</label>
                <label className="inline-flex items-center">
                  <input
                    id="isMulti"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={editing.isMulticolor}
                    onChange={(e) => setEditing({ ...editing, isMulticolor: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('common.yes') || 'Yes'}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('printers.active') || 'Active'}</label>
                <label className="inline-flex items-center">
                  <input
                    id="isActive"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={editing.isActive}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('common.yes') || 'Yes'}</span>
                </label>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label={t('printers.description') || 'Description'}
                  multiline
                  rows={3}
                  value={editing.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditing({ ...editing, description: e.target.value })}
                  maxLength={200}
                />
              </div>
            </div>
            {formError && (
              <div className="mt-3 text-sm text-red-600">{formError}</div>
            )}
            <div className="mt-4">
              <Button variant="primary" onClick={handleSave}>{t('common.save') || 'Save'}</Button>
              <Button variant="secondary" className="ml-2" onClick={() => { setEditing(null); setIsCreating(false); setFormError(''); }}>{t('common.cancel') || 'Cancel'}</Button>
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
            <p className="mb-4">{t('printers.confirmDelete') || 'Are you sure you want to delete this printer?'}</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDeleteId(null)}>{t('common.cancel') || 'Cancel'}</Button>
              <Button variant="danger" className="ml-2" onClick={async () => { await remove(deleteId as number); setDeleteId(null); }}>{t('common.delete') || 'Delete'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Printers;
