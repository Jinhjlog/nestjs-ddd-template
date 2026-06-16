import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProblemDetailsDto } from '@shared/swagger';

export function swaggerConfig(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setVersion('1.0')
    // 스킴 이름은 @ApiBearerAuth('access-token') 데코레이터와 일치시켜야
    // Swagger UI의 Authorize/자물쇠 입력이 동작한다.
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
        description: '액세스 토큰을 입력하세요 (Bearer 접두사 자동 부착)',
      },
      'access-token',
    )
    .build();

  // 모든 에러 응답은 RFC 9457 problem+json (ProblemDetailsDto)을 공유한다.
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ProblemDetailsDto],
  });
  SwaggerModule.setup('docs', app, document);
}
