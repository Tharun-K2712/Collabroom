import { Router } from 'express';
import { FolderController } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth';
import { requireRoomMember, requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { createFolderSchema, updateFolderSchema } from '../validators/file.validator';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Create folder in room
router.post(
  '/rooms/:roomId/folders',
  requireRoomMember(),
  requirePermission('canUpload'),
  validate(createFolderSchema),
  FolderController.createFolder
);

// List folders in room
router.get(
  '/rooms/:roomId/folders',
  requireRoomMember(),
  requirePermission('canView'),
  FolderController.listFolders
);

// Update folder (rename, move, trash)
router.patch(
  '/folders/:folderId',
  requireRoomMember(),
  validate(updateFolderSchema),
  FolderController.updateFolder
);

// Delete folder permanently
router.delete(
  '/folders/:folderId',
  requireRoomMember(),
  requirePermission('canDelete'),
  FolderController.deleteFolderPermanently
);

export const folderRouter = router;
