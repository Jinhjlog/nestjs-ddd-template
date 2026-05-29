import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserAuth } from '../../../user/presentation/decorators/user-auth.decorator';
import { CurrentUser } from '../../../user/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../user/presentation/guards';
import {
  ConfirmUploadUseCase,
  RequestUploadUseCase,
} from '../../application/usecases';
import { RequestUploadRequestDto } from '../dtos/request';
import {
  ConfirmUploadResponseDto,
  RequestUploadResponseDto,
} from '../dtos/response';

@ApiTags('사용자 - 파일 업로드')
@UserAuth()
@Controller({ path: 'files', version: '1' })
export class UserFileUploadController {
  constructor(
    private readonly requestUploadUseCase: RequestUploadUseCase,
    private readonly confirmUploadUseCase: ConfirmUploadUseCase,
  ) {}

  @ApiOperation({
    summary: '파일 업로드 URL 발급',
    description:
      '파일 업로드용 Presigned URL을 발급합니다.<br><br>' +
      '**필수 항목**<br>' +
      '파일명, MIME 타입, 파일 크기, 용도<br><br>' +
      '**용도별 허용 정책**<br>' +
      '- `profile-image`: 이미지만 (jpeg, png, webp), 최대 5MB<br>' +
      '- `editor-content`: 에디터 인라인 이미지 (jpeg, png, gif, webp), 최대 5MB<br><br>' +
      '**주의사항**<br>' +
      '- 발급된 URL은 15분간 유효합니다.<br>' +
      '- 클라이언트는 반환된 `method`와 `headers`를 사용하여 `uploadUrl`로 파일을 업로드합니다.<br>' +
      '- 업로드 완료 후 반드시 업로드 확인 API를 호출해야 합니다.<br>',
  })
  @ApiCreatedResponse({
    description: 'Presigned URL 발급 성공',
    type: RequestUploadResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      '잘못된 요청<br>' +
      '**파일명**<br>' +
      '- 파일명이 비어있는 경우: _**ORIGINAL_NAME_REQUIRED**_<br>' +
      '- 파일명이 너무 긴 경우 (최대 255자): _**ORIGINAL_NAME_TOO_LONG**_<br>' +
      '<br>' +
      '**용도 / MIME 타입 / 파일 크기**<br>' +
      '- 지원하지 않는 용도: _**UNSUPPORTED_PURPOSE**_<br>' +
      '- 허용되지 않는 MIME 타입: _**MIME_TYPE_NOT_ALLOWED**_<br>' +
      '- 파일 크기 초과: _**FILE_SIZE_EXCEEDED**_<br>',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('upload-url')
  async requestUpload(
    @Body() dto: RequestUploadRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RequestUploadResponseDto> {
    return this.requestUploadUseCase.execute({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      purpose: dto.purpose,
      uploadedBy: user.userId,
    });
  }

  @ApiOperation({
    summary: '파일 업로드 확인',
    description:
      'Presigned URL로 파일 업로드를 완료한 뒤, 서버에 업로드 완료를 알립니다.<br><br>' +
      '서버는 스토리지에서 실제 파일 존재 여부를 확인하고, ' +
      '파일 상태를 PENDING에서 CONFIRMED로 전환합니다.<br><br>' +
      '**주의사항**<br>' +
      '- Presigned URL 발급 후 15분 이내에 호출해야 합니다.<br>' +
      '- 스토리지에 파일이 실제로 업로드되어 있어야 합니다.<br>' +
      '- 이미 확인된 파일에 대해 재호출하면 에러가 발생합니다.<br>',
  })
  @ApiOkResponse({
    description: '업로드 확인 성공',
    type: ConfirmUploadResponseDto,
  })
  @ApiParam({
    name: 'fileId',
    description: '파일 ID',
    example: '01K8AK2Y81AKXPNZHT3YYVRYPD',
  })
  @ApiNotFoundResponse({
    description: '파일을 찾을 수 없음: _**FILE_NOT_FOUND**_',
  })
  @ApiBadRequestResponse({
    description:
      '잘못된 요청<br>' +
      '- 스토리지에 파일이 존재하지 않음: _**FILE_NOT_UPLOADED**_<br>' +
      '- 이미 확인된 파일: _**FILE_ALREADY_CONFIRMED**_<br>' +
      '- 업로드 URL 만료: _**FILE_UPLOAD_EXPIRED**_<br>',
  })
  @HttpCode(HttpStatus.OK)
  @Post(':fileId/confirm')
  async confirmUpload(
    @Param('fileId') fileId: string,
  ): Promise<ConfirmUploadResponseDto> {
    return this.confirmUploadUseCase.execute({ fileId });
  }
}
