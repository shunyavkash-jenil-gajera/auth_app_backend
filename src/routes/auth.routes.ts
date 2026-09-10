import { Router } from 'express';
import { register, login, logout, refresh } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateRegister, validateLogin } from '../middleware/validator.middleware.js';
import {
  loginRateLimiter,
  refreshRateLimiter,
  registrationRateLimiter,
} from '../middleware/rate-limit.middleware.js';
import { requireTrustedOrigin } from '../middleware/origin.middleware.js';

const router = Router();

// Public routes
router.post('/register', registrationRateLimiter, validateRegister, register);
router.post('/login', loginRateLimiter, validateLogin, login);
router.post('/refresh', requireTrustedOrigin, refreshRateLimiter, refresh);

// Protected routes
router.post('/logout', requireTrustedOrigin, protect, logout);

export default router;
