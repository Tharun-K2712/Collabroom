import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth';
import { requireRoomMember, requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { ForbiddenError } from '../utils/errors';
import {
  requestUploadUrlSchema,
  completeFileUploadSchema,
  updateFileSchema,
  createNewVersionSchema,
} from '../validators/file.validator';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Request pre-signed upload URL (S3 or local)
router.post(
  '/rooms/:roomId/files/upload-url',
  requireRoomMember(),
  requirePermission('canUpload'),
  validate(requestUploadUrlSchema),
  FileController.requestUploadUrl
);

// Finalize file upload metadata
router.post(
  '/rooms/:roomId/files',
  requireRoomMember(),
  requirePermission('canUpload'),
  validate(completeFileUploadSchema),
  FileController.completeUpload
);

// List room files
router.get(
  '/rooms/:roomId/files',
  requireRoomMember(),
  requirePermission('canView'),
  FileController.listFiles
);

// File details
router.get(
  '/files/:fileId',
  requireRoomMember(),
  requirePermission('canView'),
  FileController.getFileDetails
);

// Download signed URL (Never expose public URLs, verified permission: canDownload or canView)
router.get(
  '/files/:fileId/download-url',
  requireRoomMember(),
  (req, res, next) => {
    if (req.roomPermissions?.canDownload || req.roomPermissions?.canView) {
      return next();
    }
    return next(new ForbiddenError('You do not have permission to access this file'));
  },
  FileController.getDownloadUrl
);

// Get file raw content for editing
router.get(
  '/files/:fileId/content',
  requireRoomMember(),
  requirePermission('canView'),
  FileController.getFileContent
);

// Save / Autosave file content
router.put(
  '/files/:fileId/content',
  requireRoomMember(),
  requirePermission('canEdit'),
  FileController.saveFileContent
);

// Update file (rename, move, trash, restore)
router.patch(
  '/files/:fileId',
  requireRoomMember(),
  validate(updateFileSchema),
  FileController.updateFile
);

// Upload new version
router.post(
  '/files/:fileId/versions',
  requireRoomMember(),
  requirePermission('canEdit'),
  validate(createNewVersionSchema),
  FileController.createNewVersion
);

// Restore old version
router.post(
  '/files/:fileId/versions/:versionNumber/restore',
  requireRoomMember(),
  requirePermission('canEdit'),
  FileController.restoreVersion
);

// Permanently delete file
router.delete(
  '/files/:fileId',
  requireRoomMember(),
  requirePermission('canDelete'),
  FileController.deletePermanently
);

export const fileRouter = router;
