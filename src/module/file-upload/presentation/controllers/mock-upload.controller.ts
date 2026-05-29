import {
  Controller,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';

/** 개발 환경 전용 - 파일 업로드 수신 엔드포인트 */
@ApiExcludeController()
@Controller({ path: 'dev/upload', version: VERSION_NEUTRAL })
export class MockUploadController {
  private readonly baseDir = join(process.cwd(), '.uploads');

  @HttpCode(HttpStatus.OK)
  @Put('*path')
  async upload(@Req() req: Request): Promise<{ ok: true }> {
    const storageKey = req.path.replace('/dev/upload/', '');
    const filePath = join(this.baseDir, storageKey);

    await fs.mkdir(dirname(filePath), { recursive: true });

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    await fs.writeFile(filePath, Buffer.concat(chunks));

    return { ok: true };
  }
}
