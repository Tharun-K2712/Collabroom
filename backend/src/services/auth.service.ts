import { UserRepository } from '../repositories/user.repository';
import { TokenRepository } from '../repositories/token.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  static async register(data: { fullName: string; email: string; password: string }) {
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await UserRepository.create({
      email: data.email,
      fullName: data.fullName,
      passwordHash,
    });

    const jwtPayload = {
      userId: user.id,
      email: user.email,
      systemRole: user.systemRole,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    // Store refresh token in DB (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await TokenRepository.createRefreshToken(user.id, refreshToken, expiresAt);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        systemRole: user.systemRole,
        storageUsedBytes: user.storageUsedBytes.toString(),
      },
      accessToken,
      refreshToken,
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await UserRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Your account has been suspended');
    }

    const jwtPayload = {
      userId: user.id,
      email: user.email,
      systemRole: user.systemRole,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await TokenRepository.createRefreshToken(user.id, refreshToken, expiresAt);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        phone: user.phone,
        systemRole: user.systemRole,
        storageUsedBytes: user.storageUsedBytes.toString(),
      },
      accessToken,
      refreshToken,
    };
  }

  static async refreshToken(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const storedToken = await TokenRepository.findRefreshToken(refreshToken);
    if (!storedToken || storedToken.revoked || new Date(storedToken.expiresAt) < new Date()) {
      throw new UnauthorizedError('Refresh token is invalid or revoked');
    }

    // Refresh Token Rotation: revoke old and issue new
    await TokenRepository.revokeRefreshToken(refreshToken);

    const newJwtPayload = {
      userId: payload.userId,
      email: payload.email,
      systemRole: payload.systemRole,
    };

    const newAccessToken = signAccessToken(newJwtPayload);
    const newRefreshToken = signRefreshToken(newJwtPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await TokenRepository.createRefreshToken(payload.userId, newRefreshToken, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(refreshToken?: string) {
    if (refreshToken) {
      await TokenRepository.revokeRefreshToken(refreshToken);
    }
  }

  static async forgotPassword(email: string) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      // Return success without revealing user existence for security
      return { message: 'If that email is registered, password reset instructions have been sent.' };
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    await TokenRepository.createPasswordResetToken(user.id, resetToken, expiresAt);

    return {
      message: 'Password reset instructions have been generated.',
      resetToken, // Provided for easy development / email integration
    };
  }

  static async resetPassword(token: string, newPassword: string) {
    const resetRecord = await TokenRepository.findPasswordResetToken(token);
    if (!resetRecord || resetRecord.used || new Date(resetRecord.expiresAt) < new Date()) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);
    await UserRepository.update(resetRecord.userId, { passwordHash });
    await TokenRepository.markPasswordResetTokenUsed(resetRecord.id);
    await TokenRepository.revokeAllUserRefreshTokens(resetRecord.userId);

    return { message: 'Password has been reset successfully' };
  }
}
