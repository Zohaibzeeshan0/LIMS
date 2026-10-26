import { Request, Response, NextFunction } from 'express';
import { samplingService } from '../services/sampling.service';

export class SamplingController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.create(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.findAll(req.query, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const lab = (req.query.laboratory || req.query.lab) as string | undefined;
      const result = await samplingService.getSampleMetrics(lab, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getNextSampleId(req: Request, res: Response, next: NextFunction) {
    try {
      const lab = (req.query.laboratory || req.query.lab) as string | undefined;
      const sec = req.query.section as string | undefined;
      const stage = req.query.stageType as string | undefined;
      const result = await samplingService.getNextSampleIdPreview(lab, sec, stage);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async checkSampleId(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.checkSampleIdAvailability(req.params.sampleCode as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = (req.query.code || req.query.sampleCode) as string;
      const result = await samplingService.findOne(code, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.findOne(req.params.id as string, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.update(req.params.id as string, req.body, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async submitToWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.submitToWorkflow(req.params.id as string, req.body, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getSampleSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.getSampleSubmissions(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAllSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.getAllSubmissions(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateSubmissionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await samplingService.updateSubmissionStatus(req.params.submissionId as string, req.body, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const samplingController = new SamplingController();
