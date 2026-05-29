import { Module, Provider } from '@nestjs/common';
import { FindAdminListUseCase } from './application/usecases/find-admin-list.usecase';
import { FindAdminDetailUseCase } from './application/usecases/find-admin-detail.usecase';
import { UpdateAdminUseCase } from './application/usecases/update-admin.usecase';
import { RegisterAdminUseCase } from './application/usecases/register-admin.usecase';
import { AdminQueryService } from './domain/services/admin-query.service';
import { AdminQueryServiceImpl } from './infra/services/admin-query.service.impl';
import { AdminController } from './presentation/controllers/admin.controller';

const useCases: Provider[] = [
  FindAdminListUseCase,
  FindAdminDetailUseCase,
  UpdateAdminUseCase,
  RegisterAdminUseCase,
];

@Module({
  controllers: [AdminController],
  providers: [
    ...useCases,
    {
      provide: AdminQueryService,
      useClass: AdminQueryServiceImpl,
    },
  ],
})
export class AdminModule {}
