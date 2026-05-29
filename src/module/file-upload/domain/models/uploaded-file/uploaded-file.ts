import { AggregateRoot, BoundedString, UniqueEntityId } from '@lib/domain';
import { DomainRuleViolationException } from '@shared/exception';
import { FileStatus, FileStatusValues } from './file-status';

/** Presigned URL 만료 시간 (분) */
const PRESIGNED_URL_EXPIRY_MINUTES = 15;

export interface UploadedFileProps {
  id?: string;
  storageKey: string;
  originalName: BoundedString;
  mimeType: string;
  fileSize?: number;
  status: FileStatus;
  purpose: string;
  uploadedBy: string;
  expiresAt: Date;
  confirmedAt?: Date;
  linkedAt?: Date;
  createdAt: Date;
}

/** 업로드 파일 Aggregate Root */
export class UploadedFile extends AggregateRoot<UploadedFileProps> {
  private constructor(props: UploadedFileProps) {
    super(props, new UniqueEntityId(props.id));
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get originalName(): BoundedString {
    return this.props.originalName;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get fileSize(): number | undefined {
    return this.props.fileSize;
  }

  get status(): FileStatus {
    return this.props.status;
  }

  get purpose(): string {
    return this.props.purpose;
  }

  get uploadedBy(): string {
    return this.props.uploadedBy;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt;
  }

  get linkedAt(): Date | undefined {
    return this.props.linkedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** CONFIRMED 상태인지 확인합니다. */
  isConfirmed(): boolean {
    return this.props.status.isConfirmed();
  }

  /** 지정한 purpose로 업로드된 파일인지 확인합니다. */
  isForPurpose(purpose: string): boolean {
    return this.props.purpose === purpose;
  }

  /** 엔티티에 연결되었는지 확인합니다. */
  isLinked(): boolean {
    return this.props.linkedAt != null;
  }

  /** PENDING 상태이면서 만료 시각이 지났는지 확인합니다. */
  isExpired(now: Date = new Date()): boolean {
    return this.props.status.isPending() && now > this.props.expiresAt;
  }

  /**
   * 업로드를 확인합니다. 상태를 CONFIRMED로 전환하고 실제 파일 크기를 설정합니다.
   *
   * @throws {DomainRuleViolationException} FILE_ALREADY_CONFIRMED - PENDING 상태가 아닌 경우
   * @throws {DomainRuleViolationException} FILE_UPLOAD_EXPIRED - 만료 시각이 지난 경우
   */
  confirm(actualFileSize: number): void {
    if (!this.props.status.isPending()) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: '이미 확인된 파일입니다.',
        errorCode: 'FILE_ALREADY_CONFIRMED',
      });
    }

    if (this.isExpired()) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: '업로드 URL이 만료되었습니다.',
        errorCode: 'FILE_UPLOAD_EXPIRED',
      });
    }

    this.props.status = FileStatus.unsafeCreate(FileStatusValues.CONFIRMED);
    this.props.fileSize = actualFileSize;
    this.props.confirmedAt = new Date();
  }

  /**
   * 엔티티에 파일을 연결합니다. CONFIRMED 상태에서만 호출 가능합니다.
   *
   * @throws {DomainRuleViolationException} FILE_NOT_CONFIRMED - CONFIRMED 상태가 아닌 경우
   * @throws {DomainRuleViolationException} FILE_ALREADY_LINKED - 이미 연결된 경우
   */
  link(): void {
    if (!this.props.status.isConfirmed()) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: '확인되지 않은 파일은 연결할 수 없습니다.',
        errorCode: 'FILE_NOT_CONFIRMED',
      });
    }

    if (this.isLinked()) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: '이미 연결된 파일입니다.',
        errorCode: 'FILE_ALREADY_LINKED',
      });
    }

    this.props.linkedAt = new Date();
  }

  /** 새 파일 레코드를 생성합니다. 스토리지 키는 내부에서 자동 생성됩니다. */
  static create(props: {
    originalName: BoundedString;
    mimeType: string;
    purpose: string;
    uploadedBy: string;
  }): UploadedFile {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + PRESIGNED_URL_EXPIRY_MINUTES * 60 * 1000,
    );
    const storageKey = this.generateStorageKey(
      props.purpose,
      props.originalName.value,
      now,
    );

    return new UploadedFile({
      storageKey,
      originalName: props.originalName,
      mimeType: props.mimeType,
      status: FileStatus.unsafeCreate(FileStatusValues.PENDING),
      purpose: props.purpose,
      uploadedBy: props.uploadedBy,
      expiresAt,
      createdAt: now,
    });
  }

  /** {purpose}/{YYYY-MM}/{uniqueId}.{ext} 형식의 스토리지 키를 생성합니다. */
  private static generateStorageKey(
    purpose: string,
    fileName: string,
    now: Date,
  ): string {
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uniqueName = new UniqueEntityId().toString();
    const ext = this.extractExtension(fileName);

    return `uploads/${purpose}/${yearMonth}/${uniqueName}.${ext}`;
  }

  private static extractExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1 || lastDot === fileName.length - 1) {
      return 'bin';
    }
    return fileName.substring(lastDot + 1).toLowerCase();
  }

  /** DB에서 복원합니다 (Mapper 전용, 검증 없음). */
  static unsafeCreate(props: UploadedFileProps): UploadedFile {
    return new UploadedFile(props);
  }
}
