import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import { User } from '../../src/models/user.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return 200 OK when database is connected', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Server is healthy');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      fullName: 'Satish Kanaujiya',
      username: 'satish_01',
      password: 'PassW0rd123!',
    };

    it('should successfully register a new user (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Origin', 'http://localhost:5173')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data.user.fullName).toBe(validUser.fullName);
      expect(res.body.data.user.username).toBe(validUser.username);
    });

    it('should reject registration if username is already taken (409 Conflict)', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .set('Origin', 'http://localhost:5173')
        .send(validUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Origin', 'http://localhost:5173')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('This username is already taken. Please choose another username.');
    });

    it('should reject invalid password format (422 Unprocessable Entity)', async () => {
      const invalidUser = {
        fullName: 'Jenil Gajera',
        username: 'jenil_38',
        password: 'short',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Origin', 'http://localhost:5173')
        .send(invalidUser);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Password must be at least 8 characters');
    });
  });

  describe('POST /api/v1/auth/login, /refresh, /logout & GET /dashboard', () => {
    const userCredentials = {
      fullName: 'Jenil Gajera',
      username: 'jenil38',
      password: 'Password123!',
    };

    beforeEach(async () => {
      const user = new User({
        fullName: userCredentials.fullName,
        username: userCredentials.username,
      });
      user.password = userCredentials.password;
      await user.save();
    });

    it('should successfully login and attach HttpOnly cookies (200 OK)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({
          username: userCredentials.username,
          password: userCredentials.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');

      const cookies = res.get('Set-Cookie') || [];
      expect(cookies.some((c) => c.includes('accessToken='))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
    });

    it('should explain when credentials are incorrect (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({
          username: userCredentials.username,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('The password you entered is incorrect.');
    });

    it('should allow access to /dashboard with valid cookies', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({
          username: userCredentials.username,
          password: userCredentials.password,
        });

      expect(loginRes.status).toBe(200);
      const cookies = loginRes.get('Set-Cookie') || [];

      const dashboardRes = await request(app)
        .get('/api/v1/dashboard')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', cookies);

      expect(dashboardRes.status).toBe(200);
      expect(dashboardRes.body.data.username).toBe(userCredentials.username);
      expect(dashboardRes.body.data.fullName).toBe(userCredentials.fullName);
    });

    it('should refresh tokens via POST /api/v1/auth/refresh', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({
          username: userCredentials.username,
          password: userCredentials.password,
        });

      expect(loginRes.status).toBe(200);
      const cookies = loginRes.get('Set-Cookie') || [];

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', cookies);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.message).toBe('Token refreshed successfully');
    });

    it('should logout user and clear cookies via POST /api/v1/auth/logout', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({
          username: userCredentials.username,
          password: userCredentials.password,
        });

      expect(loginRes.status).toBe(200);
      const cookies = loginRes.get('Set-Cookie') || [];

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe('Logged out successfully');
    });
  });
});
