export interface LoginDto {
  loginId: string;
  password: string;
  /** 클라이언트 IP (req.ip 또는 X-Forwarded-For) */
  ipAddress: string;
  /** User-Agent 원본 문자열 */
  userAgent?: string;
}
