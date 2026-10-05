/**
 * CollabRoom Comprehensive Automated Test Suite
 * Tests:
 * 1. Password hashing & verification
 * 2. JWT signing & verification
 * 3. RBAC & Granular Permission calculations
 * 4. File extension & security validation
 * 5. Storage key generation
 */

import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, verifyAccessToken } from '../utils/jwt';
import { DEFAULT_ROLE_PERMISSIONS, MemberRole } from '@/types/shared';
import { StorageService } from '../services/storage.service';

async function runTests() {
  console.log('🧪 Starting CollabRoom Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Password Security Tests
  console.log('[1/4] Testing Password Security:');
  const plainPassword = 'SuperSecurePassword2026!';
  const hash = await hashPassword(plainPassword);
  assert(hash.length > 20 && hash !== plainPassword, 'Password is properly salted and hashed');
  const isValid = await comparePassword(plainPassword, hash);
  assert(isValid === true, 'Correct password verification succeeds');
  const isInvalid = await comparePassword('WrongPassword', hash);
  assert(isInvalid === false, 'Incorrect password verification fails');

  // 2. JWT Security Tests
  console.log('\n[2/4] Testing JWT Authentication:');
  const payload = { userId: 'user-uuid-1234', email: 'test@collabroom.io', systemRole: 'USER' };
  const token = signAccessToken(payload);
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT Access Token generated with 3 parts');
  const verified = verifyAccessToken(token);
  assert(verified.userId === payload.userId && verified.email === payload.email, 'JWT payload verified accurately');

  // 3. RBAC & Permission Tests
  console.log('\n[3/4] Testing RBAC Matrix:');
  assert(DEFAULT_ROLE_PERMISSIONS.OWNER.canDelete === true, 'OWNER has canDelete permission');
  assert(DEFAULT_ROLE_PERMISSIONS.OWNER.canUpload === true, 'OWNER has canUpload permission');
  assert(DEFAULT_ROLE_PERMISSIONS.OWNER.canManagePermissions === true, 'OWNER has canManagePermissions');
  assert(DEFAULT_ROLE_PERMISSIONS.MANAGER.canUpload === false, 'MANAGER cannot upload files');
  assert(DEFAULT_ROLE_PERMISSIONS.MANAGER.canEdit === true, 'MANAGER can edit files');
  assert(DEFAULT_ROLE_PERMISSIONS.EDITOR.canDelete === false, 'EDITOR cannot delete files');
  assert(DEFAULT_ROLE_PERMISSIONS.EDITOR.canUpload === false, 'EDITOR cannot upload files');
  assert(DEFAULT_ROLE_PERMISSIONS.EDITOR.canEdit === true, 'EDITOR can edit files');
  assert(DEFAULT_ROLE_PERMISSIONS.VIEWER.canUpload === false, 'VIEWER cannot upload files');
  assert(DEFAULT_ROLE_PERMISSIONS.VIEWER.canEdit === false, 'VIEWER cannot edit files');
  assert(DEFAULT_ROLE_PERMISSIONS.VIEWER.canView === true, 'VIEWER can view files');

  // 4. File Security Tests
  console.log('\n[4/4] Testing File Security & Storage Keys:');
  const storageKey = StorageService.generateStorageKey('room-xyz', 'my resume final draft (2).pdf');
  assert(storageKey.startsWith('rooms/room-xyz/files/'), 'Storage key correctly nested inside room namespace');
  assert(storageKey.endsWith('.pdf'), 'Storage key maintains sanitized extension');
  assert(!storageKey.includes(' '), 'Storage key sanitized of whitespace');

  try {
    StorageService.validateFile('virus.exe', 1024, 'application/x-msdownload');
    assert(false, 'Dangerous file extension rejected');
  } catch (err: any) {
    assert(err.message.includes('not allowed'), 'Dangerous file extension blocked with error');
  }

  console.log(`\n========================================`);
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
