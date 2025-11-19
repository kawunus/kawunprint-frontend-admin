import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { useOrders } from '../hooks/useOrders';
import { useFilaments } from '../hooks/useFilaments';
import { usePrinters } from '../hooks/usePrinters';
import { usersApi } from '../api/users';
import * as XLSX from 'xlsx';

// CSV export utility with proper encoding
const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      // Properly escape CSV fields
      const stringValue = String(value);
      // Always quote fields to ensure proper parsing
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
  
  // Use UTF-8 with BOM for proper encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// JSON export utility
const exportToJSON = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Use replacer to ensure proper formatting and encoding
  const jsonContent = JSON.stringify(data, null, 2);
  
  // Use UTF-8 encoding properly
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Simple XLSX export (proper Excel format)
const exportToExcel = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    // Create a new workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    // Auto-fit column widths
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length, 20)
    }));
    ws['!cols'] = colWidths;
    
    // Write file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Export error:', error);
    alert('Error exporting file');
  }
};

export const Import: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { orders, orderStatuses } = useOrders();
  const { filaments } = useFilaments();
  const { printers } = usePrinters();
  const [exportStatus, setExportStatus] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const isRu = i18n.language?.startsWith('ru');

  // Load users on mount
  React.useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await usersApi.getAll();
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Prepare export data with friendly format
  const prepareOrdersData = () => {
    return orders.map(order => ({
      'Order ID': order.id,
      'Customer Name': `${order.customer.firstName} ${order.customer.lastName}`,
      'Customer Email': order.customer.email,
      'Customer Phone': order.customer.phoneNumber || '-',
      'Status': orderStatuses.find(s => s.id === order.statusId)?.description || order.status || '-',
      'Total Price (BYN)': order.totalPrice,
      'Created At': new Date(order.createdAt).toLocaleString(isRu ? 'ru' : 'en'),
      'Completed At': order.completedAt ? new Date(order.completedAt).toLocaleString(isRu ? 'ru' : 'en') : '-',
      'Comment': order.comment || '-',
    }));
  };

  const prepareFilamentsData = () => {
    return filaments.map(f => ({
      'Filament ID': f.id,
      'Color': f.color,
      'Type': f.type?.name || '-',
      'Price per Gram (BYN)': f.pricePerGram,
      'Residue (g)': f.residue,
      'Hex Color': f.hexColor,
    }));
  };

  const preparePrintersData = () => {
    return printers.map(p => ({
      'Printer ID': p.id,
      'Name': p.name,
      'Multicolor': p.isMulticolor ? 'Yes' : 'No',
      'Active': p.isActive ? 'Yes' : 'No',
      'Description': p.description || '-',
    }));
  };

  const prepareUsersData = () => {
    return users.map(u => ({
      'User ID': u.id,
      'First Name': u.firstName || '-',
      'Last Name': u.lastName || '-',
      'Email': u.email,
      'Phone': u.phoneNumber || '-',
      'Telegram': u.telegramAccount || '-',
      'Role': u.role || 'CLIENT',
      'Active': u.isActive ? 'Yes' : 'No',
    }));
  };

  const handleExport = (type: 'orders' | 'filaments' | 'printers' | 'users', format: 'csv' | 'json' | 'excel') => {
    let data: any[] = [];
    let filename = '';

    if (type === 'orders') {
      data = prepareOrdersData();
      filename = `orders_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
    } else if (type === 'filaments') {
      data = prepareFilamentsData();
      filename = `filaments_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
    } else if (type === 'printers') {
      data = preparePrintersData();
      filename = `printers_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
    } else if (type === 'users') {
      data = prepareUsersData();
      filename = `users_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
    }

    if (format === 'csv') {
      exportToCSV(data, filename);
    } else if (format === 'json') {
      exportToJSON(data, filename);
    } else if (format === 'excel') {
      exportToExcel(data, filename);
    }

    setExportStatus(`✓ ${type} exported as ${format.toUpperCase()}`);
    setTimeout(() => setExportStatus(''), 3000);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('import.title') || 'Import & Export'}</h1>
      <p className="text-gray-600 mb-6">{t('import.description') || 'Export your data in various formats for backup and integration'}</p>

      {exportStatus && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {exportStatus}
        </div>
      )}

      {/* Export sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Orders Export */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8c0 1.657-.895 3.146-2.207 3.927M6 12a6 6 0 1112 0" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">{t('import.orders') || 'Orders'}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t('import.ordersDesc') || 'Export all orders with customer details and status'}
          </p>
          <div className="space-y-2">
            <Button variant="primary" size="sm" onClick={() => handleExport('orders', 'csv')} className="w-full">
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('orders', 'json')} className="w-full">
              JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('orders', 'excel')} className="w-full">
              Excel
            </Button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-700">
            <strong>Why:</strong> {t('import.ordersWhy') || 'Backup, reporting, CRM integration'}
          </div>
        </div>

        {/* Filaments Export */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l-2 2m0 0L5 6m2 2l2-2m0 0L9 6" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">{t('import.filaments') || 'Filaments'}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t('import.filamentsDesc') || 'Export all filament inventory with pricing'}
          </p>
          <div className="space-y-2">
            <Button variant="primary" size="sm" onClick={() => handleExport('filaments', 'csv')} className="w-full">
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('filaments', 'json')} className="w-full">
              JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('filaments', 'excel')} className="w-full">
              Excel
            </Button>
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded text-xs text-green-700">
            <strong>Why:</strong> {t('import.filamentsWhy') || 'Inventory tracking, accounting, supplier reports'}
          </div>
        </div>

        {/* Printers Export */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2-10a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">{t('import.printers') || 'Printers'}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t('import.printersDesc') || 'Export printer fleet status and configuration'}
          </p>
          <div className="space-y-2">
            <Button variant="primary" size="sm" onClick={() => handleExport('printers', 'csv')} className="w-full">
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('printers', 'json')} className="w-full">
              JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('printers', 'excel')} className="w-full">
              Excel
            </Button>
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded text-xs text-purple-700">
            <strong>Why:</strong> {t('import.printersWhy') || 'Equipment audit, maintenance tracking, capacity planning'}
          </div>
        </div>

        {/* Users Export */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">{t('import.users') || 'Users'}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t('import.usersDesc') || 'Export all users with contact info and roles'}
          </p>
          <div className="space-y-2">
            <Button variant="primary" size="sm" onClick={() => handleExport('users', 'csv')} className="w-full" disabled={usersLoading}>
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('users', 'json')} className="w-full" disabled={usersLoading}>
              JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('users', 'excel')} className="w-full" disabled={usersLoading}>
              Excel
            </Button>
          </div>
          <div className="mt-4 p-3 bg-indigo-50 rounded text-xs text-indigo-700">
            <strong>Why:</strong> {t('import.usersWhy') || 'User management, team coordination, access control'}
          </div>
        </div>
      </div>

      {/* Data summary */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('import.summary') || 'Data Summary'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">{orders.length}</div>
            <div className="text-sm text-gray-600">{t('import.totalOrders') || 'Total Orders'}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">{filaments.length}</div>
            <div className="text-sm text-gray-600">{t('import.totalFilaments') || 'Filaments'}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">{printers.length}</div>
            <div className="text-sm text-gray-600">{t('import.totalPrinters') || 'Printers'}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-indigo-600">{users.length}</div>
            <div className="text-sm text-gray-600">{t('import.totalUsers') || 'Users'}</div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>📋 {t('import.note') || 'Note'}:</strong> {t('import.noteText') || 'Exported data is in human-readable format. Use JSON for programmatic access or spreadsheet formats (CSV/Excel) for office tools.'}</p>
      </div>
    </div>
  );
};

export default Import;
