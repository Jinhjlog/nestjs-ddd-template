import { Module, Provider } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import {
  CleanupOrphanedFilesUseCase,
  ConfirmUploadUseCase,
  RequestUploadUseCase,
} from './application/usecases';
import { FileStoragePort } from './application/ports';
import { UploadedFileAttachmentService } from './application/ohs/uploaded-file-attachment.service';
import { UploadedFileRepository } from './domain/repositories';
import { UploadedFileRepositoryImpl } from './infra/repositories';
import { MockFileStorageAdapter } from './infra/adapters';
import { UploadedFileAttachmentServiceImpl } from './infra/ohs/uploaded-file-attachment.service.impl';
import { OrphanedFileCleanupScheduler } from './presentation/schedulers';
import {
  FileUploadController,
  UserFileUploadController,
  MockUploadController,
} from './presentation/controllers';

const useCases: Provider[] = [
  CleanupOrphanedFilesUseCase,
  ConfirmUploadUseCase,
  RequestUploadUseCase,
];

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), '.uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),
  ],
  controllers: [
    FileUploadController,
    UserFileUploadController,
    MockUploadController,
  ],
  providers: [
    ...useCases,
    OrphanedFileCleanupScheduler,
    {
      provide: UploadedFileRepository,
      useClass: UploadedFileRepositoryImpl,
    },
    {
      provide: FileStoragePort,
      useClass: MockFileStorageAdapter,
    },
    {
      provide: UploadedFileAttachmentService,
      useClass: UploadedFileAttachmentServiceImpl,
    },
  ],
  exports: [UploadedFileAttachmentService],
})
export class FileUploadModule {}
