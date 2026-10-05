import { RoomRepository } from '../repositories/room.repository';
import { MemberRepository } from '../repositories/member.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { DEFAULT_ROLE_PERMISSIONS, RoomDTO, MemberRole, RoomPrivacy } from '@/types/shared';

export class RoomService {
  static async createRoom(
    userId: string,
    data: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      privacy?: 'PRIVATE' | 'INVITE_ONLY';
    }
  ) {
    const room = await RoomRepository.create({
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      privacy: data.privacy,
      createdById: userId,
    });

    await ActivityRepository.log({
      roomId: room.id,
      userId,
      action: 'ROOM_CREATED',
      entityType: 'ROOM',
      entityId: room.id,
      details: { name: room.name },
    });

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      icon: room.icon || 'FolderKanban',
      color: room.color || '#4F46E5',
      privacy: room.privacy as RoomPrivacy,
      maxStorageBytes: room.maxStorageBytes.toString(),
      isArchived: room.isArchived,
      createdById: room.createdById,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  }

  static async getRoomDetails(roomId: string, userId: string): Promise<RoomDTO> {
    const room = await RoomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    const member = await MemberRepository.findMember(roomId, userId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this room');
    }

    const storageUsed = await RoomRepository.calculateStorageUsed(roomId);

    const userRole = (member.role as MemberRole) || 'VIEWER';
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS[userRole] || DEFAULT_ROLE_PERMISSIONS.VIEWER;
    let permissions = { ...roleDefaults };
    if (member.permission) {
      permissions = {
        canView: member.permission.canView,
        canUpload: member.permission.canUpload,
        canDownload: member.permission.canDownload,
        canEdit: member.permission.canEdit,
        canDelete: member.permission.canDelete,
        canRename: member.permission.canRename,
        canMove: member.permission.canMove,
        canShare: member.permission.canShare,
        canManageMembers: member.permission.canManageMembers,
        canManagePermissions: member.permission.canManagePermissions,
      };
    }
    if (member.role === 'OWNER') {
      permissions = DEFAULT_ROLE_PERMISSIONS.OWNER;
    }

    await MemberRepository.updateLastActive(roomId, userId);

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      icon: room.icon || 'FolderKanban',
      color: room.color || '#4F46E5',
      privacy: (room.privacy as RoomPrivacy) || 'PRIVATE',
      maxStorageBytes: room.maxStorageBytes.toString(),
      currentStorageBytes: storageUsed.toString(),
      isArchived: room.isArchived,
      createdById: room.createdById,
      owner: room.owner
        ? {
            id: room.owner.id,
            email: room.owner.email,
            fullName: room.owner.fullName,
            avatarUrl: room.owner.avatarUrl,
            isEmailVerified: true,
            systemRole: 'USER',
            status: 'ACTIVE',
            storageUsedBytes: '0',
            createdAt: '',
          }
        : undefined,
      memberCount: room._count.members,
      fileCount: room._count.files,
      currentUserRole: userRole,
      currentUserPermissions: permissions,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  }

  static async listUserRooms(userId: string, filter?: 'owned' | 'shared' | 'all', search?: string) {
    const rooms = await RoomRepository.listUserRooms(userId, filter, search);
    return rooms.map((room) => {
      const membership = room.members[0];
      const isFavorite = room.favorites.length > 0;
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        icon: room.icon || 'FolderKanban',
        color: room.color || '#4F46E5',
        privacy: room.privacy as RoomPrivacy,
        maxStorageBytes: room.maxStorageBytes.toString(),
        isArchived: room.isArchived,
        createdById: room.createdById,
        owner: room.owner,
        memberCount: room._count.members,
        fileCount: room._count.files,
        currentUserRole: membership?.role as MemberRole,
        isFavorite,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      };
    });
  }

  static async updateRoom(
    roomId: string,
    userId: string,
    data: {
      name?: string;
      description?: string | null;
      icon?: string | null;
      color?: string | null;
      privacy?: 'PRIVATE' | 'INVITE_ONLY';
      isArchived?: boolean;
    }
  ) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new NotFoundError('Room not found');

    const updated = await RoomRepository.update(roomId, data);

    await ActivityRepository.log({
      roomId,
      userId,
      action: 'ROOM_SETTINGS_CHANGED',
      entityType: 'ROOM',
      entityId: roomId,
      details: data,
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      icon: updated.icon || 'FolderKanban',
      color: updated.color || '#4F46E5',
      privacy: updated.privacy as RoomPrivacy,
      maxStorageBytes: updated.maxStorageBytes.toString(),
      isArchived: updated.isArchived,
      createdById: updated.createdById,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  static async deleteRoom(roomId: string, userId: string, confirmationName?: string) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new NotFoundError('Room not found');

    if (room.createdById !== userId) {
      throw new ForbiddenError('Only the room owner can permanently delete this room');
    }

    if (confirmationName && confirmationName.trim() !== room.name.trim()) {
      throw new BadRequestError('Confirmation name does not match room name');
    }

    await ActivityRepository.log({
      roomId: null,
      userId,
      action: 'ROOM_DELETED',
      entityType: 'ROOM',
      entityId: roomId,
      details: { name: room.name },
    });

    await RoomRepository.delete(roomId);
    return { message: 'Room deleted successfully' };
  }
}
