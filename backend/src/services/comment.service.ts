import { CommentRepository } from '../repositories/comment.repository';
import { FileRepository } from '../repositories/file.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { FavoriteRepository } from '../repositories/favorite.repository';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class CommentService {
  static async createComment(fileId: string, userId: string, content: string, parentId?: string | null) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    const comment = await CommentRepository.create({
      fileId,
      userId,
      content,
      parentId,
    });

    await ActivityRepository.log({
      roomId: file.roomId,
      userId,
      action: 'COMMENT_ADDED',
      entityType: 'COMMENT',
      entityId: comment.id,
      details: { fileId, fileName: file.name },
    });

    // Notify file uploader if someone else commented
    if (file.uploadedById !== userId) {
      await NotificationRepository.create({
        userId: file.uploadedById,
        roomId: file.roomId,
        type: 'COMMENT_ADDED',
        title: `New comment on ${file.name}`,
        message: `${comment.user.fullName} commented: "${content.slice(0, 80)}..."`,
        link: `/rooms/${file.roomId}?fileId=${fileId}`,
      });
    }

    return comment;
  }

  static async listComments(fileId: string) {
    return CommentRepository.listByFileId(fileId);
  }

  static async deleteComment(commentId: string, userId: string, isRoomManager = false) {
    const comment = await CommentRepository.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    if (comment.userId !== userId && !isRoomManager) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await CommentRepository.delete(commentId);
    return { message: 'Comment deleted successfully' };
  }
}

export class FavoriteService {
  static async toggleRoomFavorite(userId: string, roomId: string) {
    return FavoriteRepository.toggleRoomFavorite(userId, roomId);
  }

  static async toggleFileFavorite(userId: string, fileId: string) {
    return FavoriteRepository.toggleFileFavorite(userId, fileId);
  }

  static async listFavorites(userId: string) {
    return FavoriteRepository.listUserFavorites(userId);
  }
}
