import { SetMetadata } from '@nestjs/common';

export enum Role {
  ADMIN = 'ADMIN',
  QA_MANAGER = 'QA_MANAGER',
  QC_ANALYST = 'QC_ANALYST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  AUDITOR = 'AUDITOR',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
