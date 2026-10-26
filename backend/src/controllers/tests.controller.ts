import { Request, Response, NextFunction } from 'express';
import { testsService } from '../services/tests.service';

export class TestsController {
  async findAllSpecifications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testsService.findAllSpecifications();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createSpecification(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testsService.createSpecification(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTestById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testsService.getTestById(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async recordResult(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testsService.recordResult(req.params.id as string, req.body, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyTest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testsService.verifyTest(req.params.id as string, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const testsController = new TestsController();
