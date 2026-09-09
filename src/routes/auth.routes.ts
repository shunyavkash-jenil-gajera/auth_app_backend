import { Router } from 'express';
import { register, login, logout, refresh } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateRegister, validateLogin } from '../middleware/validator.middleware.js';

const router = Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refresh);

// Protected routes
router.post('/logout', protect, logout);
// router.get('/me', protect, getMe);

export default router;
