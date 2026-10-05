import { Router } from 'express';
import { authRouter, userRouter } from './auth.routes';
import { roomRouter } from './room.routes';
import { memberRouter } from './member.routes';
import { fileRouter } from './file.routes';
import { folderRouter } from './folder.routes';
import { commentRouter, favoriteRouter, activityRouter, notificationRouter } from './comment.routes';
import { aiRouter, searchRouter, adminRouter, storageRouter } from './ai.routes';

const apiRouter = Router();

// Public Health Check Endpoint
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CollabRoom API Server',
    version: '1.0.0',
  });
});

// Storage handler for local upload/download signed URLs
apiRouter.use('/storage', storageRouter);

// Authentication routes
apiRouter.use('/auth', authRouter);

// Protected resource routers
apiRouter.use('/users', userRouter);
apiRouter.use('/rooms', roomRouter);
apiRouter.use('/rooms', memberRouter);
apiRouter.use('/members', memberRouter);
apiRouter.use('/favorites', favoriteRouter);
apiRouter.use('/activity', activityRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/', fileRouter);
apiRouter.use('/', folderRouter);
apiRouter.use('/', commentRouter);

export default apiRouter;
