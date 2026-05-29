import { Prisma } from '@prisma/generated/client';

export class PrismaJsonUtil {
  static serialize<T>(value: T): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  static deserialize<T>(json: Prisma.JsonValue): T {
    return json as unknown as T;
  }
}
