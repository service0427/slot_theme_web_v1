export interface User {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  bankInfo?: Record<string, any>;
  business?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export type UserRole = 'advertiser' | 'agency' | 'distributor' | 'operator' | 'developer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export class UserModel implements User {
  constructor(
    public id: string,
    public email: string,
    public role: UserRole,
    public status: UserStatus,
    public createdAt: Date,
    public updatedAt: Date,
    public fullName?: string,
    public phone?: string,
    public bankInfo?: Record<string, any>,
    public business?: Record<string, any>,
    public lastLoginAt?: Date
  ) {}

  isAdmin(): boolean {
    return this.role === 'operator';
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}