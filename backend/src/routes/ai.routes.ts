import express, { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { SearchController } from '../controllers/search.controller';
import { AdminController } from '../controllers/admin.controller';
import { StorageController } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { aiLimiter } from '../middleware/rateLimiter';
import { askAiSchema } from '../validators/comment.validator';
import multer from 'multer';

const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } });

const aiRouter = Router();
const searchRouter = Router();
const adminRouter = Router();
const storageRouter = Router();

// RoomAI assistant route
aiRouter.use(authenticate);
aiRouter.post('/ask', aiLimiter, validate(askAiSchema), AiController.askRoomAI);

// Global search route
searchRouter.use(authenticate);
searchRouter.get('/', SearchController.search);

// Admin dashboard routes
adminRouter.use(authenticate, requireAdmin);
adminRouter.get('/stats', AdminController.getStats);
adminRouter.get('/users', AdminController.listUsers);
adminRouter.patch('/users/:userId/status', AdminController.updateUserStatus);
adminRouter.get('/rooms', AdminController.listRooms);

// Local storage upload/download handler (zero-setup fallback when AWS credentials aren't present)
const rawBodyParser = express.raw({ type: '*/*', limit: '100mb' });
storageRouter.put('/local-upload', upload.single('file'), rawBodyParser, StorageController.handleLocalUpload);
storageRouter.post('/local-upload', upload.single('file'), rawBodyParser, StorageController.handleLocalUpload);
storageRouter.get('/local-download', StorageController.handleLocalDownload);

export { aiRouter, searchRouter, adminRouter, storageRouter };
