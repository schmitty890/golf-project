import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to the in-memory database
  await mongoose.connect(mongoUri);
});

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const { collections } = mongoose.connection;
    const collectionKeys = Object.keys(collections);
    // eslint-disable-next-line no-restricted-syntax
    for (const key of collectionKeys) {
      // eslint-disable-next-line no-await-in-loop
      await collections[key].deleteMany({});
    }
  }
});

// Teardown after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
