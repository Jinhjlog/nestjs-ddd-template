/** 용도별 업로드 정책 */
export interface UploadPolicy {
  /** 허용 MIME 타입 목록 */
  allowedMimeTypes: string[];
  /** 최대 파일 크기 (바이트) */
  maxFileSize: number;
}

const MB = 1024 * 1024;

/**
 * 용도별 업로드 정책 맵
 *
 * 용도(purpose)별로 허용 MIME 타입과 최대 크기를 다르게 둔다.
 * 새 용도가 필요하면 여기 한 곳에 추가하면 검증/문서/타입이 함께 따라온다.
 * (아래는 예시 용도 — 실제 프로젝트의 업로드 용도에 맞게 교체한다.)
 */
const UPLOAD_POLICIES = {
  'profile-image': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 5 * MB,
  },
  attachment: {
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxFileSize: 20 * MB,
  },
  'editor-content': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFileSize: 5 * MB,
  },
} as const satisfies Record<string, UploadPolicy>;

/** 허용된 업로드 용도 */
export type UploadPurpose = keyof typeof UPLOAD_POLICIES;

/** 용도별 상수 (외부 BC에서 import하여 사용) */
export const FILE_PURPOSE = {
  PROFILE_IMAGE: 'profile-image',
  ATTACHMENT: 'attachment',
  EDITOR_CONTENT: 'editor-content',
} as const satisfies Record<string, UploadPurpose>;

/** 허용된 업로드 용도 목록 */
export const UPLOAD_PURPOSES = Object.keys(UPLOAD_POLICIES) as UploadPurpose[];

/** confirm 시 자동으로 link() 처리할 용도 목록 (에디터 인라인 이미지 등) */
const AUTO_LINK_PURPOSES: ReadonlySet<string> = new Set<string>([
  'editor-content',
]);

/** 해당 용도가 confirm 시 자동 link 대상인지 확인합니다. */
export function isAutoLinkPurpose(purpose: string): boolean {
  return AUTO_LINK_PURPOSES.has(purpose);
}

/** 용도에 해당하는 업로드 정책을 반환합니다. 없으면 undefined. */
export function getUploadPolicy(purpose: string): UploadPolicy | undefined {
  return UPLOAD_POLICIES[purpose as UploadPurpose];
}
