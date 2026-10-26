import { Request, Response, NextFunction } from 'express';
import { oosService } from '../services/oos.service';

export class OosController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await oosService.findAll();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await oosService.findOne(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await oosService.create(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await oosService.update(req.params.id as string, req.body, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const oosController = new OosController();
