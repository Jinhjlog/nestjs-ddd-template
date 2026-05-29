import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  LoginUseCase,
  RegisterUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
} from '../../application/usecases';
import { UserLoginRequestDto } from '../dtos/request/login.request.dto';
import { UserLoginResponseDto } from '../dtos/response/login.response.dto';
import { RefreshTokenRequestDto } from '../dtos/request/refresh-token.request.dto';
import { RefreshTokenResponseDto } from '../dtos/response/refresh-token.response.dto';
import { RegisterRequestDto } from '../dtos/request/register.request.dto';
import { RegisterResponseDto } from '../dtos/response/register.response.dto';
import { LogoutRequestDto } from '../dtos/request/logout.request.dto';

@ApiTags('사용자 인증')
@Controller({ path: 'user-auth', version: '1' })
export class UserAuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @ApiOperation({ summary: '로그인' })
  @ApiOkResponse({ description: '로그인 성공', type: UserLoginResponseDto })
  @ApiUnauthorizedResponse({
    description: '인증 실패: _**INVALID_CREDENTIALS**_',
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: UserLoginRequestDto): Promise<UserLoginResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  @ApiOperation({ summary: '회원가입' })
  @ApiOkResponse({ description: '회원가입 성공', type: RegisterResponseDto })
  @ApiConflictResponse({
    description: '이메일 중복: _**EMAIL_ALREADY_EXISTS**_',
  })
  @ApiBadRequestResponse({ description: '잘못된 요청 (필드 검증 실패)' })
  @HttpCode(HttpStatus.OK)
  @Post('register')
  async register(
    @Body() dto: RegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    return this.registerUseCase.execute(dto);
  }

  @ApiOperation({ summary: '토큰 갱신' })
  @ApiOkResponse({
    description: '토큰 갱신 성공',
    type: RefreshTokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '토큰 갱신 실패' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.refreshTokenUseCase.execute(dto);
  }

  @ApiOperation({ summary: '로그아웃' })
  @ApiNoContentResponse({ description: '로그아웃 성공' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: LogoutRequestDto): Promise<void> {
    await this.logoutUseCase.execute(dto.refreshToken);
  }
}
