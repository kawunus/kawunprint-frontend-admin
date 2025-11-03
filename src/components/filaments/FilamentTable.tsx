import React from 'react';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

interface Props {
  filaments: any[];
  loading?: boolean;
  onEdit: (f: any) => void;
  onDelete: (id: number) => void;
}

export const FilamentTable: React.FC<Props> = ({ filaments, loading, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const columns = [
  // ID column hidden by request
    { key: 'color', title: t('filaments.color') },
    { key: 'type', title: t('filaments.type'), render: (t: any) => t?.name || '-' },
    { key: 'pricePerGram', title: t('filaments.pricePerGram'), render: (v: number) => `${v.toFixed(2)} BYN/g` },
    { key: 'residue', title: t('filaments.residue') },
    { key: 'hexColor', title: t('filaments.hexColor'), render: (v: string) => v || '-' },
    {
      key: 'actions',
      title: t('common.actions') || 'Actions',
      render: (_: any, row: any) => (
        <div className="flex space-x-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>{t('common.edit') || 'Edit'}</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(row.id)}>{t('common.delete') || 'Delete'}</Button>
        </div>
      ),
    },
  ];

  return <Table columns={columns} data={filaments} loading={!!loading} emptyMessage={t('filaments.noFilaments')} />;
};

export default FilamentTable;
