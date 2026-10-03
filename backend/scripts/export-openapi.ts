// Writes backend/openapi.json for importing into Apidog (Import → OpenAPI/Swagger → File).
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../src/config/env.js';
import { buildOpenApiDocument } from '../src/docs/openapi.js';

const doc = buildOpenApiDocument(`http://localhost:${env.PORT}`);
const out = path.resolve(process.cwd(), 'openapi.json');
fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');

const operations = Object.values(doc.paths).flatMap((item) => Object.keys(item)).length;
console.log(`Wrote ${out} (${operations} operations)`);
