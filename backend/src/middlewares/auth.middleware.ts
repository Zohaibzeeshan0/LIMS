import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';
import { AuthUser } from '../types/express';

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      statusCode: 401,
      message: 'Unauthorized: Authentication token is required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { sub: string; email: string; role: any };

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        role: true,
        username: true,
        fullName: true,
        employeeId: true,
        department: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: Account is inactive or user not found',
      });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (err: any) {
    res.status(401).json({
      statusCode: 401,
      message: 'Unauthorized: Invalid or expired token',
    });
  }
}
