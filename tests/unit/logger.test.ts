import { describe, it, expect, jest } from '@jest/globals';
import { logger } from '../../src/utils/logger.js';
import { Environment } from '../../src/constants/environment.enum.js';

describe('Logger Utility Unit Tests', () => {
  it('should call console.log on logger.info', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call console.warn on logger.warn', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Test warn message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call console.error on logger.error with Error object', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Test error message', new Error('Mock error'));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call console.error on logger.error with non-Error metadata', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Test error message', 'Custom error string');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call console.log on logger.debug when not in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = Environment.DEVELOPMENT;

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('Test debug message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();

    process.env.NODE_ENV = originalEnv;
  });
});
