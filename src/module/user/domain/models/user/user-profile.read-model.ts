/**
 * 사용자 프로필 조회용 ReadModel
 *
 * 인증된 사용자가 자신의 프로필 정보를 조회할 때 사용합니다.
 */
export interface UserProfileReadModel {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}
