import { Request, Response, NextFunction } from 'express';
import { CommentService, FavoriteService } from '../services/comment.service';
import { ActivityService, NotificationService } from '../services/activity.service';
import { sendSuccess, sendCreated } from '../utils/response';

export class CommentController {
  static async createComment(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const comment = await CommentService.createComment(
        fileId,
        req.user!.id,
        req.body.content,
        req.body.parentId
      );
      return sendCreated(res, comment, 'Comment added');
    } catch (error) {
      next(error);
    }
  }

  static async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const comments = await CommentService.listComments(fileId);
      return sendSuccess(res, comments);
    } catch (error) {
      next(error);
    }
  }

  static async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = req.params.commentId as string;
      const isManager = req.roomPermissions?.canManageMembers || false;
      const result = await CommentService.deleteComment(commentId, req.user!.id, isManager);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export class FavoriteController {
  static async toggleRoomFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const result = await FavoriteService.toggleRoomFavorite(req.user!.id, roomId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async toggleFileFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const result = await FavoriteService.toggleFileFavorite(req.user!.id, fileId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async listFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const favorites = await FavoriteService.listFavorites(req.user!.id);
      return sendSuccess(res, favorites);
    } catch (error) {
      next(error);
    }
  }
}

export class ActivityController {
  static async listRoomActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const activities = await ActivityService.listRoomActivities(roomId, limit);
      return sendSuccess(res, activities);
    } catch (error) {
      next(error);
    }
  }

  static async listUserActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const activities = await ActivityService.listUserActivities(req.user!.id, limit);
      return sendSuccess(res, activities);
    } catch (error) {
      next(error);
    }
  }
}

export class NotificationController {
  static async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const notifications = await NotificationService.listNotifications(req.user!.id, limit);
      return sendSuccess(res, notifications);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await NotificationService.markAsRead(id, req.user!.id);
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.markAllAsRead(req.user!.id);
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
