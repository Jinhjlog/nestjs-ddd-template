/**
 * 관리자 회원 목록 조회용 ReadModel
 */
export interface UserAdminListItemReadModel {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}
