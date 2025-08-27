// src/components/users/index.ts - UPDATED
export { UserList } from './UserList';
export { UserForm } from './UserForm';
export { UserModal } from './UserModal';
export { UserActivityList } from './UserActivityList';
export { UserActivityModal } from './UserActivityModal';
export { UserDetails } from './UserDetails';

// ✅ Export user activity types
export type { 
  UserActivityResponse, 
  UserActivityRequest, 
  UserActivityFilters,
  ActivityStats,
  SelectOption
} from '@/types/user-activity';

export { 
  UserActivityAction,
  SystemTable,
  getActionTypeVariant,
  getTableDisplayName,
  calculateActivityStats
} from '@/types/user-activity';