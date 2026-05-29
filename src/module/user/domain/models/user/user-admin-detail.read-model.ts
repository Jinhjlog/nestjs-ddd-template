/**
 * 관리자 회원 상세 조회용 ReadModel
 */
export interface UserAdminDetailReadModel {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
