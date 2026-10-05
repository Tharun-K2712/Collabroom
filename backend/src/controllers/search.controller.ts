import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';
import { sendSuccess } from '../utils/response';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string) || '';
      const results = await SearchService.globalSearch(req.user!.id, query);
      return sendSuccess(res, results);
    } catch (error) {
      next(error);
    }
  }
}
