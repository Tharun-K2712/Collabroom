import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { prisma } from '../config/db';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  systemRole: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      roomMember?: any;
      roomPermissions?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new UnauthorizedError('Authentication token is missing'));
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      return next(new UnauthorizedError('Invalid or expired access token'));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        systemRole: true,
        status: true,
      },
    });

    if (!user) {
      return next(new UnauthorizedError('User account no longer exists'));
    }

    if (user.status === 'SUSPENDED') {
      return next(new ForbiddenError('Your account has been suspended. Please contact administrator.'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      systemRole: user.systemRole as 'USER' | 'ADMIN',
      status: user.status as 'ACTIVE' | 'SUSPENDED',
    };

    next();
  } catch (error) {
    next(error);
  }
};
