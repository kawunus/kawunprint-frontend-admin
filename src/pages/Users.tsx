import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi, UpdateUserAdminRequest } from '../api/users';
import { User } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';

export const Users: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'EMPLOYEE' | 'CLIENT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserAdminRequest>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'CLIENT',
    isActive: true,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('users.loadError') || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      password: '', // Leave empty - backend should handle this
      role: user.role,
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      await usersApi.updateUser(editingUser.id, editForm);
      await loadUsers();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || t('users.saveError') || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      await usersApi.deleteUser(deletingUser.id);
      await loadUsers();
      setShowDeleteModal(false);
      setDeletingUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || t('users.deleteError') || 'Failed to delete user');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search by name or email
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);

      // Role filter
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.isActive) ||
        (statusFilter === 'INACTIVE' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const columns = [
    {
      key: 'id',
      title: 'ID',
      render: (value: number) => <span className="font-mono text-sm">#{value}</span>,
    },
    {
      key: 'fullName',
      title: t('users.name') || 'Name',
      render: (_: any, row: User) => (
        <div>
          <div className="font-medium">{row.firstName} {row.lastName}</div>
          <div className="text-xs text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      title: t('users.phone') || 'Phone',
    },
    {
      key: 'role',
      title: t('users.role') || 'Role',
      render: (value: string) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value === 'ADMIN'
              ? 'bg-purple-100 text-purple-800'
              : value === 'EMPLOYEE'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: t('users.status') || 'Status',
      render: (value: boolean) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? (t('users.active') || 'Active') : (t('users.inactive') || 'Inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('common.actions') || 'Actions',
      render: (_: any, row: User) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleEdit(row)}>
            {t('common.edit') || 'Edit'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => {
            setDeletingUser(row);
            setShowDeleteModal(true);
          }}>
            {t('common.delete') || 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">{t('common.loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('users.title') || 'Users'}</h1>
        <p className="text-gray-600 mt-1">{t('users.subtitle') || 'Manage user accounts'}</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('filters.title') || 'Filters'}</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? (t('filters.hide') || 'Hide') : (t('filters.show') || 'Show')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('users.search') || 'Search'}
            </label>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder={t('users.searchPlaceholder') || 'Name or email...'}
            />
          </div>

          {showFilters && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.roleFilter') || 'Role'}
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('users.allRoles') || 'All Roles'}</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="CLIENT">CLIENT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.statusFilter') || 'Status'}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('users.allStatuses') || 'All'}</option>
                  <option value="ACTIVE">{t('users.active') || 'Active'}</option>
                  <option value="INACTIVE">{t('users.inactive') || 'Inactive'}</option>
                </select>
              </div>
            </>
          )}
        </div>

        {showFilters && (
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              {t('filters.clear') || 'Clear Filters'}
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table columns={columns} data={filteredUsers} />
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {t('users.noUsers') || 'No users found'}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">
              {t('users.editUser') || 'Edit User'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('users.firstName') || 'First Name'} *
                  </label>
                  <Input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('users.lastName') || 'Last Name'} *
                  </label>
                  <Input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.email') || 'Email'} *
                </label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.phone') || 'Phone'} *
                </label>
                <Input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm({ ...editForm, phoneNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.password') || 'Password'}
                </label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                  placeholder={t('users.passwordPlaceholder') || 'Leave empty to keep current'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('users.passwordHint') || 'Leave empty to keep the current password'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.role') || 'Role'} *
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="CLIENT">CLIENT</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  {t('users.active') || 'Active'}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                disabled={saving}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              {t('users.confirmDelete') || 'Confirm Delete'}
            </h2>
            <p className="text-gray-700 mb-6">
              {t('users.confirmDeleteMessage') || 'Are you sure you want to delete this user?'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{deletingUser.firstName} {deletingUser.lastName}</strong> ({deletingUser.email})
            </p>
            <div className="flex gap-3">
              <Button
                variant="danger"
                onClick={handleDelete}
                className="flex-1"
              >
                {t('common.delete') || 'Delete'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUser(null);
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
