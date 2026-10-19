import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/audit.service';

export function useAuditLogs(query?: { entityName?: string; action?: string; limit?: number }) {
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => auditService.getAll(query),
  });
}
