/**
 * 관리자 계정 단일 조회용 ReadModel
 */
export interface AdminDetailReadModel {
  id: string;
  loginId: string;
  name: string;
  email?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
