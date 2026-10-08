import type { Prisma } from '../../generated/prisma/client.js';

// The single rule for what the public may see (FR-010): only Published courses. Draft and
// Archived never appear. Every public query (catalog, course page; EP-02) must use it.
export const PUBLIC_COURSE_WHERE = { status: 'PUBLISHED' } as const satisfies Prisma.CourseWhereInput;
