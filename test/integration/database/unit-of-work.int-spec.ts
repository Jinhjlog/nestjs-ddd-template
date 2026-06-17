import { Test, TestingModule } from '@nestjs/testing';
import { ulid } from 'ulid';

import { CoreModule } from '@core/core.module';
import { PrismaService } from '@core/database/prisma.service';
import { UNIT_OF_WORK } from '@core/database/tokens';
import { IUnitOfWork } from '@lib/domain';

import { cleanDatabase } from '../../helpers/db-cleanup.helper';

/**
 * Unit of Work (B-Proxy ambient 트랜잭션 전파) 통합 테스트
 *
 * HTTP 레이어 없이 CoreModule(=ConfigModule + DatabaseModule)만 부팅하여
 * PrismaService(Proxy) + PrismaUnitOfWork + AsyncLocalStorage 가 실제 DB에서
 * ① 트랜잭션 전파(롤백) ② 다중 쓰기 원자성 ③ 동시 실행 격리 ④ 고동시성 누수 없음
 * 을 보장하는지 검증한다.
 *
 * 검증 모델: uploaded_files (unique/FK 없음 → 동시 삽입에 적합)
 */
describe('Unit of Work (ambient 트랜잭션 전파) Integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let uow: IUnitOfWork;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile();
    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    uow = moduleRef.get<IUnitOfWork>(UNIT_OF_WORK);
  });

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  /** uploaded_files insert 입력 생성 (id·uploadedBy = ULID(26자)) */
  function fileInput(id: string, purpose = 'uow-test') {
    return {
      id,
      storageKey: `key/${id}`,
      originalName: `${id}.png`,
      mimeType: 'image/png',
      purpose,
      uploadedBy: ulid(),
      expiresAt: new Date(Date.now() + 3_600_000),
    };
  }

  // ─── ① ambient 전파: tx로 실행되는가 (롤백 증명) ────────────────────

  it('uow.execute 내 쓰기는 tx로 실행되어 예외 시 롤백된다 (전파 증명)', async () => {
    const id = ulid();

    await expect(
      uow.execute(async () => {
        // 레포가 하듯 평범하게 prisma 사용 — Proxy가 tx로 자동 위임해야 함
        await prisma.uploadedFile.create({ data: fileInput(id) });
        throw new Error('rollback-me');
      }),
    ).rejects.toThrow('rollback-me');

    // 트랜잭션 밖 조회(루트 커넥션) → 롤백됐으면 없어야 함.
    // Proxy 전파가 깨져 루트 커넥션으로 샜다면 이 행이 남아 테스트 실패.
    const found = await prisma.uploadedFile.findUnique({ where: { id } });
    expect(found).toBeNull();
  });

  it('uow.execute 정상 완료 시 커밋된다', async () => {
    const id = ulid();

    await uow.execute(async () => {
      await prisma.uploadedFile.create({ data: fileInput(id) });
    });

    const found = await prisma.uploadedFile.findUnique({ where: { id } });
    expect(found).not.toBeNull();
  });

  it('한 uow.execute 안 다중 쓰기는 원자적으로 커밋/롤백된다', async () => {
    const a = ulid();
    const b = ulid();

    // 두 건 쓰고 마지막에 throw → 둘 다 롤백
    await expect(
      uow.execute(async () => {
        await prisma.uploadedFile.create({ data: fileInput(a) });
        await prisma.uploadedFile.create({ data: fileInput(b) });
        throw new Error('atomic-rollback');
      }),
    ).rejects.toThrow();

    const count = await prisma.uploadedFile.count();
    expect(count).toBe(0); // 둘 다 안 남음 (원자성)
  });

  // ─── ② 동시 실행 격리 ───────────────────────────────────────────────

  it('동시 다발 uow에서 일부 롤백이 다른 트랜잭션을 오염시키지 않는다', async () => {
    const N = 30;
    const commitIds: string[] = [];
    const rollbackIds: string[] = [];

    const ops = Array.from({ length: N }, (_, i) => {
      const id = ulid();
      const willFail = i % 3 === 0; // 1/3은 롤백
      (willFail ? rollbackIds : commitIds).push(id);

      return uow
        .execute(async () => {
          await prisma.uploadedFile.create({ data: fileInput(id) });
          // tx당 두 번째 쓰기(같은 tx로 가야 함)
          await prisma.uploadedFile.update({
            where: { id },
            data: { purpose: 'committed' },
          });
          if (willFail) throw new Error(`boom-${id}`);
        })
        .catch(() => undefined); // 롤백 tx의 예외만 흡수
    });

    await Promise.all(ops);

    const rows = await prisma.uploadedFile.findMany();
    const ids = new Set(rows.map((r) => r.id));

    // 커밋분은 전부 존재, 롤백분은 전부 부재 (격리 + 원자성)
    for (const id of commitIds) expect(ids.has(id)).toBe(true);
    for (const id of rollbackIds) expect(ids.has(id)).toBe(false);
    expect(rows).toHaveLength(commitIds.length);
    // 커밋분은 두 번째 쓰기(update)까지 반영 → 같은 tx였다는 증거
    expect(rows.every((r) => r.purpose === 'committed')).toBe(true);
  });

  it('고동시성에서 컨텍스트 누수·중복 없이 전부 커밋된다', async () => {
    const N = 40;
    const ids = Array.from({ length: N }, () => ulid());

    await Promise.all(
      ids.map((id) =>
        uow.execute(async () => {
          await prisma.uploadedFile.create({ data: fileInput(id) });
        }),
      ),
    );

    const rows = await prisma.uploadedFile.findMany();
    const persisted = new Set(rows.map((r) => r.id));

    expect(rows).toHaveLength(N); // 중복/유실 없음
    for (const id of ids) expect(persisted.has(id)).toBe(true); // 누수 없이 각자 커밋
  });
});
