import { Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/room.service';
import { MemberService } from '../services/member.service';
import { sendSuccess, sendCreated } from '../utils/response';

export class RoomController {
  static async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await RoomService.createRoom(req.user!.id, req.body);
      return sendCreated(res, room, 'Room created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listUserRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = req.query.filter as 'owned' | 'shared' | 'all' | undefined;
      const search = req.query.search as string | undefined;
      const rooms = await RoomService.listUserRooms(req.user!.id, filter, search);
      return sendSuccess(res, rooms);
    } catch (error) {
      next(error);
    }
  }

  static async getRoomDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const room = await RoomService.getRoomDetails(roomId, req.user!.id);
      return sendSuccess(res, room);
    } catch (error) {
      next(error);
    }
  }

  static async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const updated = await RoomService.updateRoom(roomId, req.user!.id, req.body);
      return sendSuccess(res, updated, 'Room settings updated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const confirmation = req.body?.confirmationName || (req.query?.confirmation as string);
      const result = await RoomService.deleteRoom(roomId, req.user!.id, confirmation);
      return sendSuccess(res, result, 'Room deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export class MemberController {
  static async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const members = await MemberService.listMembers(roomId);
      return sendSuccess(res, members);
    } catch (error) {
      next(error);
    }
  }

  static async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const invitation = await MemberService.inviteMember(roomId, req.user!.id, req.body);
      return sendCreated(res, invitation, 'Invitation sent successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createInviteLink(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const link = await MemberService.createInviteLink(roomId, req.user!.id, req.body);
      return sendCreated(res, link, 'Invite link generated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      const result = await MemberService.acceptInvitation(token, req.user!.id);
      return sendSuccess(res, result, 'Joined room successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const userId = req.params.userId as string;
      const updated = await MemberService.updateMemberRole(
        roomId,
        userId,
        req.user!.id,
        req.body.role
      );
      return sendSuccess(res, updated, 'Member role updated');
    } catch (error) {
      next(error);
    }
  }

  static async updatePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const userId = req.params.userId as string;
      const updated = await MemberService.updateCustomPermissions(
        roomId,
        userId,
        req.user!.id,
        req.body
      );
      return sendSuccess(res, updated, 'Member permissions updated');
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const userId = req.params.userId as string;
      const result = await MemberService.removeMember(roomId, userId, req.user!.id);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
