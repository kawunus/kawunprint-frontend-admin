import React from 'react';
import { useTranslation } from 'react-i18next';
import { OrderFileInfo } from '../../types';
import { Button } from '../ui/Button';
import { formatLocalDateTime } from '../../utils/datetime';

interface FileListProps {
  files: OrderFileInfo[];
  onDelete?: (fileId: number) => void;
  canDelete?: boolean;
  loading?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onDelete,
  canDelete = false,
  loading = false,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('files.noFiles') || 'No files uploaded yet'}
      </div>
    );
  }

  const getFileIcon = (mimeType: string, isImage: boolean) => {
    if (isImage) {
      return (
        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    if (mimeType.includes('pdf')) {
      return (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }

    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
      return (
        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
      );
    }

    // Default file icon
    return (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {getFileIcon(file.mimeType, file.isImage)}
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate" title={file.fileName}>
                {file.fileName}
              </div>
              <div className="text-xs text-gray-500">
                {file.sizeFormatted} • {formatLocalDateTime(file.uploadedAt)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {canDelete && onDelete && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDelete(file.id)}
              >
                {t('common.delete') || 'Delete'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
