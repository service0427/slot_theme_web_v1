import { User } from '../models/User';

export interface UserFilter {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

export interface UpdateUserData {
  fullName?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IUserService {
  getUsers(filter?: UserFilter): Promise<ServiceResult<UserListResponse>>;
  getUser(id: string): Promise<ServiceResult<User>>;
  createUser(data: CreateUserData): Promise<ServiceResult<User>>;
  updateUser(id: string, data: UpdateUserData): Promise<ServiceResult<User>>;
  deleteUser(id: string): Promise<ServiceResult<void>>;
}