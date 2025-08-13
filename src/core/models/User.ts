export interface User {
  id: string;
  email: string;
  password?: string; // 업데이트용
  fullName?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  bankInfo?: Record<string, any>;
  business?: Record<string, any>;
  businessInfo?: Record<string, any>; // 이전 버전 호환성
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export type UserRole = 'advertiser' | 'agency' | 'distributor' | 'operator' | 'developer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export class UserModel implements User {
  public permissions?: string[];
  public businessInfo?: Record<string, any>;
  
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
  ) {
    this.businessInfo = this.business; // 이전 버전 호환성
  }

  isAdmin(): boolean {
    return this.role === 'operator';
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}