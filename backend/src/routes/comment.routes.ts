import { Router } from 'express';
import { CommentController, FavoriteController, ActivityController, NotificationController } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth';
import { requireRoomMember, requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { createCommentSchema } from '../validators/comment.validator';

const commentRouter = Router();
const favoriteRouter = Router();
const activityRouter = Router();
const notificationRouter = Router();

// Comments
commentRouter.use(authenticate);
commentRouter.get('/files/:fileId/comments', requireRoomMember(), requirePermission('canView'), CommentController.listComments);
commentRouter.post('/files/:fileId/comments', requireRoomMember(), validate(createCommentSchema), CommentController.createComment);
commentRouter.delete('/comments/:commentId', CommentController.deleteComment);

// Favorites
favoriteRouter.use(authenticate);
favoriteRouter.get('/', FavoriteController.listFavorites);
favoriteRouter.post('/rooms/:roomId', requireRoomMember(), FavoriteController.toggleRoomFavorite);
favoriteRouter.post('/files/:fileId', requireRoomMember(), FavoriteController.toggleFileFavorite);

// Activity
activityRouter.use(authenticate);
activityRouter.get('/rooms/:roomId/activity', requireRoomMember(), ActivityController.listRoomActivities);
activityRouter.get('/user/activity', ActivityController.listUserActivities);

// Notifications
notificationRouter.use(authenticate);
notificationRouter.get('/', NotificationController.listNotifications);
notificationRouter.patch('/:id/read', NotificationController.markAsRead);
notificationRouter.patch('/read-all', NotificationController.markAllAsRead);

export { commentRouter, favoriteRouter, activityRouter, notificationRouter };
