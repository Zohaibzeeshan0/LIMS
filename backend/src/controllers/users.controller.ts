import { Request, Response, NextFunction } from 'express';
import { usersService } from '../services/users.service';

export class UsersController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.findAll();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.findOne(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
