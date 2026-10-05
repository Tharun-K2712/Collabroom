import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai.service';
import { sendSuccess } from '../utils/response';

export class AiController {
  static async askRoomAI(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId, query, fileIds } = req.body;
      const result = await AiService.askRoomAI(roomId, req.user!.id, query, fileIds);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}
