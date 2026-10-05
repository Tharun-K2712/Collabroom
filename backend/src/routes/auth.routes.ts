import { Router } from 'express';
import { AuthController, UserController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/auth.validator';

const authRouter = Router();
const userRouter = Router();

// Auth routes
authRouter.post('/register', authLimiter, validate(registerSchema), AuthController.register);
authRouter.post('/login', authLimiter, validate(loginSchema), AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);
authRouter.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
authRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), AuthController.resetPassword);
authRouter.get('/me', authenticate, AuthController.getMe);

// User routes
userRouter.patch('/profile', authenticate, validate(updateProfileSchema), UserController.updateProfile);
userRouter.post('/change-password', authenticate, validate(changePasswordSchema), UserController.changePassword);

export { authRouter, userRouter };
