import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFilaments } from '../hooks/useFilaments';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input'; 

const FilamentTypes: React.FC = () => {
  const { types, createType, deleteType, fetchAll, updateType } = useFilaments();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showNewType, setShowNewType] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeDescription, setTypeDescription] = useState('');
  const [typeError, setTypeError] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-3">{t('filaments.typesTitle')}</h1>

        <div className="flex flex-col gap-1">
          <div className="flex flex-col w-max">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t('filaments.typeName')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-sm py-1.5 h-9 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <Button
                aria-label={sortOrder === 'asc' ? 'sort-asc' : 'sort-desc'}
                title={(() => {
                  const isRu = i18n.language?.startsWith('ru');
                  return sortOrder === 'asc' ? (isRu ? 'А → Я' : 'A → Z') : (isRu ? 'Я → А' : 'Z → A');
                })()}
                variant="secondary"
                size="sm"
                className="h-9 px-3"
                onClick={() => setSortOrder(s => (s === 'asc' ? 'desc' : 'asc'))}
              >
                {(() => {
                  const isRu = i18n.language?.startsWith('ru');
                  return sortOrder === 'asc' ? (isRu ? 'А → Я' : 'A → Z') : (isRu ? 'Я → А' : 'Z → A');
                })()}
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="h-9"
                onClick={() => setShowNewType(true)}
              >
                <svg className="w-4 h-4 mr-1 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('filaments.newType')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {editing !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setEditing(null)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{t('common.edit') || 'Edit Filament Type'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('filaments.typeName')} value={editName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)} maxLength={10} />
              <Input label={t('filaments.description')} value={editDescription} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)} maxLength={300} multiline rows={4} />
            </div>
            {editError && (
              <div className="mt-3 text-sm text-red-600">{editError}</div>
            )}
            <div className="mt-4">
              <Button onClick={async () => {
                setEditError('');
                const name = editName.trim();
                if (!name) {
                  setEditError(t('errors.typeNameRequired'));
                  return;
                }
                if (name.length > 10) {
                  setEditError(t('errors.typeNameTooLong'));
                  return;
                }
                if (editDescription.trim().length > 300) {
                  setEditError('Description must be at most 300 characters');
                  return;
                }
                try {
                  await updateType(editing as number, { name, description: editDescription });
                  setEditing(null);
                  await fetchAll();
                } catch (err: any) {
                  setEditError(err.response?.data?.message || err.message || t('errors.updateTypeFailed'));
                }
              }} variant="primary">{t('common.save') || 'Save'}</Button>
              <Button onClick={() => setEditing(null)} variant="secondary" className="ml-2">{t('common.cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50 z-40" onClick={() => { setConfirmDeleteId(null); setConfirmDeleteName(null); }} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">{t('common.confirm') || 'Confirm'}</h3>
            <p className="mb-4">{t('common.confirmDelete', { name: confirmDeleteName ?? '' })}</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => { setConfirmDeleteId(null); setConfirmDeleteName(null); }}>{t('common.cancel')}</Button>
              <Button variant="danger" className="ml-2" onClick={async () => {
                try {
                  await deleteType(confirmDeleteId as number);
                  setConfirmDeleteId(null);
                  setConfirmDeleteName(null);
                  await fetchAll();
                } catch (err: any) {
                  setEditError(err.response?.data?.message || err.message || t('errors.deleteFailed'));
                }
              }}>{t('common.delete')}</Button>
            </div>
          </div>
        </div>
      )}

      {showNewType && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setShowNewType(false)}
          />
          <div
            className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">
              {t('filaments.newTypeTitle')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('filaments.typeName')}
                value={typeName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeName(e.target.value)}
                maxLength={10}
              />
              <Input
                label={t('filaments.description')}
                value={typeDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTypeDescription(e.target.value)}
                maxLength={300}
                multiline
                rows={4}
              />
            </div>
            {typeError && (
              <div className="mt-3 text-sm text-red-600">{typeError}</div>
            )}
            <div className="mt-4">
              <Button
                onClick={async () => {
                  setTypeError('');
                  const name = typeName.trim();
                  if (!name) {
                    setTypeError(t('errors.typeNameRequired'));
                    return;
                  }
                  if (name.length > 10) {
                    setTypeError(t('errors.typeNameTooLong'));
                    return;
                  }
                  if (typeDescription.trim().length > 300) {
                    setTypeError('Description must be at most 300 characters');
                    return;
                  }
                  try {
                    await createType({ name, description: typeDescription });
                    setTypeName('');
                    setTypeDescription('');
                    setShowNewType(false);
                    await fetchAll();
                  } catch (err: any) {
                    setTypeError(
                      err.response?.data?.message ||
                        err.message ||
                        t('errors.createTypeFailed'),
                    );
                  }
                }}
                variant="primary"
              >
                {t('common.create')}
              </Button>
              <Button
                onClick={() => setShowNewType(false)}
                variant="secondary"
                className="ml-2"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="space-y-2">
          {types
            .filter(tp => {
              if (!search.trim()) return true;
              const q = search.trim().toLowerCase();
              return (
                tp.name.toLowerCase().includes(q) ||
                (tp.description || '').toLowerCase().includes(q)
              );
            })
            .sort((a, b) => {
              const dir = sortOrder === 'asc' ? 1 : -1;
              return (
                a.name.toLowerCase().localeCompare(b.name.toLowerCase()) * dir
              );
            })
            .map(tp => (
              <div
                key={tp.id}
                className="flex justify-between items-center bg-white p-3 rounded"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{tp.name}</div>
                  <div className="text-sm text-gray-600 mt-1 whitespace-normal break-words">
                    {tp.description}
                  </div>
                </div>
                <div className="inline-flex flex-col items-stretch space-y-2 flex-shrink-0 ml-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditing(tp.id);
                        setEditName(tp.name);
                        setEditDescription(tp.description || '');
                        setEditError('');
                      }}
                    >
                      {t('common.edit') || 'Edit'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setConfirmDeleteId(tp.id);
                        setConfirmDeleteName(tp.name);
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => navigate(`/filament-types/${encodeURIComponent(tp.name)}`)}
                  >
                    {t('common.details') || 'Details'}
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default FilamentTypes;