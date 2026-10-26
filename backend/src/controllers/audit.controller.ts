import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

export class AuditController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityName, action, limit } = req.query;
      const result = await auditService.findAll({
        entityName: entityName as string,
        action: action as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getByEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityName, entityId } = req.params;
      const result = await auditService.getByEntity(entityName as string, entityId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
