import request from 'supertest';
import express from 'express';
import stringsRouter from '../../routes/strings.js';
import StringModel from '../../models/String.js';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/strings', stringsRouter);

describe('POST /api/strings', () => {
  it('should create a new string and return 201 status', async () => {
    const response = await request(app)
      .post('/api/strings')
      .send({ value: 'Test string' })
      .expect(201);

    expect(response.body).toHaveProperty('message', 'String saved successfully');
    expect(response.body.data).toHaveProperty('_id');
    expect(response.body.data).toHaveProperty('value', 'Test string');
  });

  it('should return 400 when value is missing', async () => {
    await request(app)
      .post('/api/strings')
      .send({})
      .expect(400);
  });
});

describe('GET /api/strings', () => {
  it('should return all strings', async () => {
    await StringModel.create({ value: 'String 1' });
    await StringModel.create({ value: 'String 2' });

    const response = await request(app)
      .get('/api/strings')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
  });

  it('should return empty array when no strings exist', async () => {
    const response = await request(app)
      .get('/api/strings')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });
});
