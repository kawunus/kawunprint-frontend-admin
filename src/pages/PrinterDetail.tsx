import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePrinters } from '../hooks/usePrinters';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTranslation } from 'react-i18next';
import { Printer } from '../types';
import { usePrinterHistory } from '../hooks/usePrinterHistory';
import { formatLocalDateTime, parseDbDate } from '../utils/datetime';
import { getUserInfoFromToken } from '../utils/jwt';
import { printerHistoryApi } from '../api/printerHistory';

const PrinterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getById, update, setActive, remove } = usePrinters();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Printer | null>(null);
  const [err, setErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<number | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [modalUser, setModalUser] = useState<string>('all');
  const [modalDateFrom, setModalDateFrom] = useState<string>('');
  const [modalDateTo, setModalDateTo] = useState<string>('');
  const [appliedUser, setAppliedUser] = useState<string>('all');
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>('');
  const [appliedDateTo, setAppliedDateTo] = useState<string>('');
  const [appliedSortOrder, setAppliedSortOrder] = useState<'asc' | 'desc'>('desc');
  const printerId = Number(id);
  const { items: history, loading: historyLoading, error: historyError, refresh: refreshHistory } = usePrinterHistory(Number.isFinite(printerId) ? printerId : undefined);
  const userInfo = getUserInfoFromToken();
  const isAdmin = (userInfo?.role || '').toUpperCase() === 'ADMIN';

  // Build list of unique users from history for dropdown
  const userOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const h of history) {
      const id = String((h as any).employee?.id ?? (h as any).employeeId ?? '');
      if (!id) continue;
      const first = (h as any).employee?.firstName || '';
      const last = (h as any).employee?.lastName || '';
      const email = (h as any).employee?.email || '';
      const label = `${first} ${last}`.trim() || email || `#${id}`;
      if (!map.has(id)) map.set(id, { id, label });
    }
    return Array.from(map.values());
  }, [history]);

  const filteredHistory = React.useMemo(() => {
    let list = history;
    // user filter
    if (appliedUser && appliedUser !== 'all') {
      list = list.filter(h => String((h as any).employee?.id ?? (h as any).employeeId ?? '') === appliedUser);
    }
    // date filters
    if (appliedDateFrom) {
      const fromTs = new Date(appliedDateFrom).getTime();
      list = list.filter(h => (parseDbDate((h as any).occurredAt || (h as any).createdAt || (h as any).created)?.getTime() ?? 0) >= fromTs);
    }
    if (appliedDateTo) {
      const toTs = new Date(appliedDateTo).getTime();
      list = list.filter(h => (parseDbDate((h as any).occurredAt || (h as any).createdAt || (h as any).created)?.getTime() ?? 0) <= toTs);
    }
    // search in action/comment/user
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(h => {
        const action = String((h as any).action || '').toLowerCase();
        const comment = String((h as any).comment || '').toLowerCase();
        const first = String((h as any).employee?.firstName || '').toLowerCase();
        const last = String((h as any).employee?.lastName || '').toLowerCase();
        const email = String((h as any).employee?.email || '').toLowerCase();
        return action.includes(q) || comment.includes(q) || `${first} ${last}`.includes(q) || email.includes(q);
      });
    }
    // sort by date
    const dir = appliedSortOrder === 'asc' ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      const at = parseDbDate((a as any).occurredAt || (a as any).createdAt || (a as any).created)?.getTime() ?? 0;
      const bt = parseDbDate((b as any).occurredAt || (b as any).createdAt || (b as any).created)?.getTime() ?? 0;
      return dir * (at - bt);
    });
    return sorted;
  }, [history, appliedUser, appliedDateFrom, appliedDateTo, search, appliedSortOrder]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const p = await getById(Number(id));
        setPrinter(p);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/printers');
    }
  };

  const handleToggleActive = async () => {
    if (!printer || toggling) return;
    try {
      setToggling(true);
      await setActive(printer.id, !printer.isActive);
      setPrinter({ ...printer, isActive: !printer.isActive });
      // refresh history after user action
      await refreshHistory();
    } catch {
      // optionally surface an error message
    } finally {
      setToggling(false);
    }
  };

  const save = async () => {
    if (!edit) return;
    const name = edit.name.trim();
    if (!name) { setErr(t('errors.printers.nameRequired') || 'Name is required'); return; }
    await update(edit.id, { name, isMulticolor: edit.isMulticolor, isActive: edit.isActive, description: edit.description || '' });
    setPrinter(edit);
    setEdit(null);
    // refresh history after user edit
    await refreshHistory();
  };

  if (loading) return <div className="p-6"><div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div></div>;
  if (!printer) return <div className="p-6"><div className="rounded bg-red-50 p-4 text-red-700">{t('printers.notFound') || 'Printer not found'}</div></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={handleBack}>{t('common.back') || 'Back'}</Button>
          <h1 className="text-2xl font-bold">{printer.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={() => setEdit(printer)}>{t('common.edit') || 'Edit'}</Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>{t('common.delete') || 'Delete'}</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><div className="text-sm text-gray-500">{t('printers.name') || 'Name'}</div><div className="font-medium">{printer.name}</div></div>
          <div><div className="text-sm text-gray-500">{t('printers.multicolor') || 'Multicolor'}</div><div className="font-medium">{printer.isMulticolor ? t('common.yes') || 'Yes' : t('common.no') || 'No'}</div></div>
          <div>
            <div className="text-sm text-gray-500">{t('printers.active') || 'Active'}</div>
            <div className="flex items-center space-x-3 mt-1">
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${printer.isActive ? 'bg-blue-600' : 'bg-gray-300'} ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-pressed={printer.isActive}
                aria-label={t('printers.active') || 'Active'}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${printer.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="font-medium">{printer.isActive ? t('common.yes') || 'Yes' : t('common.no') || 'No'}</span>
            </div>
          </div>
          <div className="md:col-span-2"><div className="text-sm text-gray-500">{t('printers.description') || 'Description'}</div><div className="font-medium whitespace-pre-wrap">{printer.description || '-'}</div></div>
        </div>
      </div>

      {/* Printer history */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('printers.history.title') || 'Printer history'}</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t('printers.history.searchPlaceholder') || (i18n.language?.startsWith('ru') ? 'поиск в истории' : 'Search history')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64 text-sm py-1.5 h-9 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Sort controls 1:1 like Filaments: select + border rounded button */}
            <div className="flex items-center space-x-2">
              <label className="sr-only">{t('filters.sortBy') || 'Sort by'}</label>
              <select className="border rounded px-2 py-1 text-sm" value="date" disabled>
                <option value="date">{t('filters.sortField.date') || 'Date'}</option>
              </select>
              <button
                className="px-2 py-1 text-sm border rounded"
                onClick={() => setAppliedSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
                title={(appliedSortOrder === 'asc' ? (t('filters.order.asc') || 'Asc') : (t('filters.order.desc') || 'Desc'))}
              >
                {appliedSortOrder === 'asc' ? (t('filters.orderDisplayAsc') || 'A → Z') : (t('filters.orderDisplayDesc') || 'Z → A')}
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!showFilters) {
                  setModalUser(appliedUser);
                  setModalDateFrom(appliedDateFrom);
                  setModalDateTo(appliedDateTo);
                }
                setShowFilters(s => !s);
              }}
            >
              {t('filters.open') || 'Filters'}
            </Button>
            {(search || appliedUser !== 'all' || appliedDateFrom || appliedDateTo) && (
              <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setAppliedUser('all'); setAppliedDateFrom(''); setAppliedDateTo(''); setAppliedSortOrder('desc'); }}>
                {t('filters.clear') || 'Clear'}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={refreshHistory} className="transform transition-transform duration-150 hover:scale-105">{t('common.refresh') || 'Refresh'}</Button>
          </div>
        </div>
        {historyLoading ? (
          <div className="flex justify-center items-center h-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : historyError ? (
          <div className="rounded bg-red-50 p-3 text-red-700 text-sm">{historyError}</div>
        ) : history.length === 0 ? (
          <div className="text-gray-500 text-sm">{t('printers.history.empty') || 'No history yet'}</div>
        ) : (
          <ul className="relative">
            {/* vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" aria-hidden />
            {filteredHistory.map((h) => (
              <li key={h.id} className="pl-10 py-3 border-b last:border-b-0">
                <div className="relative">
                  <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium text-gray-900 truncate">
                      {h.action || t('printers.history.event') || 'Event'}{h.comment ? `: ${h.comment}` : ''}
                    </div>
                    <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                      {(() => {
                        const raw = (h as any).occurredAt || (h as any).createdAt || (h as any).created || (h as any).created_at || (h as any).timestamp || (h as any).date || '';
                        const friendly = formatLocalDateTime(
                          raw,
                          i18n?.language,
                          { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
                        );
                        return (
                          <div className="text-xs text-gray-500" title={raw}>
                            {friendly || raw}
                          </div>
                        );
                      })()}
                      
                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDeleteLogId(h.id)}
                        >
                          {t('printers.history.delete') || 'Delete'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {t('orders.by') || 'by'} {' '}
                    {(h.employee?.firstName || h.employee?.lastName) ? `${h.employee?.firstName || ''} ${h.employee?.lastName || ''}`.trim() : (t('common.unknown') || 'Unknown')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Filters modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowFilters(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('filters.title') || (i18n.language?.startsWith('ru') ? 'Фильтры' : 'Filters')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('printers.history.filter.user') || (i18n.language?.startsWith('ru') ? 'Пользователь' : 'User')}</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={modalUser}
                  onChange={e => setModalUser(e.target.value)}
                >
                  <option value="all">{t('printers.history.filter.userAny') || (i18n.language?.startsWith('ru') ? 'Любой' : 'All users')}</option>
                  {userOptions.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('printers.history.filter.dateFrom') || (i18n.language?.startsWith('ru') ? 'Дата с' : 'Date from')}</label>
                  <input
                    type="datetime-local"
                    value={modalDateFrom}
                    onChange={e => setModalDateFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1 italic inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M8 2v2M16 2v2M3 9h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t('printers.history.filter.dateExample') || (i18n.language?.startsWith('ru') ? 'Например: 2025-11-05 14:30' : 'Example: 2025-11-05 14:30')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('printers.history.filter.dateTo') || (i18n.language?.startsWith('ru') ? 'Дата по' : 'Date to')}</label>
                  <input
                    type="datetime-local"
                    value={modalDateTo}
                    onChange={e => setModalDateTo(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1 italic inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M8 2v2M16 2v2M3 9h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t('printers.history.filter.dateExample') || (i18n.language?.startsWith('ru') ? 'Например: 2025-11-05 14:30' : 'Example: 2025-11-05 14:30')}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setShowFilters(false)}>{t('common.cancel') || 'Cancel'}</Button>
              <Button
                variant="primary"
                className="ml-2"
                onClick={() => {
                  setAppliedUser(modalUser);
                  setAppliedDateFrom(modalDateFrom);
                  setAppliedDateTo(modalDateTo);
                  setShowFilters(false);
                }}
              >
                {t('common.apply') || (i18n.language?.startsWith('ru') ? 'Применить' : 'Apply')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setEdit(null)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('printers.editTitle') || 'Edit Printer'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('printers.name') || 'Name'} value={edit.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit({ ...edit, name: e.target.value })} maxLength={50} />
              <div className="flex items-center space-x-2">
                <input id="isMulti2" type="checkbox" checked={edit.isMulticolor} onChange={(e) => setEdit({ ...edit, isMulticolor: e.target.checked })} />
                <label htmlFor="isMulti2" className="text-sm text-gray-700">{t('printers.multicolor') || 'Multicolor'}</label>
              </div>
              <div className="flex items-center space-x-2">
                <input id="isActive2" type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
                <label htmlFor="isActive2" className="text-sm text-gray-700">{t('printers.active') || 'Active'}</label>
              </div>
              <Input label={t('printers.description') || 'Description'} multiline rows={3} value={edit.description || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEdit({ ...edit, description: e.target.value })} maxLength={200} />
            </div>
            {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
            <div className="mt-4">
              <Button variant="primary" onClick={save}>{t('common.save') || 'Save'}</Button>
              <Button variant="secondary" className="ml-2" onClick={() => setEdit(null)}>{t('common.cancel') || 'Cancel'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete history log confirmation */}
      {confirmDeleteLogId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => !deletingLog && setConfirmDeleteLogId(null)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">{t('common.confirm') || 'Confirm'}</h3>
            <p className="mb-4">{t('printers.history.deleteConfirm') || 'Delete this log?'}</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setConfirmDeleteLogId(null)} disabled={deletingLog}>{t('common.cancel') || 'Cancel'}</Button>
              <Button
                variant="danger"
                className="ml-2"
                onClick={async () => {
                  if (confirmDeleteLogId == null) return;
                  try {
                    setDeletingLog(true);
                    await printerHistoryApi.remove(confirmDeleteLogId);
                    setConfirmDeleteLogId(null);
                    await refreshHistory();
                  } catch (e) {
                    console.error('Failed to delete log', e);
                    setDeletingLog(false);
                  }
                }}
                disabled={deletingLog}
              >
                {t('common.delete') || 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setConfirmDelete(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">{t('common.confirm') || 'Confirm'}</h3>
            <p className="mb-4">{t('printers.confirmDelete') || 'Are you sure you want to delete this printer?'}</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{t('common.cancel') || 'Cancel'}</Button>
              <Button
                variant="danger"
                className="ml-2"
                onClick={async () => {
                  try {
                    await remove(printer!.id);
                    setConfirmDelete(false);
                    handleBack();
                  } catch {
                    // optionally show error
                    setConfirmDelete(false);
                  }
                }}
              >
                {t('common.delete') || 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterDetail;
