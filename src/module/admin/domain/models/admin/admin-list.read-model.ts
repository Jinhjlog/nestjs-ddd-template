/**
 * 관리자 목록 조회용 ReadModel
 */
export interface AdminListItemReadModel {
  id: string;
  loginId: string;
  name: string;
  email?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}
