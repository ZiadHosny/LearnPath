// Second entry point (not part of the running API): writes backend/openapi.json for importing
// into Apidog / Postman. Run with `npm run openapi`, which builds with the Nest CLI first so
// decorator metadata is emitted for dependency injection.
import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument, configureApp } from './app.setup.js';

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  configureApp(app);
  const doc = buildOpenApiDocument(app);
  await app.close();

  const out = path.resolve(process.cwd(), 'openapi.json');
  fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
  const methods = ['get', 'post', 'put', 'patch', 'delete'];
  const operations = Object.values(doc.paths).flatMap((item) =>
    Object.keys(item).filter((key) => methods.includes(key)),
  ).length;
  console.log(`Wrote ${out} (${operations} operations)`);
}

void main();
