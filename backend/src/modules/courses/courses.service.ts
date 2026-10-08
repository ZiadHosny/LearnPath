import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/decorators/current-user.decorator.js';
import { imageUrl, removeImage, saveImage } from '../../common/files/image-storage.js';
import { AppError, Errors } from '../../common/http/app-error.js';
import { AppLogger } from '../../common/logging/app-logger.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateCourseDto, UpdateCourseDto } from './dto/course.dto.js';

const WITH_CATEGORY = { category: { select: { id: true, name: true } } } as const;

type CourseRow = Prisma.CourseGetPayload<{ include: typeof WITH_CATEGORY }>;

function toCourse(row: CourseRow) {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.shortDescription,
    description: row.description,
    learningOutcomes: row.learningOutcomes,
    level: row.level,
    category: row.category,
    thumbnailUrl: imageUrl(row.thumbnailPath),
    status: row.status,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  // US-12: always a Draft owned by the instructor creating it.
  async create(ownerId: string, input: CreateCourseDto) {
    await this.ensureCategory(input.categoryId);
    const row = await this.prisma.course.create({
      data: {
        title: input.title,
        shortDescription: input.shortDescription,
        description: input.description ?? null,
        learningOutcomes: input.learningOutcomes ?? [],
        level: input.level,
        categoryId: input.categoryId,
        ownerId,
        status: 'DRAFT',
      },
      include: WITH_CATEGORY,
    });
    this.logger.success('Course draft created', { context: CoursesService.name, story: 'US-12', courseId: row.id, ownerId });
    return toCourse(row);
  }

  // US-13: lesson and student counts are 0 until lessons (Sprint 3) and enrollments (Sprint 5) exist.
  async mine(ownerId: string) {
    const rows = await this.prisma.course.findMany({
      where: { ownerId },
      select: { id: true, title: true, status: true, thumbnailPath: true, updatedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      thumbnailUrl: imageUrl(row.thumbnailPath),
      lessonCount: 0,
      studentCount: 0,
      updatedAt: row.updatedAt,
    }));
  }

  async get(id: string, auth: AuthContext) {
    return toCourse(await this.findEditable(id, auth));
  }

  // US-14: owner or admin, same rules as creation.
  async update(id: string, auth: AuthContext, input: UpdateCourseDto) {
    await this.findEditable(id, auth);
    if (input.categoryId !== undefined) await this.ensureCategory(input.categoryId);
    const row = await this.prisma.course.update({
      where: { id },
      data: {
        title: input.title,
        shortDescription: input.shortDescription,
        description: input.description,
        learningOutcomes: input.learningOutcomes,
        level: input.level,
        categoryId: input.categoryId,
      },
      include: WITH_CATEGORY,
    });
    this.logger.success('Course updated', { context: CoursesService.name, story: 'US-14', courseId: id, by: auth.userId });
    return toCourse(row);
  }

  // The new image is saved first; the old file is removed only after the course points to the new one.
  async setThumbnail(id: string, auth: AuthContext, bytes: Buffer) {
    const course = await this.findEditable(id, auth);
    const thumbnailPath = await saveImage('thumbnails', id, bytes);
    const row = await this.prisma.course.update({ where: { id }, data: { thumbnailPath }, include: WITH_CATEGORY });
    await removeImage(course.thumbnailPath);
    this.logger.success('Course thumbnail changed', { context: CoursesService.name, story: 'US-14', courseId: id, by: auth.userId });
    return toCourse(row);
  }

  private async findEditable(id: string, auth: AuthContext): Promise<CourseRow> {
    const course = await this.prisma.course.findUnique({ where: { id }, include: WITH_CATEGORY });
    if (!course) throw Errors.notFound();
    if (auth.role !== 'ADMIN' && course.ownerId !== auth.userId) throw Errors.forbidden();
    return course;
  }

  // An unknown category is a field error, like the other course fields.
  private async ensureCategory(categoryId: string): Promise<void> {
    const exists = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!exists) {
      throw new AppError('VALIDATION_ERROR', {
        details: [{ field: 'categoryId', message: 'validation.categoryInvalid' }],
      });
    }
  }
}
