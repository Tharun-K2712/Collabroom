// CollabRoom Shared Core Types & RBAC Helpers

export type SystemRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type RoomPrivacy = 'PRIVATE' | 'INVITE_ONLY';
export type MemberRole = 'OWNER' | 'MANAGER' | 'EDITOR' | 'VIEWER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface RoomMemberPermissions {
  canView: boolean;
  canUpload: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canRename: boolean;
  canMove: boolean;
  canShare: boolean;
  canManageMembers: boolean;
  canManagePermissions: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<MemberRole, RoomMemberPermissions> = {
  OWNER: {
    canView: true,
    canUpload: true,
    canDownload: true,
    canEdit: true,
    canDelete: true,
    canRename: true,
    canMove: true,
    canShare: true,
    canManageMembers: true,
    canManagePermissions: true,
  },
  MANAGER: {
    canView: true,
    canUpload: false,
    canDownload: true,
    canEdit: true,
    canDelete: false,
    canRename: true,
    canMove: true,
    canShare: true,
    canManageMembers: true,
    canManagePermissions: false,
  },
  EDITOR: {
    canView: true,
    canUpload: false,
    canDownload: true,
    canEdit: true,
    canDelete: false,
    canRename: false,
    canMove: false,
    canShare: false,
    canManageMembers: false,
    canManagePermissions: false,
  },
  VIEWER: {
    canView: true,
    canUpload: false,
    canDownload: true,
    canEdit: false,
    canDelete: false,
    canRename: false,
    canMove: false,
    canShare: false,
    canManageMembers: false,
    canManagePermissions: false,
  },
};

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  isEmailVerified: boolean;
  systemRole: SystemRole;
  status: UserStatus;
  storageUsedBytes: string;
  createdAt: string;
}

export interface RoomDTO {
  id: string;
  name: string;
  description?: string | null;
  icon?: string;
  color?: string;
  privacy: RoomPrivacy;
  maxStorageBytes: string;
  currentStorageBytes?: string;
  isArchived: boolean;
  createdById: string;
  owner?: UserDTO;
  memberCount?: number;
  fileCount?: number;
  currentUserRole?: MemberRole;
  currentUserPermissions?: RoomMemberPermissions;
  isFavorite?: boolean;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomMemberDTO {
  id: string;
  roomId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  lastActiveAt: string;
  user: UserDTO;
  permission?: RoomMemberPermissions;
}

export interface FileVersionDTO {
  id: string;
  fileId: string;
  versionNumber: number;
  storageKey: string;
  sizeBytes: string;
  uploadedById: string;
  uploader?: UserDTO;
  changeSummary?: string | null;
  createdAt: string;
}

export interface FileItemDTO {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: string;
  storageKey: string;
  roomId: string;
  folderId?: string | null;
  uploadedById: string;
  uploader?: UserDTO;
  isTrash: boolean;
  deletedAt?: string | null;
  isFavorite?: boolean;
  currentVersion: number;
  versions?: FileVersionDTO[];
  commentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderDTO {
  id: string;
  name: string;
  roomId: string;
  parentId?: string | null;
  createdById: string;
  color?: string;
  isTrash: boolean;
  deletedAt?: string | null;
  fileCount?: number;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentDTO {
  id: string;
  fileId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  user: UserDTO;
  replies?: CommentDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  roomId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLogDTO {
  id: string;
  roomId?: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export type SocketEventType =
  | 'room:join'
  | 'room:leave'
  | 'room:updated'
  | 'room:deleted'
  | 'file:uploaded'
  | 'file:updated'
  | 'file:deleted'
  | 'file:restored'
  | 'folder:created'
  | 'folder:updated'
  | 'folder:deleted'
  | 'member:joined'
  | 'member:removed'
  | 'member:role_changed'
  | 'member:permission_changed'
  | 'comment:created'
  | 'comment:deleted'
  | 'notification:new'
  | 'activity:new';
