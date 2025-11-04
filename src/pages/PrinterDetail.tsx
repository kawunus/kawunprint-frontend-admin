import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePrinters } from '../hooks/usePrinters';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTranslation } from 'react-i18next';
import { Printer } from '../types';

const PrinterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getById, update, setActive } = usePrinters();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Printer | null>(null);
  const [err, setErr] = useState('');

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

  const save = async () => {
    if (!edit) return;
    const name = edit.name.trim();
    if (!name) { setErr(t('errors.printers.nameRequired') || 'Name is required'); return; }
    await update(edit.id, { name, isMulticolor: edit.isMulticolor, isActive: edit.isActive, description: edit.description || '' });
    setPrinter(edit);
    setEdit(null);
  };

  if (loading) return <div className="p-6"><div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div></div>;
  if (!printer) return <div className="p-6"><div className="rounded bg-red-50 p-4 text-red-700">{t('printers.notFound') || 'Printer not found'}</div></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={() => navigate('/printers')}>{t('common.back') || 'Back'}</Button>
          <h1 className="text-2xl font-bold">{printer.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setActive(printer.id, !printer.isActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${printer.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${printer.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <Button variant="secondary" onClick={() => setEdit(printer)}>{t('common.edit') || 'Edit'}</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><div className="text-sm text-gray-500">{t('printers.name') || 'Name'}</div><div className="font-medium">{printer.name}</div></div>
          <div><div className="text-sm text-gray-500">{t('printers.multicolor') || 'Multicolor'}</div><div className="font-medium">{printer.isMulticolor ? t('common.yes') || 'Yes' : t('common.no') || 'No'}</div></div>
          <div><div className="text-sm text-gray-500">{t('printers.active') || 'Active'}</div><div className="font-medium">{printer.isActive ? t('common.yes') || 'Yes' : t('common.no') || 'No'}</div></div>
          <div className="md:col-span-2"><div className="text-sm text-gray-500">{t('printers.description') || 'Description'}</div><div className="font-medium whitespace-pre-wrap">{printer.description || '-'}</div></div>
        </div>
      </div>

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
    </div>
  );
};

export default PrinterDetail;
