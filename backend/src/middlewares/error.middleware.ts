import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.url} ->`, err);

  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}
