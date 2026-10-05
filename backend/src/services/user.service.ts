import { prisma } from '../config/db';
import { UserRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class UserService {
  static async getProfile(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Dynamic, 100% accurate storage calculation from active non-trash files
    const storageAgg = await prisma.file.aggregate({
      where: { uploadedById: userId, isTrash: false },
      _sum: { sizeBytes: true },
    });
    const actualStorage = storageAgg._sum.sizeBytes ?? BigInt(0);

    // Sync database column if desynced
    if (user.storageUsedBytes !== actualStorage) {
      await prisma.user.update({
        where: { id: userId },
        data: { storageUsedBytes: actualStorage },
      });
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      phone: user.phone,
      systemRole: user.systemRole,
      status: user.status,
      storageUsedBytes: actualStorage.toString(),
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }

  static async updateProfile(userId: string, data: { fullName?: string; bio?: string | null; phone?: string | null; avatarUrl?: string | null }) {
    const updated = await UserRepository.update(userId, data);
    const storageAgg = await prisma.file.aggregate({
      where: { uploadedById: userId, isTrash: false },
      _sum: { sizeBytes: true },
    });
    const actualStorage = storageAgg._sum.sizeBytes ?? BigInt(0);

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      phone: updated.phone,
      systemRole: updated.systemRole,
      storageUsedBytes: actualStorage.toString(),
    };
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);
    await UserRepository.update(userId, { passwordHash });
    return { message: 'Password updated successfully' };
  }
}
