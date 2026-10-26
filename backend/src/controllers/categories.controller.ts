import { Request, Response, NextFunction } from 'express';
import { categoriesService } from '../services/categories.service';

export class CategoriesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category;
      if (category) {
        const result = await categoriesService.findByCategory(category);
        res.json(result);
        return;
      }
      const result = await categoriesService.findAll();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoriesService.create(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const categoriesController = new CategoriesController();
