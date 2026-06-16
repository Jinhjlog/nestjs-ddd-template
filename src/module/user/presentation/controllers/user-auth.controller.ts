import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponse } from '@shared/swagger';
import {
  LoginUseCase,
  RegisterUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
} from '../../application/usecases';
import { UserLoginRequestDto } from '../dtos/request/login.request.dto';
import { RefreshTokenRequestDto } from '../dtos/request/refresh-token.request.dto';
import { RegisterRequestDto } from '../dtos/request/register.request.dto';
import { LogoutRequestDto } from '../dtos/request/logout.request.dto';
import { TokenResponseDto } from '../dtos/response/token.response.dto';
import { UserAuthTransformer } from '../transformers/user-auth.transformer';

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
  @ApiOkResponse({ description: '로그인 성공', type: TokenResponseDto })
  @ApiProblemResponse(
    HttpStatus.BAD_REQUEST,
    '잘못된 요청 (값 검증 실패)<br>' +
      '- 이메일 형식 오류: _**INVALID_EMAIL_FORMAT**_<br>' +
      '- 비밀번호 8자 미만: _**PASSWORD_TOO_SHORT**_<br>' +
      '- 비밀번호 25자 초과: _**PASSWORD_TOO_LONG**_<br>' +
      '- 비밀번호 특수문자 없음: _**PASSWORD_MISSING_SPECIAL_CHARACTER**_<br>',
  )
  @ApiProblemResponse(
    HttpStatus.UNAUTHORIZED,
    '인증 실패 (아이디 또는 비밀번호 불일치): _**INVALID_CREDENTIALS**_',
  )
  @ApiProblemResponse(
    HttpStatus.FORBIDDEN,
    '비활성화된 계정: _**USER_ACCOUNT_INACTIVE**_',
  )
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: UserLoginRequestDto): Promise<TokenResponseDto> {
    const tokens = await this.loginUseCase.execute(dto);
    return UserAuthTransformer.toTokenResponse(tokens);
  }

  @ApiOperation({ summary: '회원가입' })
  @ApiOkResponse({ description: '회원가입 성공', type: TokenResponseDto })
  @ApiProblemResponse(
    HttpStatus.CONFLICT,
    '이메일 중복: _**EMAIL_ALREADY_EXISTS**_',
  )
  @ApiProblemResponse(HttpStatus.BAD_REQUEST, '잘못된 요청 (필드 검증 실패)')
  @HttpCode(HttpStatus.OK)
  @Post('register')
  async register(@Body() dto: RegisterRequestDto): Promise<TokenResponseDto> {
    const tokens = await this.registerUseCase.execute(dto);
    return UserAuthTransformer.toTokenResponse(tokens);
  }

  @ApiOperation({ summary: '토큰 갱신' })
  @ApiOkResponse({ description: '토큰 갱신 성공', type: TokenResponseDto })
  @ApiProblemResponse(
    HttpStatus.UNAUTHORIZED,
    '토큰 갱신 실패<br>' +
      '- 토큰 형식 오류: _**INVALID_REFRESH_TOKEN_FORMAT**_<br>' +
      '- 토큰 미존재: _**REFRESH_TOKEN_NOT_FOUND**_<br>' +
      '- 토큰 만료: _**REFRESH_TOKEN_EXPIRED**_<br>' +
      '- 유효하지 않은 토큰: _**INVALID_REFRESH_TOKEN**_<br>',
  )
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<TokenResponseDto> {
    const tokens = await this.refreshTokenUseCase.execute(dto);
    return UserAuthTransformer.toTokenResponse(tokens);
  }

  @ApiOperation({ summary: '로그아웃' })
  @ApiNoContentResponse({ description: '로그아웃 성공' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: LogoutRequestDto): Promise<void> {
    await this.logoutUseCase.execute(dto.refreshToken);
  }
}
