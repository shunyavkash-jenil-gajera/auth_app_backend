import { describe, it, expect } from '@jest/globals';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/utils/jwt.js';

describe('JWT Utility Unit Tests', () => {
  const mockPayload = {
    userId: '60d5ecb8b5c9c22b1c8e4111',
    tokenVersion: 0,
  };

  it('should generate and verify a valid access token', () => {
    const token = generateAccessToken(mockPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(mockPayload.userId);
    expect(decoded.tokenVersion).toBe(mockPayload.tokenVersion);
  });

  it('should generate and verify a valid refresh token', () => {
    const token = generateRefreshToken(mockPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(mockPayload.userId);
    expect(decoded.tokenVersion).toBe(mockPayload.tokenVersion);
  });
});
