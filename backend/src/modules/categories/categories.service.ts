import { Injectable } from '@nestjs/common';
import { Errors } from '../../common/http/app-error.js';
import { AppLogger } from '../../common/logging/app-logger.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const WITH_COUNT = { _count: { select: { courses: true } } } as const;

type CategoryRow = { id: string; name: string; _count: { courses: number } };

// Names are unique ignoring case and surrounding spaces (nameKey).
function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

function toCategory(row: CategoryRow) {
  return { id: row.id, name: row.name, courseCount: row._count.courses };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  async list() {
    const rows = await this.prisma.category.findMany({ include: WITH_COUNT, orderBy: { nameKey: 'asc' } });
    return rows.map(toCategory);
  }

  async create(name: string, adminId: string) {
    try {
      const row = await this.prisma.category.create({ data: { name, nameKey: nameKey(name) }, include: WITH_COUNT });
      this.logger.success('Category added', { context: CategoriesService.name, story: 'US-27', categoryId: row.id, by: adminId });
      return toCategory(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw Errors.categoryExists();
      throw error;
    }
  }

  async rename(id: string, name: string, adminId: string) {
    await this.findOrFail(id);
    try {
      const row = await this.prisma.category.update({
        where: { id },
        data: { name, nameKey: nameKey(name) },
        include: WITH_COUNT,
      });
      this.logger.success('Category renamed', { context: CategoriesService.name, story: 'US-27', categoryId: id, by: adminId });
      return toCategory(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw Errors.categoryExists();
      throw error;
    }
  }

  // Courses keep a required category, so a category in use stays (the FK also restricts it).
  async remove(id: string, adminId: string) {
    const category = await this.findOrFail(id);
    if (category._count.courses > 0) throw Errors.categoryInUse(category._count.courses);
    await this.prisma.category.delete({ where: { id } });
    this.logger.success('Category deleted', { context: CategoriesService.name, story: 'US-27', categoryId: id, by: adminId });
  }

  private async findOrFail(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id }, include: WITH_COUNT });
    if (!category) throw Errors.notFound();
    return category;
  }
}
