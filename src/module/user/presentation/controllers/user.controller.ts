import { Controller, Get } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, UserAuth } from '../decorators';
import { GetMyProfileUseCase } from '../../application/usecases';
import { MyProfileResponseDto } from '../dtos/response/my-profile.response.dto';
import { UserProfileTransformer } from '../transformers';

@ApiTags('사용자')
@UserAuth()
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private readonly getMyProfileUseCase: GetMyProfileUseCase) {}

  @ApiOperation({
    summary: '내 프로필 조회',
    description:
      '현재 로그인한 사용자의 프로필 정보를 조회합니다.<br><br>' +
      '**처리 흐름**<br>' +
      '1. JWT 액세스 토큰으로 사용자 인증<br>' +
      '2. 토큰의 userId로 사용자 프로필 조회<br>' +
      '3. 프로필 반환<br><br>' +
      '**응답 데이터**<br>' +
      '- `id`: 사용자 고유 ID<br>' +
      '- `name`: 이름 (없으면 null)<br>' +
      '- `email`: 이메일 (없으면 null)<br>' +
      '- `phone`: 전화번호 (없으면 null)<br>' +
      '- `isActive`: 활성 상태<br>' +
      '- `createdAt`: 가입일시<br>',
  })
  @ApiOkResponse({
    description: '프로필 조회 성공',
    type: MyProfileResponseDto,
  })
  @ApiNotFoundResponse({
    description: '사용자를 찾을 수 없음: _**USER_NOT_FOUND**_',
  })
  @Get('me')
  async getMyProfile(
    @CurrentUser('userId') userId: string,
  ): Promise<MyProfileResponseDto> {
    const profile = await this.getMyProfileUseCase.execute(userId);
    return UserProfileTransformer.toResponse(profile);
  }
}
