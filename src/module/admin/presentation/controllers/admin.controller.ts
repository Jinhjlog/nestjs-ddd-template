import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponse } from '@shared/swagger';
import { RequireSuperAdmin } from '../decorators/admin-auth.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { FindAdminListUseCase } from '../../application/usecases/find-admin-list.usecase';
import { FindAdminDetailUseCase } from '../../application/usecases/find-admin-detail.usecase';
import { UpdateAdminUseCase } from '../../application/usecases/update-admin.usecase';
import { RegisterAdminUseCase } from '../../application/usecases/register-admin.usecase';
import { AdminListResponseDto } from '../dtos/response/admin-list.response.dto';
import { AdminDetailResponseDto } from '../dtos/response/admin-detail.response.dto';
import { AdminCommandResponseDto } from '../dtos/response/admin-command.response.dto';
import { UpdateAdminRequestDto } from '../dtos/request/update-admin.request.dto';
import { RegisterAdminRequestDto } from '../dtos/request/register-admin.request.dto';
import { AdminTransformer } from '../transformers/admin.transformer';
import type { AuthenticatedAdmin } from '../guards/authenticated-admin';

@ApiTags('관리자 - 계정 관리')
@RequireSuperAdmin()
@Controller({ path: 'admin/admins', version: '1' })
export class AdminController {
  constructor(
    private readonly findAdminListUseCase: FindAdminListUseCase,
    private readonly findAdminDetailUseCase: FindAdminDetailUseCase,
    private readonly updateAdminUseCase: UpdateAdminUseCase,
    private readonly registerAdminUseCase: RegisterAdminUseCase,
  ) {}

  @ApiOperation({
    summary: '관리자 계정 등록 [최고 관리자]',
    description:
      'SUPER_ADMIN이 새로운 관리자 계정을 등록합니다.<br><br>' +
      '**필수 항목**<br>' +
      'loginId, password, name<br><br>' +
      '**선택 항목**<br>' +
      'email<br><br>' +
      '**고정값**<br>' +
      '- role: 항상 ADMIN으로 생성 (SUPER_ADMIN 등록 불가)<br><br>' +
      '**주의사항**<br>' +
      '- loginId는 중복될 수 없습니다.<br>' +
      '- 비밀번호는 8자 이상 25자 이하이며 특수문자를 1개 이상 포함해야 합니다.<br>',
  })
  @ApiCreatedResponse({
    description: '관리자 계정 등록 성공',
    type: AdminCommandResponseDto,
  })
  @ApiProblemResponse(
    HttpStatus.BAD_REQUEST,
    '잘못된 요청 (필드 검증 실패 등)<br>' +
      '**로그인 아이디**<br>' +
      '- 로그인 아이디가 비어있는 경우: _**LOGIN_ID_REQUIRED**_<br>' +
      '- 로그인 아이디가 20자를 초과한 경우 (최대 20자): _**LOGIN_ID_TOO_LONG**_<br>' +
      '<br>' +
      '**비밀번호**<br>' +
      '- 비밀번호가 8자 미만인 경우: _**PASSWORD_TOO_SHORT**_<br>' +
      '- 비밀번호가 25자를 초과한 경우: _**PASSWORD_TOO_LONG**_<br>' +
      '- 비밀번호에 특수문자가 없는 경우: _**PASSWORD_MISSING_SPECIAL_CHARACTER**_<br>' +
      '<br>' +
      '**이름**<br>' +
      '- 이름이 비어있는 경우: _**NAME_REQUIRED**_<br>' +
      '- 이름이 50자를 초과한 경우 (최대 50자): _**NAME_TOO_LONG**_<br>' +
      '<br>' +
      '**이메일**<br>' +
      '- 이메일 형식이 올바르지 않은 경우: _**INVALID_EMAIL_FORMAT**_<br>',
  )
  @ApiProblemResponse(
    HttpStatus.CONFLICT,
    '이미 사용 중인 loginId: _**ADMIN_LOGIN_ID_DUPLICATE**_',
  )
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async registerAdmin(
    @Body() dto: RegisterAdminRequestDto,
  ): Promise<AdminCommandResponseDto> {
    const admin = await this.registerAdminUseCase.execute(dto);

    return AdminTransformer.fromPrimitives(admin);
  }

  @ApiOperation({
    summary: '관리자 계정 목록 조회 [최고 관리자]',
    description:
      'SUPER_ADMIN이 전체 관리자 계정을 목록으로 조회합니다.<br><br>' +
      '**응답 항목**<br>' +
      '- id, loginId, name, email<br>' +
      '- role: SUPER_ADMIN / ADMIN<br>' +
      '- isActive: 활성 상태<br>' +
      '- lastLoginAt: 마지막 로그인 일시 (없으면 null)<br>' +
      '- createdAt: 생성일시<br><br>' +
      '**정렬**<br>' +
      '- 생성일 내림차순<br><br>' +
      '**제외 조건**<br>' +
      '- 소프트 딜리트된 계정 제외<br>',
  })
  @ApiOkResponse({
    description: '관리자 목록 조회 성공',
    type: AdminListResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  async getAdminList(): Promise<AdminListResponseDto> {
    const items = await this.findAdminListUseCase.execute();
    return AdminTransformer.toListResponse(items);
  }

  @ApiOperation({
    summary: '관리자 계정 단일 조회 [최고 관리자]',
    description:
      'SUPER_ADMIN이 관리자 ID로 계정 상세 정보를 조회합니다.<br><br>' +
      '**응답 항목**<br>' +
      '- id, loginId, name, email<br>' +
      '- role: SUPER_ADMIN / ADMIN<br>' +
      '- isActive: 활성 상태<br>' +
      '- lastLoginAt: 마지막 로그인 일시 (없으면 null)<br>' +
      '- createdAt: 생성일시<br>' +
      '- updatedAt: 수정일시<br><br>' +
      '**제외 조건**<br>' +
      '- 소프트 딜리트된 계정 제외<br>',
  })
  @ApiParam({
    name: 'adminId',
    description: '관리자 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  @ApiOkResponse({
    description: '관리자 계정 단일 조회 성공',
    type: AdminDetailResponseDto,
  })
  @ApiProblemResponse(
    HttpStatus.NOT_FOUND,
    '관리자를 찾을 수 없음: _**ADMIN_NOT_FOUND**_',
  )
  @HttpCode(HttpStatus.OK)
  @Get(':adminId')
  async getAdminDetail(
    @Param('adminId') adminId: string,
  ): Promise<AdminDetailResponseDto> {
    const detail = await this.findAdminDetailUseCase.execute(adminId);

    return AdminTransformer.toDetailResponse(detail);
  }

  @ApiOperation({
    summary: '관리자 계정 수정 [최고 관리자]',
    description:
      'SUPER_ADMIN이 관리자 계정 정보를 수정합니다.<br><br>' +
      '**수정 가능 항목**<br>' +
      '- name: 이름 (최대 50자)<br>' +
      '- email: 이메일 (null 전달 시 제거)<br>' +
      '- role: 역할 (SUPER_ADMIN / ADMIN)<br>' +
      '- isActive: 활성 상태<br>' +
      '- password: 새 비밀번호 (미입력 시 기존 비밀번호 유지)<br><br>' +
      '**비밀번호 규칙**<br>' +
      '- 8자 이상 25자 이하<br>' +
      '- 특수문자 1개 이상 포함 필수<br><br>' +
      '**제약 조건**<br>' +
      '- loginId 변경 불가<br>' +
      '- 본인 계정 비활성화 불가<br>',
  })
  @ApiParam({
    name: 'adminId',
    description: '관리자 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  @ApiOkResponse({
    description: '관리자 계정 수정 성공',
    type: AdminCommandResponseDto,
  })
  @ApiProblemResponse(
    HttpStatus.BAD_REQUEST,
    '잘못된 요청 (필드 검증 실패 등)<br>' +
      '**이름**<br>' +
      '- 이름이 비어있는 경우: _**NAME_REQUIRED**_<br>' +
      '- 이름이 50자를 초과한 경우 (최대 50자): _**NAME_TOO_LONG**_<br>' +
      '<br>' +
      '**이메일**<br>' +
      '- 이메일 형식이 올바르지 않은 경우: _**INVALID_EMAIL_FORMAT**_<br>' +
      '<br>' +
      '**역할**<br>' +
      '- 허용되지 않은 역할 값인 경우 (SUPER_ADMIN, ADMIN만 허용): _**ADMIN_ROLE_INVALID**_<br>' +
      '<br>' +
      '**비밀번호**<br>' +
      '- 비밀번호가 8자 미만인 경우: _**PASSWORD_TOO_SHORT**_<br>' +
      '- 비밀번호가 25자를 초과한 경우: _**PASSWORD_TOO_LONG**_<br>' +
      '- 비밀번호에 특수문자가 없는 경우: _**PASSWORD_MISSING_SPECIAL_CHARACTER**_<br>',
  )
  @ApiProblemResponse(
    HttpStatus.NOT_FOUND,
    '관리자를 찾을 수 없음: _**ADMIN_NOT_FOUND**_',
  )
  @ApiProblemResponse(
    HttpStatus.UNPROCESSABLE_ENTITY,
    '비즈니스 규칙 위반<br>' +
      '- 본인 계정을 비활성화하려는 경우: _**CANNOT_DEACTIVATE_SELF**_',
  )
  @HttpCode(HttpStatus.OK)
  @Patch(':adminId')
  async updateAdmin(
    @Param('adminId') adminId: string,
    @Body() dto: UpdateAdminRequestDto,
    @CurrentAdmin() requester: AuthenticatedAdmin,
  ): Promise<AdminCommandResponseDto> {
    const admin = await this.updateAdminUseCase.execute({
      id: adminId,
      requesterId: requester.adminId,
      ...dto,
    });

    return AdminTransformer.fromPrimitives(admin);
  }
}
