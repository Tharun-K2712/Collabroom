import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { prisma } from '../config/db';
import { MemberRole, DEFAULT_ROLE_PERMISSIONS, RoomMemberPermissions } from '@collabroom/shared';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (req.user.systemRole !== 'ADMIN') {
    return next(new ForbiddenError('Administrative privileges required'));
  }
  next();
};

export const requireRoomMember = (roomIdParamName: string = 'roomId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError());
      }

      let roomId = (req.params[roomIdParamName] as string) || req.body?.roomId || (req.query?.roomId as string);

      // If checking a file or folder directly, resolve roomId if not explicitly provided
      if (!roomId && req.params.fileId) {
        const file = await prisma.file.findUnique({
          where: { id: req.params.fileId as string },
          select: { roomId: true },
        });
        if (!file) {
          return next(new NotFoundError('File not found'));
        }
        roomId = file.roomId;
      } else if (!roomId && req.params.folderId) {
        const folder = await prisma.folder.findUnique({
          where: { id: req.params.folderId as string },
          select: { roomId: true },
        });
        if (!folder) {
          return next(new NotFoundError('Folder not found'));
        }
        roomId = folder.roomId;
      }

      if (!roomId) {
        return next(new NotFoundError('Room reference missing'));
      }

      // Check room exists
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, createdById: true, isArchived: true },
      });

      if (!room) {
        return next(new NotFoundError('Room not found'));
      }

      // If user is system admin, bypass or treat as Owner
      if (req.user.systemRole === 'ADMIN') {
        req.roomMember = {
          roomId,
          userId: req.user.id,
          role: 'OWNER' as MemberRole,
        };
        req.roomPermissions = DEFAULT_ROLE_PERMISSIONS.OWNER;
        return next();
      }

      // Find membership in room
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: req.user.id,
          },
        },
        include: {
          permission: true,
        },
      });

      if (!member) {
        return next(new ForbiddenError('You are not a member of this room'));
      }

      // Calculate effective permissions
      const roleDefaults = DEFAULT_ROLE_PERMISSIONS[member.role as MemberRole] || DEFAULT_ROLE_PERMISSIONS.VIEWER;
      
      let effectivePermissions: RoomMemberPermissions = { ...roleDefaults };

      if (member.permission) {
        effectivePermissions = {
          canView: member.permission.canView ?? roleDefaults.canView,
          canUpload: member.permission.canUpload ?? roleDefaults.canUpload,
          canDownload: member.permission.canDownload ?? roleDefaults.canDownload,
          canEdit: member.permission.canEdit ?? roleDefaults.canEdit,
          canDelete: member.permission.canDelete ?? roleDefaults.canDelete,
          canRename: member.permission.canRename ?? roleDefaults.canRename,
          canMove: member.permission.canMove ?? roleDefaults.canMove,
          canShare: member.permission.canShare ?? roleDefaults.canShare,
          canManageMembers: member.permission.canManageMembers ?? roleDefaults.canManageMembers,
          canManagePermissions: member.permission.canManagePermissions ?? roleDefaults.canManagePermissions,
        };
      }

      if (member.role === 'OWNER') {
        effectivePermissions = DEFAULT_ROLE_PERMISSIONS.OWNER;
      }

      req.roomMember = member;
      req.roomPermissions = effectivePermissions;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requirePermission = (permissionKey: keyof RoomMemberPermissions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.roomMember || !req.roomPermissions) {
      return next(new ForbiddenError('Authorization context is missing'));
    }

    if (!req.roomPermissions[permissionKey]) {
      return next(
        new ForbiddenError(
          `You do not have permission to perform this action (${String(permissionKey)} is required)`
        )
      );
    }

    next();
  };
};

export const requireRole = (allowedRoles: MemberRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.roomMember) {
      return next(new ForbiddenError('Room membership required'));
    }

    if (!allowedRoles.includes(req.roomMember.role as MemberRole)) {
      return next(
        new ForbiddenError(
          `Action restricted to roles: ${allowedRoles.join(', ')}. Your role is ${req.roomMember.role}`
        )
      );
    }

    next();
  };
};
