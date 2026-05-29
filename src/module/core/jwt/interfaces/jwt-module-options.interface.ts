import { ModuleMetadata } from '@nestjs/common';

export interface JwtModuleOptions {
  accessSecret: string;
  accessTokenExpiresIn: number;
  issuer?: string;
}

export interface JwtModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => JwtModuleOptions | Promise<JwtModuleOptions>;
}
