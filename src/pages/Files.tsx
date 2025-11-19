import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { filesApi } from '../api/files';
import { useOrders } from '../hooks/useOrders';
import { OrderFile } from '../types';

interface FileWithOrder extends OrderFile {
  orderNumber?: string;
}

const Files: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language?.startsWith('ru');
  const navigate = useNavigate();
  const { orders, loading: ordersLoading } = useOrders();
  const [files, setFiles] = useState<FileWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sort states
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter states - modal (temporary values while editing)
  const [showFilters, setShowFilters] = useState(false);
  const [modalMinSize, setModalMinSize] = useState<string>('');
  const [modalMaxSize, setModalMaxSize] = useState<string>('');
  const [modalFileType, setModalFileType] = useState<string>('');
  
  // Applied filter states (actual values used for filtering)
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedMinSize, setAppliedMinSize] = useState<string>('');
  const [appliedMaxSize, setAppliedMaxSize] = useState<string>('');
  const [appliedFileType, setAppliedFileType] = useState<string>('');
  
  // Delete confirmation
  const [deleteFile, setDeleteFile] = useState<{ orderId: number; fileId: number; fileName: string } | null>(null);

  useEffect(() => {
    const fetchAllFiles = async () => {
      if (ordersLoading) return;
      
      try {
        setLoading(true);
        const allFiles: FileWithOrder[] = [];
        
        for (const order of orders) {
          try {
            const orderFiles = await filesApi.getOrderFiles(order.id);
            const filesWithOrderInfo = orderFiles.map(file => ({
              ...file,
              orderNumber: `#${order.id}`,
            }));
            allFiles.push(...filesWithOrderInfo);
          } catch {
            // Silent fail for orders without files
          }
        }
        
        setFiles(allFiles);
      } catch (error) {
        console.error('Failed to fetch files:', error);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllFiles();
  }, [orders, ordersLoading]);

  const handleDelete = async (orderId: number, fileId: number) => {
    try {
      await filesApi.deleteFile(orderId, fileId);
      setFiles(files.filter(f => !(f.orderId === orderId && f.id === fileId)));
      setDeleteFile(null);
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert(t('files.errorDeleteFailed') || 'Failed to delete file');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = files.filter(file => {
      if (appliedSearchTerm && !file.fileName.toLowerCase().includes(appliedSearchTerm.toLowerCase())) {
        return false;
      }
      const fileSizeMB = file.fileSize / 1024 / 1024;
      if (appliedMinSize && fileSizeMB < parseFloat(appliedMinSize)) {
        return false;
      }
      if (appliedMaxSize && fileSizeMB > parseFloat(appliedMaxSize)) {
        return false;
      }
      if (appliedFileType) {
        if (appliedFileType === 'image' && !file.mimeType?.startsWith('image/')) {
          return false;
        }
        if (appliedFileType === 'stl' && !file.fileName.toLowerCase().endsWith('.stl')) {
          return false;
        }
        if (appliedFileType === 'obj' && !file.fileName.toLowerCase().endsWith('.obj')) {
          return false;
        }
        if (appliedFileType === 'pdf' && file.mimeType !== 'application/pdf') {
          return false;
        }
        if (appliedFileType === 'archive' && !file.mimeType?.includes('zip') && !file.mimeType?.includes('rar') && !file.mimeType?.includes('7z')) {
          return false;
        }
      }
      return true;
    });

    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase()) * dir;
      }
      if (sortBy === 'size') {
        return (a.fileSize - b.fileSize) * dir;
      }
      if (sortBy === 'date') {
        const aDate = new Date(a.uploadedAt).getTime();
        const bDate = new Date(b.uploadedAt).getTime();
        return (aDate - bDate) * dir;
      }
      return 0;
    });
  }, [files, appliedSearchTerm, appliedMinSize, appliedMaxSize, appliedFileType, sortBy, sortOrder]);

  const filteredFiles = filteredAndSorted;

  const totalSize = filteredFiles.reduce((sum, file) => sum + file.fileSize, 0);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

  const columns = [
    { 
      key: 'fileName', 
      title: t('files.name') || 'Name',
      render: (value: any, row: FileWithOrder) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{value}</span>
          {row.mimeType?.startsWith('image/') && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {t('files.imageLabel') || 'Image'}
            </span>
          )}
        </div>
      )
    },
    { 
      key: 'fileSize', 
      title: t('files.size') || 'Size', 
      render: (value: any) => {
        if (typeof value === 'number') {
          const mb = value / 1024 / 1024;
          if (mb < 1) {
            return `${(value / 1024).toFixed(2)} KB`;
          }
          return `${mb.toFixed(2)} MB`;
        }
        return '-';
      }
    },
    { 
      key: 'orderNumber', 
      title: t('files.order') || 'Order',
      render: (value: any, row: FileWithOrder) => (
        <Button
          variant="secondary"
          onClick={() => navigate(`/orders/${row.orderId}`)}
          className="text-sm"
        >
          {value}
        </Button>
      )
    },
    { 
      key: 'uploadedAt', 
      title: t('files.uploadedAt') || 'Uploaded',
      render: (value: any) => {
        if (value) {
          return new Date(value).toLocaleString();
        }
        return '-';
      }
    },
    { 
      key: 'actions', 
      title: t('common.actions') || 'Actions',
      render: (_: any, row: FileWithOrder) => (
        <div className="flex gap-2">
          <a 
            href={row.fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            download
          >
            <Button variant="primary" className="text-sm">
              {t('common.download') || 'Download'}
            </Button>
          </a>
          <Button
            variant="danger"
            onClick={() => setDeleteFile({ orderId: row.orderId, fileId: row.id, fileName: row.fileName })}
            className="text-sm"
          >
            {t('common.delete') || 'Delete'}
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('files.title') || 'Files'}</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('files.searchPlaceholder') || 'Search files'}
              value={appliedSearchTerm}
              onChange={e => setAppliedSearchTerm(e.target.value)}
              className="w-64 text-sm py-1.5 h-9 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="sr-only">{t('filters.sortBy') || 'Sort by'}</label>
            <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="name">{t('files.sortField.name') || 'Name'}</option>
              <option value="size">{t('files.sortField.size') || 'Size'}</option>
              <option value="date">{t('files.sortField.date') || 'Date'}</option>
            </select>
            <button className="px-2 py-1 text-sm border rounded" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' 
                ? (isRu ? (t('filters.orderDisplayAsc') || 'А → Я') : (t('filters.orderDisplayAsc') || 'A → Z'))
                : (isRu ? (t('filters.orderDisplayDesc') || 'Я → А') : (t('filters.orderDisplayDesc') || 'Z → A'))
              }
            </button>
          </div>

          <Button aria-label="filters" size="sm" onClick={() => {
            if (!showFilters) {
              setModalMinSize(appliedMinSize);
              setModalMaxSize(appliedMaxSize);
              setModalFileType(appliedFileType);
            }
            setShowFilters(s => !s);
          }} variant="secondary">{t('filters.open') || 'Filters'}</Button>
          
          {(appliedMinSize || appliedMaxSize || appliedFileType) ? (
            <Button variant="secondary" size="sm" onClick={() => {
              setAppliedMinSize('');
              setAppliedMaxSize('');
              setAppliedFileType('');
            }}>{t('filters.clear') || 'Clear'}</Button>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-4 p-4">
        <p className="text-sm text-gray-600">
          {filteredFiles.length} {t('files.filesCount') || 'files'} • {totalSizeMB} MB
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center p-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {files.length === 0 
                ? (t('files.noFiles') || 'No files found')
                : (t('files.noFilesMatchFilter') || 'No files match the current filters')
              }
            </h3>
            {files.length > 0 && (
              <Button 
                onClick={() => {
                  setAppliedSearchTerm('');
                  setAppliedMinSize('');
                  setAppliedMaxSize('');
                  setAppliedFileType('');
                }}
                variant="primary"
                className="mt-4"
              >
                {t('common.resetFilters') || 'Reset Filters'}
              </Button>
            )}
          </div>
        ) : (
          <Table columns={columns} data={filteredFiles} />
        )}
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowFilters(false)} />
          <div className="bg-white rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('filters.title') || 'Filters'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('files.fileType') || 'File type'}
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalFileType}
                    onChange={(e) => setModalFileType(e.target.value)}
                  >
                    <option value="">{t('files.allTypes') || 'All types'}</option>
                    <option value="image">{t('files.typeImage') || 'Images'}</option>
                    <option value="stl">{t('files.typeSTL') || 'STL files'}</option>
                    <option value="obj">{t('files.typeOBJ') || 'OBJ files'}</option>
                    <option value="pdf">{t('files.typePDF') || 'PDF files'}</option>
                    <option value="archive">{t('files.typeArchive') || 'Archives'}</option>
                  </select>
                </div>

                {/* Empty space for alignment */}
                <div></div>

                {/* Min size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('files.minSize') || 'Min size (MB)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalMinSize}
                    onChange={(e) => setModalMinSize(e.target.value)}
                    placeholder="0"
                  />
                </div>

                {/* Max size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('files.maxSize') || 'Max size (MB)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalMaxSize}
                    onChange={(e) => setModalMaxSize(e.target.value)}
                    placeholder="20"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setAppliedMinSize(modalMinSize);
                    setAppliedMaxSize(modalMaxSize);
                    setAppliedFileType(modalFileType);
                    setShowFilters(false);
                  }}
                >
                  {t('common.apply') || 'Apply'}
                </Button>
                <Button variant="secondary" onClick={() => setShowFilters(false)}>
                  {t('common.cancel') || 'Cancel'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteFile !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setDeleteFile(null)} />
          <div className="bg-white rounded-lg shadow-xl z-50 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('common.confirm') || 'Confirm'}</h3>
            <p className="text-gray-700 mb-6">
              {t('files.confirmDelete') || 'Are you sure you want to delete this file?'}
              <br />
              <span className="font-medium">{deleteFile.fileName}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => handleDelete(deleteFile.orderId, deleteFile.fileId)}>
                {t('common.delete') || 'Delete'}
              </Button>
              <Button variant="secondary" onClick={() => setDeleteFile(null)}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Files;