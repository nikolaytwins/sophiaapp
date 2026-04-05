/**
 * Однократно на сервере: убрает старые контент/шаги-привычки и добавляет новый набор Sophia.
 *
 *   cd /root/.openclaw/workspace/twinworks && npx tsx scripts/sophia-habits-reset.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { SOPHIA_DEFAULT_HABIT_SEEDS } from '../lib/sophia-habits'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
})
const prisma = new PrismaClient({ adapter })

/** Только явные «старые» метрики контента и шаги — без общего «шаг», чтобы не задеть прогулку. */
const REMOVE_NAME_TESTS = [
  /рилс/i,
  /youtube|ютуб/i,
  /\d+\s*пост/i,
  /10\s*0{3,}\s*шаг|шаг.*10\s*0{3,}/i,
  /\b10k\b/i,
]

async function main() {
  const all = await prisma.habitDefinition.findMany()
  const victims = all.filter((h) => REMOVE_NAME_TESTS.some((re) => re.test(h.name)))

  console.log(
    'Удаляем привычки:',
    victims.map((v) => v.name).join('; ') || '(нет совпадений)'
  )

  for (const h of victims) {
    await prisma.habitCheckIn.deleteMany({ where: { habitDefinitionId: h.id } })
    await prisma.habitDefinition.delete({ where: { id: h.id } })
  }

  let created = 0
  for (const h of SOPHIA_DEFAULT_HABIT_SEEDS) {
    const exists = await prisma.habitDefinition.findFirst({ where: { name: h.name } })
    if (exists) {
      await prisma.habitDefinition.update({
        where: { id: exists.id },
        data: {
          icon: h.icon,
          order: h.order,
          isMain: h.isMain,
          category: h.category,
          subtitle: h.subtitle,
          trackMode: h.trackMode,
          countMin: h.countMin,
          countMax: h.countMax,
          type: h.type,
          slotsCount: h.slotsCount,
        },
      })
      continue
    }
    await prisma.habitDefinition.create({
      data: {
        name: h.name,
        type: h.type,
        slotsCount: h.slotsCount,
        order: h.order,
        isMain: h.isMain,
        icon: h.icon,
        category: h.category,
        subtitle: h.subtitle,
        trackMode: h.trackMode,
        countMin: h.countMin,
        countMax: h.countMax,
      },
    })
    created += 1
  }

  console.log('Готово. Создано новых:', created, '— остальные обновлены по имени или уже были.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
