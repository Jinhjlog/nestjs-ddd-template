import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponse } from '@shared/swagger';
import { AdminAuth } from '../../../admin/presentation/decorators/admin-auth.decorator';
import { FindAdminUserListUseCase } from '../../application/usecases/find-admin-user-list.usecase';
import { FindAdminUserDetailUseCase } from '../../application/usecases/find-admin-user-detail.usecase';
import { ActivateUserUseCase } from '../../application/usecases/activate-user.usecase';
import { DeactivateUserUseCase } from '../../application/usecases/deactivate-user.usecase';
import { GetAdminUserListRequestDto } from '../dtos/request/get-admin-user-list.request.dto';
import { AdminUserListResponseDto } from '../dtos/response/admin-user-list.response.dto';
import { AdminUserDetailResponseDto } from '../dtos/response/admin-user-detail.response.dto';
import { AdminUserTransformer } from '../transformers/admin-user.transformer';

@ApiTags('관리자 - 회원 관리')
@AdminAuth()
@Controller({ path: 'admin/users', version: '1' })
export class AdminUserController {
  constructor(
    private readonly findAdminUserListUseCase: FindAdminUserListUseCase,
    private readonly findAdminUserDetailUseCase: FindAdminUserDetailUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
  ) {}

  @ApiOperation({
    summary: '회원 목록 조회 [관리자]',
    description:
      '관리자가 전체 회원을 검색, 필터링하여 목록으로 조회합니다.<br><br>' +
      '**필터 조건**<br>' +
      '- name: 이름 검색 (부분 일치)<br>' +
      '- isActive: 활성 상태 (생략 시 전체)<br><br>' +
      '**응답 항목**<br>' +
      '- id, name, email, phone<br>' +
      '- isActive, createdAt<br><br>' +
      '**정렬**<br>' +
      '- 가입일 내림차순<br><br>' +
      '**페이지네이션**<br>' +
      '- page: 페이지 번호 (기본값 1)<br>' +
      '- limit: 페이지당 건수 (기본값 20, 최대 100)<br>' +
      '- currentPage, totalPages로 네비게이션 관리<br>',
  })
  @ApiOkResponse({
    description: '회원 목록 조회 성공',
    type: AdminUserListResponseDto,
  })
  @ApiProblemResponse(
    HttpStatus.BAD_REQUEST,
    '잘못된 요청 (쿼리 파라미터 검증 실패)<br>' +
      '- page/limit이 허용 범위·타입을 벗어난 경우: _**VALIDATION_FAILED**_ (errors[])',
  )
  @HttpCode(HttpStatus.OK)
  @Get()
  async getUserList(
    @Query() dto: GetAdminUserListRequestDto,
  ): Promise<AdminUserListResponseDto> {
    const result = await this.findAdminUserListUseCase.execute({
      name: dto.name,
      isActive: dto.isActive,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    });

    return AdminUserTransformer.toListResponse(result);
  }

  @ApiOperation({
    summary: '회원 활성화 [관리자]',
    description:
      '관리자가 비활성화된 회원을 다시 활성화합니다. isActive를 true로 설정하며, 활성화된 회원은 다시 로그인할 수 있습니다.',
  })
  @ApiParam({
    name: 'userId',
    description: '활성화할 회원 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  @ApiOkResponse({
    description: '회원 활성화 성공',
    type: AdminUserDetailResponseDto,
  })
  @ApiProblemResponse(
    HttpStatus.NOT_FOUND,
    '회원을 찾을 수 없음: _**USER_NOT_FOUND**_',
  )
  @ApiProblemResponse(
    HttpStatus.UNPROCESSABLE_ENTITY,
    '이미 활성화된 사용자: _**USER_ALREADY_ACTIVATED**_',
  )
  @HttpCode(HttpStatus.OK)
  @Patch(':userId/activate')
  async activateUser(
    @Param('userId') userId: string,
  ): Promise<AdminUserDetailResponseDto> {
    await this.activateUserUseCase.execute(userId);
    const detail = await this.findAdminUserDetailUseCase.execute(userId);
    return AdminUserTransformer.toDetailResponse(detail);
  }

  @ApiOperation({
    summary: '회원 비활성화 [관리자]',
    description:
      '관리자가 회원을 비활성화합니다. isActive를 false로 설정하며, 비활성화된 회원은 더 이상 로그인할 수 없습니다.',
  })
  @ApiParam({
    name: 'userId',
    description: '비활성화할 회원 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  @ApiOkResponse({
    description: '회원 비활성화 성공',
    type: AdminUserDetailResponseDto,
  })
  @ApiProblemResponse(
    HttpStatus.NOT_FOUND,
    '회원을 찾을 수 없음: _**USER_NOT_FOUND**_',
  )
  @ApiProblemResponse(
    HttpStatus.UNPROCESSABLE_ENTITY,
    '이미 비활성화된 사용자: _**USER_ALREADY_DEACTIVATED**_',
  )
  @HttpCode(HttpStatus.OK)
  @Patch(':userId/deactivate')
  async deactivateUser(
    @Param('userId') userId: string,
  ): Promise<AdminUserDetailResponseDto> {
    await this.deactivateUserUseCase.execute(userId);
    const detail = await this.findAdminUserDetailUseCase.execute(userId);
    return AdminUserTransformer.toDetailResponse(detail);
  }

  @ApiOperation({
    summary: '회원 상세 조회 [관리자]',
    description:
      '회원 ID로 기본 정보, 소셜 계정 연동 현황, 가입 설문 응답을 조회합니다.<br><br>' +
      '**응답 항목**<br>' +
      '- 기본 정보: name, email, phone, isActive, createdAt, updatedAt, deletedAt<br>',
  })
  @ApiParam({
    name: 'userId',
    description: '회원 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  @ApiOkResponse({
    description: '회원 상세 조회 성공',
    type: AdminUserDetailResponseDto,
  })
  @ApiProblemResponse(
    HttpStatus.NOT_FOUND,
    '회원을 찾을 수 없음: _**USER_NOT_FOUND**_',
  )
  @HttpCode(HttpStatus.OK)
  @Get(':userId')
  async getUserDetail(
    @Param('userId') userId: string,
  ): Promise<AdminUserDetailResponseDto> {
    const detail = await this.findAdminUserDetailUseCase.execute(userId);
    return AdminUserTransformer.toDetailResponse(detail);
  }
}
