import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi, UpdateUserAdminRequest, CreateUserRequest } from '../api/users';
import { User } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { getUserIdFromToken } from '../utils/jwt';

export const Users: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters - Applied filters (used for actual filtering)
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedRoleFilter, setAppliedRoleFilter] = useState<'ALL' | 'ADMIN' | 'EMPLOYEE' | 'CLIENT' | 'ANALYST'>('ALL');
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Modal filters (temporary state while modal is open)
  const [modalRoleFilter, setModalRoleFilter] = useState<'ALL' | 'ADMIN' | 'EMPLOYEE' | 'CLIENT' | 'ANALYST'>('ALL');
  const [modalStatusFilter, setModalStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

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

  // Create modal
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'CLIENT',
    isActive: true,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleCreate = async () => {
    // Validation
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim() || !createForm.phoneNumber.trim() || !createForm.password.trim()) {
      alert(t('users.fillAllFields') || 'Please fill all required fields');
      return;
    }

    try {
      setSaving(true);
      await usersApi.createUser(createForm);
      await loadUsers();
      setShowCreateModal(false);
      // Reset form
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        role: 'CLIENT',
        isActive: true,
      });
    } catch (err: any) {
      alert(err.response?.data?.message || t('users.createError') || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    // Get current user ID
    const currentUserId = getUserIdFromToken();
    
    // Prevent deleting yourself
    if (currentUserId && currentUserId === deletingUser.id) {
      alert(t('users.cannotDeleteYourself') || 'You cannot delete your own account');
      setShowDeleteModal(false);
      setDeletingUser(null);
      return;
    }

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
      const matchesRole = appliedRoleFilter === 'ALL' || user.role === appliedRoleFilter;

      // Status filter
      const matchesStatus =
        appliedStatusFilter === 'ALL' ||
        (appliedStatusFilter === 'ACTIVE' && user.isActive) ||
        (appliedStatusFilter === 'INACTIVE' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, appliedRoleFilter, appliedStatusFilter]);

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
              : value === 'ANALYST'
              ? 'bg-green-100 text-green-800'
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

      {/* Toolbar with Search and Filters button */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('users.searchPlaceholder') || 'Search by name or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm py-1.5 h-9 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters and Clear buttons */}
          <div className="flex items-center space-x-2">
            <Button
              aria-label="filters"
              size="sm"
              onClick={() => {
                if (!showFilters) {
                  // Prefill modal inputs from applied filters when opening
                  setModalRoleFilter(appliedRoleFilter);
                  setModalStatusFilter(appliedStatusFilter);
                }
                setShowFilters((s) => !s);
              }}
              variant="secondary"
            >
              {t('filaments.filters') || 'Filters'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <svg className="w-4 h-4 mr-1 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('users.addUser') || 'Add User'}
            </Button>
            {(appliedRoleFilter !== 'ALL' || appliedStatusFilter !== 'ALL') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setAppliedRoleFilter('ALL');
                  setAppliedStatusFilter('ALL');
                }}
              >
                {t('filters.clear') || 'Clear'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowFilters(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('filaments.filters') || 'Filters'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('users.roleFilter') || 'Role'}
                </label>
                <select
                  value={modalRoleFilter}
                  onChange={(e) => setModalRoleFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('users.allRoles') || 'All Roles'}</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="ANALYST">ANALYST</option>
                  <option value="CLIENT">CLIENT</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('users.statusFilter') || 'Status'}
                </label>
                <select
                  value={modalStatusFilter}
                  onChange={(e) => setModalStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('users.allStatuses') || 'All'}</option>
                  <option value="ACTIVE">{t('users.active') || 'Active'}</option>
                  <option value="INACTIVE">{t('users.inactive') || 'Inactive'}</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => {
                  setAppliedRoleFilter(modalRoleFilter);
                  setAppliedStatusFilter(modalStatusFilter);
                  setShowFilters(false);
                }}
              >
                {t('common.apply') || 'Apply'}
              </Button>
              <Button variant="secondary" className="ml-2" onClick={() => setShowFilters(false)}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                  <option value="ANALYST">ANALYST</option>
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">
              {t('users.addUser') || 'Add User'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('users.firstName') || 'First Name'} *
                  </label>
                  <Input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm({ ...createForm, firstName: e.target.value })
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
                    value={createForm.lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm({ ...createForm, lastName: e.target.value })
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
                  value={createForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm({ ...createForm, email: e.target.value })
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
                  value={createForm.phoneNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm({ ...createForm, phoneNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.password') || 'Password'} *
                </label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.role') || 'Role'} *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="ANALYST">ANALYST</option>
                  <option value="CLIENT">CLIENT</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActiveCreate"
                  checked={createForm.isActive}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActiveCreate" className="ml-2 block text-sm text-gray-700">
                  {t('users.active') || 'Active'}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (t('common.creating') || 'Creating...') : (t('common.create') || 'Create')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  // Reset form
                  setCreateForm({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phoneNumber: '',
                    password: '',
                    role: 'CLIENT',
                    isActive: true,
                  });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">{t('common.confirm') || 'Confirm'}</h3>
            <p className="mb-4">{t('users.confirmDeleteMessage') || 'Are you sure you want to delete this user?'}</p>
            <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded">
              <strong>{deletingUser.firstName} {deletingUser.lastName}</strong>
              <br />
              {deletingUser.email}
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => {
                setShowDeleteModal(false);
                setDeletingUser(null);
              }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button variant="danger" className="ml-2" onClick={handleDelete}>
                {t('common.delete') || 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
