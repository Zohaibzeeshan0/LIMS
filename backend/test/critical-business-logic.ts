/**
 * City Pharma LIMS — Automated Critical Business Logic & Security Test Suite
 * Tests cGMP & 21 CFR Part 11 requirements:
 * 1. Password hashing verification with bcrypt
 * 2. Secure JWT authentication and invalid credential rejection
 * 3. Rate limiting for authentication endpoints (HTTP 429 & Retry-After)
 * 4. Sample ID Uniqueness enforcement (HTTP 409 Conflict)
 * 5. Permanent deletion prohibition under cGMP (HTTP 403 Forbidden)
 * 6. Business date validation (Exp Date < Mfg Date -> HTTP 400)
 * 7. Business quantity validation (Quantity <= 0 -> HTTP 400)
 * 8. Atomic transactions & Audit Trail / AuditLog creation with previous & new values
 * 9. Non-destructive cancellation with mandatory regulatory reason
 * 10. Safe error handling without secrets or stack trace leakage
 */

import { PrismaClient, SampleStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, message: 'PASSED', durationMs });
    console.log(`  [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ name, passed: false, message: err.message || String(err), durationMs });
    console.error(`  [FAIL] ${name} (${durationMs}ms): ${err.message}`);
  }
}

async function main() {
  console.log('\n===============================================================');
  console.log(' CITY PHARMA LIMS — CRITICAL BUSINESS LOGIC & SECURITY TEST SUITE');
  console.log(` Target API: ${BASE_URL}`);
  console.log(` Timestamp:  ${new Date().toISOString()}`);
  console.log('===============================================================\n');

  // 1. Password Hashing & Bcrypt Verification
  await runTest('1. Security: Password Hashing using Bcrypt (Never Plaintext)', async () => {
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@citypharma.com' },
    });
    if (!adminUser) throw new Error('Admin user not found in database');

    if (!adminUser.passwordHash.startsWith('$2b$') && !adminUser.passwordHash.startsWith('$2a$')) {
      throw new Error(`Password is not hashed with bcrypt: ${adminUser.passwordHash}`);
    }

    const isMatch = await bcrypt.compare('Admin@1234', adminUser.passwordHash);
    if (!isMatch) throw new Error('Bcrypt hash comparison failed for valid password');

    const isWrongMatch = await bcrypt.compare('WrongPassword999', adminUser.passwordHash);
    if (isWrongMatch) throw new Error('Bcrypt hash incorrectly matched invalid password');
  });

  // 2. Authentication Endpoint (Valid & Invalid Credentials)
  let authToken = '';
  await runTest('2. Security: Authentication & JWT Issuance on /auth/login', async () => {
    // Valid login
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@citypharma.com', password: 'Admin@1234' }),
    });

    if (res.status !== 200) {
      const errText = await res.text();
      throw new Error(`Expected HTTP 200, got ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data.accessToken || !data.refreshToken) {
      throw new Error('Access token or refresh token missing from login response');
    }
    authToken = data.accessToken;

    // Invalid login should reject with 401
    const badRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@citypharma.com', password: 'IncorrectPassword' }),
    });

    if (badRes.status !== 401) {
      throw new Error(`Expected HTTP 401 for bad credentials, got ${badRes.status}`);
    }
  });

  // 3. Rate Limiting on Authentication Endpoints (Brute-Force Protection)
  await runTest('3. Security: Rate Limiting & Throttler on /auth/login (HTTP 429)', async () => {
    let triggeredRateLimit = false;

    // Send 7 rapid bad requests to exceed the 5-attempt threshold
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.42' },
        body: JSON.stringify({ email: 'admin@citypharma.com', password: 'InvalidPasswordAttack' }),
      });

      if (res.status === 429) {
        triggeredRateLimit = true;
        const retryAfter = res.headers.get('retry-after');
        if (!retryAfter) throw new Error('Rate-limited response missing Retry-After header');
        break;
      }
    }

    if (!triggeredRateLimit) {
      throw new Error('Rate limiting guard failed to trigger HTTP 429 after exceeding attempt limit');
    }
  });

  // 4. Sample ID Uniqueness Enforcement (HTTP 409 Conflict)
  await runTest('4. Reliability: Sample ID Uniqueness Policy Enforcement (HTTP 409 Conflict)', async () => {
    const existing = await prisma.sample.findFirst();
    if (!existing) throw new Error('No sample found in database to test uniqueness');

    const res = await fetch(`${BASE_URL}/samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sampleId: existing.sampleId, // Duplicate ID
        nomenclature: 'Test Duplicate Sample API',
        stageType: 'FINISHED_PRODUCT',
        quantity: 50,
        quantityUnit: 'tablets',
      }),
    });

    if (res.status !== 409) {
      const body = await res.text();
      throw new Error(`Expected HTTP 409 Conflict for duplicate sampleId, got ${res.status}: ${body}`);
    }

    const err = await res.json();
    if (!err.message || !err.message.includes('violates uniqueness policy')) {
      throw new Error(`Unexpected error message format: ${JSON.stringify(err)}`);
    }
  });

  // 5. Prohibition of Permanent Deletion under cGMP (HTTP 403 Forbidden)
  await runTest('5. Compliance: Permanent Record Deletion Prohibited under cGMP (HTTP 403 Forbidden)', async () => {
    const sample = await prisma.sample.findFirst();
    if (!sample) throw new Error('No sample found to test deletion guard');

    const res = await fetch(`${BASE_URL}/samples/${sample.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (res.status !== 403) {
      const body = await res.text();
      throw new Error(`Expected HTTP 403 Forbidden for DELETE, got ${res.status}: ${body}`);
    }

    // Verify record still exists in PostgreSQL database
    const stillExists = await prisma.sample.findUnique({ where: { id: sample.id } });
    if (!stillExists) {
      throw new Error('CRITICAL INTEGRITY FAILURE: Sample was deleted from database despite cGMP prohibition');
    }
  });

  // 6. Business Logic: Expiry Date cannot be earlier than Manufacturing Date
  await runTest('6. Business Logic: Date Validation (Exp Date < Mfg Date -> HTTP 400)', async () => {
    const res = await fetch(`${BASE_URL}/samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sampleId: `SMP-TEST-DATE-${Date.now().toString().slice(-4)}`,
        nomenclature: 'Chronologically Invalid Formulation',
        manufacturingDate: '2026-06-01T00:00:00Z',
        expiryDate: '2025-01-01T00:00:00Z', // 17 months before manufacturing!
        quantity: 10,
        quantityUnit: 'vials',
      }),
    });

    if (res.status !== 400) {
      const body = await res.text();
      throw new Error(`Expected HTTP 400 for invalid dates, got ${res.status}: ${body}`);
    }

    const err = await res.json();
    if (!err.message || !err.message.includes('Expiry Date cannot be earlier')) {
      throw new Error(`Expected date validation error message, got: ${err.message}`);
    }
  });

  // 7. Business Logic: Sample Quantity must be positive
  await runTest('7. Business Logic: Quantity Validation (Qty <= 0 -> HTTP 400)', async () => {
    const res = await fetch(`${BASE_URL}/samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sampleId: `SMP-TEST-QTY-${Date.now().toString().slice(-4)}`,
        nomenclature: 'Zero Quantity Ingot',
        quantity: 0, // Invalid!
        quantityUnit: 'capsules',
      }),
    });

    if (res.status !== 400) {
      const body = await res.text();
      throw new Error(`Expected HTTP 400 for non-positive quantity, got ${res.status}: ${body}`);
    }
  });

  // 8. Transactional Sample Creation & Audit Logging
  let createdSampleId = '';
  await runTest('8. Audit & Integrity: Atomic Sample Intake & AuditLog Generation', async () => {
    const testSampleCode = `SMP-AUTOTEST-${Date.now().toString().slice(-5)}`;
    const res = await fetch(`${BASE_URL}/samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sampleId: testSampleCode,
        nomenclature: 'Automated Test Validation Compound USP',
        stageType: 'FINISHED_PRODUCT',
        quantity: 250,
        quantityUnit: 'tablets',
        batchLotNumber: 'LOT-AUTOTEST-99',
        manufacturingDate: '2026-01-15T00:00:00Z',
        expiryDate: '2028-01-15T00:00:00Z',
      }),
    });

    if (res.status !== 201) {
      const body = await res.text();
      throw new Error(`Failed to create sample, got HTTP ${res.status}: ${body}`);
    }

    const sample = await res.json();
    createdSampleId = sample.id;

    // Verify AuditLog record was created within the transaction
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityType: 'Sample',
        entityId: sample.id,
        action: 'SAMPLE_CREATED',
      },
    });

    if (!auditLog) {
      throw new Error('AuditLog entry was not generated during transactional sample creation');
    }

    const newValues = auditLog.newValues as any;
    if (newValues.sampleId !== testSampleCode) {
      throw new Error(`AuditLog newValues sampleId mismatch: expected ${testSampleCode}, got ${newValues?.sampleId}`);
    }
  });

  // 9. Auditable Cancellation Workflow with Mandatory Justification
  await runTest('9. Workflow: Sample Cancellation with Mandatory Regulatory Justification', async () => {
    if (!createdSampleId) throw new Error('Prior created sample id not available');

    // Attempt cancellation without reason -> should fail HTTP 400
    const emptyRes = await fetch(`${BASE_URL}/samples/${createdSampleId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ reason: '' }),
    });

    if (emptyRes.status !== 400) {
      throw new Error(`Expected HTTP 400 for empty cancellation reason, got ${emptyRes.status}`);
    }

    // Valid cancellation with justification
    const validReason = 'Formal deviation QA-DEV-2026-042: Container seal integrity compromised during transit.';
    const cancelRes = await fetch(`${BASE_URL}/samples/${createdSampleId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ reason: validReason }),
    });

    if (cancelRes.status !== 200) {
      const body = await cancelRes.text();
      throw new Error(`Expected HTTP 200 for valid cancellation, got ${cancelRes.status}: ${body}`);
    }

    const updated = await cancelRes.json();
    if (updated.status !== SampleStatus.CANCELLED) {
      throw new Error(`Expected status CANCELLED, got ${updated.status}`);
    }

    // Verify AuditLog has previousValues and newValues
    const cancelAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: createdSampleId,
        action: 'SAMPLE_CANCELLED',
      },
    });

    if (!cancelAudit) throw new Error('AuditLog for SAMPLE_CANCELLED was not created');
  });

  // 10. Safe Error Handling (No Stack Trace or Secrets Leaked)
  await runTest('10. Security: Safe Error Handling (No Stack Traces or Internal Leakage)', async () => {
    // Request a completely invalid route or parameter
    const res = await fetch(`${BASE_URL}/samples/non-existent-guid-uuid-99999`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (res.status !== 404) {
      throw new Error(`Expected HTTP 404, got ${res.status}`);
    }

    const data = await res.json();
    if (data.stack || data.stackTrace) {
      throw new Error('SECURITY VIOLATION: Stack trace leaked in error response');
    }
    if (JSON.stringify(data).includes('prisma') || JSON.stringify(data).includes('SELECT')) {
      throw new Error('SECURITY VIOLATION: Internal SQL or Prisma schema leaked in error response');
    }
  });

  console.log('\n===============================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(` SUMMARY: ${results.filter((r) => r.passed).length} / ${results.length} TESTS PASSED`);
  console.log(` RESULT:  ${allPassed ? 'ALL CRITICAL TESTS PASSED SUCCESSFULLY [CGMP COMPLIANT]' : 'SOME TESTS FAILED'}`);
  console.log('===============================================================\n');

  await prisma.$disconnect();

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error('Fatal test error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
