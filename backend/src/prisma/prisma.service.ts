import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.validation.js';
import { PrismaClient } from '../generated/prisma/client.js';

type Options = { adapter: PrismaPg; omit: { user: { passwordHash: true } } };

// passwordHash is omitted everywhere unless a query opts in with `omit: { passwordHash: false }`.
@Injectable()
export class PrismaService extends PrismaClient<Options> implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
      omit: { user: { passwordHash: true } },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
