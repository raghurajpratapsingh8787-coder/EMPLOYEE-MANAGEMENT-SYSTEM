import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';

let memoryServer: MongoMemoryServer | null = null;
let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  mongoose.set('strictQuery', true);

  let uri = env.mongodbUri;
  const hasValidMongoScheme = /^mongodb(\+srv)?:\/\//i.test(uri);

  if (!uri || !hasValidMongoScheme) {
    if (uri && !hasValidMongoScheme) {
      console.warn('Ignoring non-MongoDB URI value and falling back to embedded local MongoDB instance');
    }
    const dbPath = path.resolve(process.cwd(), '.data', 'mongodb');
    fs.mkdirSync(dbPath, { recursive: true });

    try {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbPath,
          storageEngine: 'wiredTiger',
        },
      });
    } catch {
      // Fallback to ephemeral in-memory storage if lockfile/wiredTiger fails
      memoryServer = await MongoMemoryServer.create();
    }
    uri = memoryServer.getUri();
    console.log('Connected to embedded local MongoDB instance');
  } else {
    console.log('Connecting to configured MONGODB_URI');
  }

  await mongoose.connect(uri, {
    dbName: 'calibre_hr',
  });
  isConnected = true;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  isConnected = false;
}
