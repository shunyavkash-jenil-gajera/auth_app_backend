import type { Response } from 'express';
import { logger } from './logger.js';
import { HttpStatus } from '../constants/http-status.enum.js';

/**
 * Custom SendResponse function helper to send formatted, consistent JSON API responses.
 */
export default function SendResponse(
  res: Response,
  statusCode: number = HttpStatus.OK,
  flag: boolean = true,
  message: string = '',
  data: unknown = {}
): Response | void {
  try {
    return res.status(statusCode).json({
      code: statusCode,
      success: flag,
      message,
      data,
    });
  } catch (error) {
    logger.error('Error in SendResponse utility', error);
  }
}
