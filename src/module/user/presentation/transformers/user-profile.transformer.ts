import { UserProfileReadModel } from '../../domain/models/user/user-profile.read-model';
import { MyProfileResponseDto } from '../dtos/response/my-profile.response.dto';

export class UserProfileTransformer {
  static toResponse(readModel: UserProfileReadModel): MyProfileResponseDto {
    return {
      id: readModel.id,
      email: readModel.email !== undefined ? readModel.email : null,
      name: readModel.name !== undefined ? readModel.name : null,
      phone: readModel.phone !== undefined ? readModel.phone : null,
      isActive: readModel.isActive,
      createdAt: readModel.createdAt,
    };
  }
}
