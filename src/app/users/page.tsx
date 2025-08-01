'use client';

import React, { useState, useEffect } from 'react';
import { UserList } from '@/components/users/UserList';
import { UserModal } from '@/components/users/UserModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

  // ✅ Estados separados
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserResponse[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null);

  // ✅ Filtro sin ciclo infinito
  useEffect(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.identificationNumber.includes(searchQuery)
    );
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const handleCreateUser = () => {
    setShowModal(true);
    setEditingUser(null);
  };

  const handleEditUser = (user: UserResponse) => {
    setShowModal(true);
    setEditingUser(user);
  };

  const handleDeleteUser = (user: UserResponse) => {
    setShowDeleteDialog(true);
    setDeletingUser(user);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleUserSave = async (userData: UserRequest) => {
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

  const confirmDeleteUser = async () => {
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

  // 🔒 Control de acceso
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
      <Card
        title="Gestión de Usuarios"
        subtitle="Administra los usuarios del sistema"
        actions={
          <Button onClick={handleCreateUser}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Usuario
          </Button>
        }
      >
        {error && (
          <Alert variant="error" onClose={clearError}>
            {error}
          </Alert>
        )}

        <div className="mb-6">
          <SearchInput
            onSearch={handleSearch}
            placeholder="Buscar usuarios por nombre, email o identificación..."
          />
        </div>

        <UserList
          users={filteredUsers}
          loading={loading}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          currentUserId={currentUser.id}
        />
      </Card>

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
  );
};

export default UsersPage;
