import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Dashboard welcome page route, protected by protect middleware guard
router.get('/', protect, getDashboardData);

export default router;
