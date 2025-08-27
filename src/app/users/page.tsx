'use client';

import React, { useState, useEffect } from 'react';
import { UserList } from '@/components/users/UserList';
import { UserModal } from '@/components/users/UserModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/hooks/useNotification';
import { useUsers } from '@/hooks/useUsers';
import { UserResponse, UserRequest } from '@/types';

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { addNotification } = useNotification();
  const {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    clearError,
  } = useUsers();

  // Estados separados
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<UserResponse[]>([]);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null);

  // Filtro sin ciclo infinito
  useEffect(() => {
    const filtered = users.filter((user: UserResponse) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.identificationNumber.includes(searchQuery)
    );
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const handleCreateUser = (): void => {
    setShowModal(true);
    setEditingUser(null);
  };

  const handleEditUser = (user: UserResponse): void => {
    setShowModal(true);
    setEditingUser(user);
  };

  const handleDeleteUser = (user: UserResponse): void => {
    setShowDeleteDialog(true);
    setDeletingUser(user);
  };

  const handleModalClose = (): void => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSearch = (query: string): void => {
    setSearchQuery(query);
  };

  const handleUserSave = async (userData: UserRequest): Promise<void> => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData);
        addNotification('Usuario actualizado exitosamente', 'success');
      } else {
        await createUser(userData);
        addNotification('Usuario creado exitosamente', 'success');
      }
      handleModalClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar usuario';
      addNotification(errorMessage, 'error');
      throw error;
    }
  };

  const confirmDeleteUser = async (): Promise<void> => {
    if (!deletingUser) return;
    try {
      await deleteUser(deletingUser.id);
      addNotification('Usuario eliminado exitosamente', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
      addNotification(errorMessage, 'error');
    } finally {
      setShowDeleteDialog(false);
      setDeletingUser(null);
    }
  };

  // Control de acceso
  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="warning">
          Debes iniciar sesión para acceder a esta sección.
        </Alert>
      </div>
    );
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error">
          No tienes permisos para acceder a esta sección. Solo los administradores pueden gestionar usuarios.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-1">Administra los usuarios del sistema y revisa sus actividades</p>
          </div>
          <Button onClick={handleCreateUser}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Usuario
          </Button>
        </div>

        {error && (
          <Alert variant="error" onClose={clearError}>
            {error}
          </Alert>
        )}

        {/* Search bar for users tab only */}
        <div className="mb-6">
          <SearchInput
            onSearch={handleSearch}
            placeholder="Buscar usuarios por nombre, email o identificación..."
          />
        </div>

        {/* UserList component with tabs */}
        <UserList
          users={filteredUsers}
          loading={loading}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          currentUserId={currentUser.id}
        />

        {/* Modal de crear/editar usuario */}
        <UserModal
          isOpen={showModal}
          onClose={handleModalClose}
          onSave={handleUserSave}
          user={editingUser}
        />

        {/* Diálogo de confirmación de eliminación */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeletingUser(null);
          }}
          onConfirm={confirmDeleteUser}
          title="Eliminar Usuario"
          message={`¿Estás seguro de que quieres eliminar al usuario "${deletingUser?.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="danger"
        />
      </div>
    </div>
  );
};

export default UsersPage;