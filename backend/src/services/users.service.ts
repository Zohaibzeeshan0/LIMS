import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export class UsersService {
  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: {
            accessionedSamples: true,
            performedTests: true,
            calibrations: true,
          },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }
}

export const usersService = new UsersService();
