import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';
import { TerminalController } from '../controllers/terminal.controller';
import { authenticate } from '../middleware/auth';
import { requireRoomMember, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { createRoomSchema, updateRoomSchema } from '../validators/room.validator';
import { MemberRole } from '@/types/shared';

const router = Router();

router.use(authenticate);

router.post('/', validate(createRoomSchema), RoomController.createRoom);
router.get('/', RoomController.listUserRooms);
router.get('/:roomId', requireRoomMember(), RoomController.getRoomDetails);
router.patch('/:roomId', requireRoomMember(), requireRole(['OWNER', 'MANAGER']), validate(updateRoomSchema), RoomController.updateRoom);
router.delete('/:roomId', requireRoomMember(), requireRole(['OWNER']), RoomController.deleteRoom);

// In-App Terminal Command Execution
router.post('/:roomId/terminal', requireRoomMember(), TerminalController.executeCommand);

export const roomRouter = router;
