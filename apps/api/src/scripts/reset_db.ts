import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or apps/api
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function reset() {
  console.log('🧹 Clearing all data from database...');

  // Delete in order of dependencies if cascade is not handling all tables
  const deleteComments = await prisma.comment.deleteMany({});
  console.log(`- Deleted ${deleteComments.count} comments`);

  const deleteFavorites = await prisma.favorite.deleteMany({});
  console.log(`- Deleted ${deleteFavorites.count} favorites`);

  const deleteActivityLogs = await prisma.activityLog.deleteMany({});
  console.log(`- Deleted ${deleteActivityLogs.count} activity logs`);

  const deleteNotifications = await prisma.notification.deleteMany({});
  console.log(`- Deleted ${deleteNotifications.count} notifications`);

  const deleteVersions = await prisma.fileVersion.deleteMany({});
  console.log(`- Deleted ${deleteVersions.count} file versions`);

  const deleteFiles = await prisma.file.deleteMany({});
  console.log(`- Deleted ${deleteFiles.count} files`);

  const deleteFolders = await prisma.folder.deleteMany({});
  console.log(`- Deleted ${deleteFolders.count} folders`);

  const deleteInviteLinks = await prisma.roomInviteLink.deleteMany({});
  console.log(`- Deleted ${deleteInviteLinks.count} invite links`);

  const deleteInvitations = await prisma.invitation.deleteMany({});
  console.log(`- Deleted ${deleteInvitations.count} invitations`);

  const deletePermissions = await prisma.roomMemberPermission.deleteMany({});
  console.log(`- Deleted ${deletePermissions.count} permissions`);

  const deleteMembers = await prisma.roomMember.deleteMany({});
  console.log(`- Deleted ${deleteMembers.count} room members`);

  const deleteRooms = await prisma.room.deleteMany({});
  console.log(`- Deleted ${deleteRooms.count} rooms`);

  const deleteRefreshTokens = await prisma.refreshToken.deleteMany({});
  console.log(`- Deleted ${deleteRefreshTokens.count} refresh tokens`);

  const deleteResetTokens = await prisma.passwordResetToken.deleteMany({});
  console.log(`- Deleted ${deleteResetTokens.count} password reset tokens`);

  const deleteVerifyTokens = await prisma.emailVerificationToken.deleteMany({});
  console.log(`- Deleted ${deleteVerifyTokens.count} email verification tokens`);

  const deleteUsers = await prisma.user.deleteMany({});
  console.log(`- Deleted ${deleteUsers.count} users / profiles`);

  // Clean local uploads directory if it exists
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsDir)) {
    try {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Cleaned local uploads directory');
    } catch (err) {
      console.warn('Could not clean uploads dir:', err);
    }
  }

  const apiUploadsDir = path.resolve(process.cwd(), 'apps/api/uploads');
  if (fs.existsSync(apiUploadsDir)) {
    try {
      fs.rmSync(apiUploadsDir, { recursive: true, force: true });
      fs.mkdirSync(apiUploadsDir, { recursive: true });
      console.log('📁 Cleaned apps/api/uploads directory');
    } catch (err) {
      console.warn('Could not clean apps/api/uploads dir:', err);
    }
  }

  console.log('✅ Database and storage completely reset to clean state!');
}

reset()
  .catch((e) => {
    console.error('Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
