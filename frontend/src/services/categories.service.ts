import { api } from '@/lib/api';
import { TestSpecification } from '@/types/lims';

export const categoriesService = {
  getAll: (category?: string) => {
    const url = category ? `/categories?category=${category}` : '/categories';
    return api.get<TestSpecification[]>(url);
  },

  create: (data: any) => api.post<TestSpecification>('/categories', data),
};
