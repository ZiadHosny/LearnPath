import 'reflect-metadata';
import os from 'node:os';
import path from 'node:path';

// Test environment, set before any app module loads its config.
process.env.DATABASE_URL = 'postgresql://learnpath:learnpath@localhost:5433/learnpath_test';
process.env.BCRYPT_COST = '4';
process.env.APP_URL = 'http://localhost:4200';
process.env.UPLOADS_DIR = path.join(os.tmpdir(), 'learnpath-test-uploads');
// Quiet test output; logging tests raise the level at run time.
process.env.LOG_LEVEL = 'error';
