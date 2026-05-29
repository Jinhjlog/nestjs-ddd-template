import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AdminLoginUseCase,
  AdminLogoutUseCase,
  AdminRefreshTokenUseCase,
} from '../../application/usecases';
import { AdminLogoutRequestDto } from '../dtos/request/logout.request.dto';
import { LoginRequestDto } from '../dtos/request/login.request.dto';
import { AdminRefreshTokenRequestDto } from '../dtos/request/refresh-token.request.dto';
import { LoginResponseDto } from '../dtos/response/login.response.dto';

@ApiTags('관리자 - 인증')
@Controller({ path: 'admin-auth', version: '1' })
export class AdminAuthController {
  constructor(
    private readonly adminLoginUseCase: AdminLoginUseCase,
    private readonly adminRefreshTokenUseCase: AdminRefreshTokenUseCase,
    private readonly adminLogoutUseCase: AdminLogoutUseCase,
  ) {}

  @ApiOperation({
    summary: '관리자 로그인',
    description:
      '관리자 아이디와 비밀번호로 로그인합니다.<br><br>' +
      '**필수 항목**<br>' +
      '로그인 아이디, 비밀번호<br><br>' +
      '**주의사항**<br>' +
      '- 아이디 미존재와 비밀번호 불일치 모두 동일한 오류를 반환합니다 (계정 존재 여부 노출 방지)<br>' +
      '- 비활성화된 계정은 로그인할 수 없습니다<br>' +
      '- 로그인 성공 시 마지막 로그인 시간이 갱신됩니다<br>',
  })
  @ApiOkResponse({
    description: '로그인 성공 — 액세스 토큰 + 리프레시 토큰 발급',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      '잘못된 요청 (필드 검증 실패)<br>' +
      '**로그인 아이디**<br>' +
      '- 아이디가 20자를 초과하는 경우 (최대 20자): _**LOGIN_ID_TOO_LONG**_<br>' +
      '<br>' +
      '**비밀번호**<br>' +
      '- 비밀번호가 8자 미만인 경우 (최소 8자): _**PASSWORD_TOO_SHORT**_<br>' +
      '- 비밀번호가 25자를 초과하는 경우 (최대 25자): _**PASSWORD_TOO_LONG**_<br>' +
      '- 비밀번호에 특수문자가 포함되지 않은 경우: _**PASSWORD_MISSING_SPECIAL_CHARACTER**_<br>',
  })
  @ApiUnauthorizedResponse({
    description:
      '인증 실패<br>' +
      '- 아이디 또는 비밀번호 불일치: _**INVALID_CREDENTIALS**_',
  })
  @ApiForbiddenResponse({
    description:
      '접근 거부<br>' + '- 비활성화된 계정: _**ADMIN_ACCOUNT_INACTIVE**_',
  })
  @Throttle({ long: { ttl: 60000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || '';

    return this.adminLoginUseCase.execute({
      ...dto,
      ipAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  @ApiOperation({
    summary: '관리자 토큰 갱신',
    description:
      '리프레시 토큰으로 새 액세스 토큰과 리프레시 토큰을 발급합니다.<br><br>' +
      '**주의사항**<br>' +
      '- 리프레시 토큰은 1회 사용 후 폐기됩니다 (Token Rotation)<br>' +
      '- 만료된 토큰으로 갱신을 시도하면 401 에러를 반환합니다<br>',
  })
  @ApiOkResponse({
    description: '토큰 갱신 성공 — 새 액세스 토큰 + 리프레시 토큰 발급',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      '인증 실패<br>' +
      '- 토큰 형식 오류: _**INVALID_REFRESH_TOKEN_FORMAT**_<br>' +
      '- 토큰 미존재: _**REFRESH_TOKEN_NOT_FOUND**_<br>' +
      '- 토큰 만료: _**REFRESH_TOKEN_EXPIRED**_<br>' +
      '- 유효하지 않은 토큰: _**INVALID_REFRESH_TOKEN**_<br>' +
      '- 관리자 미존재 또는 비활성: _**ADMIN_NOT_FOUND_OR_INACTIVE**_<br>',
  })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: AdminRefreshTokenRequestDto,
  ): Promise<LoginResponseDto> {
    return this.adminRefreshTokenUseCase.execute(dto);
  }

  @ApiOperation({
    summary: '관리자 로그아웃',
    description:
      '리프레시 토큰을 무효화하여 로그아웃합니다.<br><br>' +
      '**주의사항**<br>' +
      '- 리프레시 토큰이 DB에서 삭제되어 이후 토큰 갱신이 불가능해집니다<br>' +
      '- 액세스 토큰은 만료 시까지 유효하므로 클라이언트에서 직접 폐기해야 합니다<br>',
  })
  @ApiNoContentResponse({ description: '로그아웃 성공' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: AdminLogoutRequestDto): Promise<void> {
    await this.adminLogoutUseCase.execute(dto);
  }
}
