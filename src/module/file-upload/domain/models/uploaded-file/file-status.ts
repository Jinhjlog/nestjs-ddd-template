import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';

export const FileStatusValues = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
} as const;

export type FileStatusType =
  (typeof FileStatusValues)[keyof typeof FileStatusValues];

interface FileStatusProps {
  value: FileStatusType;
}

/** 파일 업로드 상태 Value Object */
export class FileStatus extends ValueObject<FileStatusProps> {
  private static readonly VALID_VALUES = Object.values(FileStatusValues);

  private constructor(props: FileStatusProps) {
    super(props);
  }

  get value(): FileStatusType {
    return this.props.value;
  }

  /** PENDING 상태 여부 */
  isPending(): boolean {
    return this.props.value === FileStatusValues.PENDING;
  }

  /** CONFIRMED 상태 여부 */
  isConfirmed(): boolean {
    return this.props.value === FileStatusValues.CONFIRMED;
  }

  static create(value: string): FileStatus {
    if (!this.VALID_VALUES.includes(value as FileStatusType)) {
      throw new ValueObjectValidationException({
        detail: `유효하지 않은 파일 상태입니다. 허용된 값: ${this.VALID_VALUES.join(', ')}`,
        code: 'FILE_STATUS_INVALID',
      });
    }
    return new FileStatus({ value: value as FileStatusType });
  }

  static unsafeCreate(value: string): FileStatus {
    return new FileStatus({ value: value as FileStatusType });
  }
}
