// src/components/users/UserModal.tsx
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { UserForm } from './UserForm';
import { UserRequest, UserResponse } from '@/types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: UserRequest) => Promise<void>;
  user?: UserResponse | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
}) => {
  const isEditing = Boolean(user);
  const title = isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <UserForm
        onSubmit={onSave}
        onCancel={onClose}
        user={user}
      />
    </Modal>
  );
};