export interface UpdateAdminDto {
  /** 수정 대상 관리자 ID */
  id: string;
  /** 요청자 ID (본인 계정 비활성화 방지 검증용) */
  requesterId: string;
  name?: string;
  /** null 전달 시 이메일 제거 */
  email?: string | null;
  role?: string;
  isActive?: boolean;
  /** 미입력 시 기존 비밀번호 유지 */
  password?: string;
}
