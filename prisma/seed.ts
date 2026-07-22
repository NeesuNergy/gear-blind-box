/**
 * Prisma seed:将官方配置写入 PostgreSQL。
 * 用法:pnpm db:seed
 */
import { PrismaClient } from '@prisma/client';
import {
  OFFICIAL_CONFIG_ID,
  OFFICIAL_VERSION_TAG,
  OFFICIAL_WEIGHTS,
  SEED_GEAR_ITEMS,
} from './seed-data';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.configRevision.upsert({
    where: { id: OFFICIAL_CONFIG_ID },
    create: { id: OFFICIAL_CONFIG_ID, versionTag: OFFICIAL_VERSION_TAG },
    update: { versionTag: OFFICIAL_VERSION_TAG },
  });

  await prisma.scoreWeightConfig.upsert({
    where: { id: OFFICIAL_CONFIG_ID },
    create: { id: OFFICIAL_CONFIG_ID, ...OFFICIAL_WEIGHTS },
    update: { ...OFFICIAL_WEIGHTS },
  });

  for (const item of SEED_GEAR_ITEMS) {
    await prisma.gearItem.upsert({
      where: { id: item.id },
      create: item,
      update: {
        category: item.category,
        name: item.name,
        subCategory: item.subCategory ?? null,
        baseScore: item.baseScore,
        rarity: item.rarity ?? null,
        weight: item.weight ?? 1,
        imageUrl: item.imageUrl ?? null,
        description: item.description ?? null,
        enabled: item.enabled,
      },
    });
  }

  console.log(`Seed 完成: versionTag=${OFFICIAL_VERSION_TAG}, gearItems=${SEED_GEAR_ITEMS.length}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
