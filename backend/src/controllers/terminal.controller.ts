import { Request, Response, NextFunction } from 'express';
import { TerminalService } from '../services/terminal.service';
import { sendSuccess } from '../utils/response';

export class TerminalController {
  static async executeCommand(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const { command, currentFolderId, currentPath } = req.body;
      const userId = req.user!.id;

      const result = await TerminalService.execute(
        roomId,
        userId,
        command,
        currentFolderId,
        currentPath
      );

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}
