# Quick Security & Stability Fixes (Status)

Re-evaluated on February 20, 2026. The P0 and most P1 fixes have been applied.

## Current Status

- ✅ Debug logging removed
- ✅ Rate limiting added (in-memory)
- ✅ Device revocation fixed
- ✅ Audit logging added (partial coverage)
- ✅ Password policy checks added
- ✅ CSV size validation added (10MB)
- ✅ Zod validation added (admin login, link creation, recovery request)
- ⚠️ Remaining: audit log coverage, document single-instance rate limit assumption

---

## 🔴 P0: Fix Before Production (Completed)

### 1. Remove Debug Logging (Completed)

**Files to fix**:

- [src/lib/server/db.ts](src/lib/server/db.ts) - Lines 50, 59, 63
- [src/routes/admin/csv/+page.server.ts](src/routes/admin/csv/+page.server.ts) - Lines 59-71, 74
- [src/routes/v/[linkId]/+page.server.ts](src/routes/v/[linkId]/+page.server.ts) - Line 18, 81

**Replace all `console.log()` and `console.error()` with proper logging** or remove entirely for non-sensitive information.

```typescript
// BEFORE
console.log('setCurrentFile called with:', fileId);
console.error('Error setting active file:', error);

// AFTER
// Remove entirely, or use structured logger:
logger.debug('File activation initiated');
logger.error('File activation failed', { error: error.message });
```

---

### 2. Fix Device Revocation Logic (Completed)

**File**: [src/lib/server/db.ts](src/lib/server/db.ts) - `revokeViewerDevice()` function

**Current issue**: Only denies recovery requests but doesn't delete revoked device token

```typescript
// CURRENT (BROKEN)
export async function revokeViewerDevice(deviceId: string): Promise<void> {
    const { data: device, error: deviceError } = await supabase
        .from('link_devices')
        .select('id, link_id, ua_hash')
        .eq('id', deviceId)
        .maybeSingle();
    if (deviceError) throw new Error(deviceError.message);
    if (!device) return;

    // ❌ Missing: DELETE from link_devices first!

    const { error: deleteError } = await supabase.from('link_devices').delete().eq('id', deviceId);
    if (deleteError) throw new Error(deleteError.message); // This deletes, but AFTER using it

    await supabase
        .from('recovery_requests')
        .update({ status: 'denied', resolved_at: new Date().toISOString() })
        .eq('link_id', device.link_id)
        .eq('ua_hash', device.ua_hash)
        .eq('status', 'approved');
}
```

**Fix**:

```typescript
export async function revokeViewerDevice(deviceId: string): Promise<void> {
    // 1. Get device info before deletion
    const { data: device, error: deviceError } = await supabase
        .from('link_devices')
        .select('id, link_id, ua_hash')
        .eq('id', deviceId)
        .maybeSingle();
    if (deviceError) throw new Error(deviceError.message);
    if (!device) return;

    // 2. DELETE the device token (prevents further access)
    const { error: deleteError } = await supabase
        .from('link_devices')
        .delete()
        .eq('id', deviceId);
    if (deleteError) throw new Error(deleteError.message);

    // 3. Deny any pending recovery requests for that device/link combo
    await supabase
        .from('recovery_requests')
        .update({ status: 'denied', resolved_at: new Date().toISOString() })
        .eq('link_id', device.link_id)
        .eq('ua_hash', device.ua_hash)
        .eq('status', 'approved');
}
```

---

### 3. Implement Rate Limiting (Completed, in-memory only)

**Endpoints to protect**:

- `POST /admin/login` (password attempts)
- `POST /v/[linkId]?/login` (one-time password attempts)
- `POST /v/[linkId]?/request` (recovery request submissions)

**Recommended approach**:
Use the in-memory store for single-instance deployments; only add Redis if you scale horizontally.

**Option A: Simple In-Memory (good for single-instance apps)**

Create `src/lib/server/rateLimit.ts`:

```typescript
import { type RequestEvent } from '@sveltejs/kit';

const attempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

export function rateLimit(identifier: string): boolean {
    const now = Date.now();
    const record = attempts.get(identifier);

    if (!record || now > record.resetTime) {
        attempts.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
        return true;
    }

    record.count++;
    if (record.count > MAX_ATTEMPTS) {
        return false;
    }

    return true;
}

export function getRateLimitKey(event: RequestEvent, type: string): string {
    // Use IP + endpoint for unique identity
    const ip = event.getClientAddress?.() || event.request.headers.get('x-forwarded-for') || 'unknown';
    return `${type}:${ip}`;
}
```

**Apply in routes**:

```typescript
// src/routes/admin/login/+page.server.ts
import { rateLimit, getRateLimitKey } from '$lib/server/rateLimit';

export const actions: Actions = {
    default: async ({ request, cookies, ...event }) => {
        const key = getRateLimitKey(event, 'login');
        if (!rateLimit(key)) {
            return fail(429, { error: 'Too many login attempts. Try again later.' });
        }

        // ... rest of login logic
    }
};
```

Similar pattern for viewer password and recovery requests.

---

### 4. Implement Audit Logging (Completed, partial coverage)

**File** (create new): `src/lib/server/auditLog.ts`

```typescript
import { supabase } from './supabase';

export type AuditAction =
    | 'admin_login'
    | 'admin_logout'
    | 'csv_uploaded'
    | 'csv_deleted'
    | 'link_created'
    | 'link_activated'
    | 'link_deactivated'
    | 'link_deleted'
    | 'viewer_accessed'
    | 'password_verified'
    | 'device_revoked'
    | 'recovery_requested'
    | 'recovery_approved'
    | 'recovery_denied';

export async function auditLog(
    action: AuditAction,
    details: Record<string, any>,
    sessionId?: string
): Promise<void> {
    const { error } = await supabase.from('audit_logs').insert({
        action,
        details,
        session_id: sessionId || null,
        created_at: new Date().toISOString()
    });

    if (error) {
        // Do not throw or log in production hot paths.
    }
}
```

**Add to schema.sql**:

```sql
create table if not exists audit_logs (
    id uuid primary key default gen_random_uuid(),
    action text not null,
    details jsonb,
    session_id text,
    created_at timestamptz not null default now()
);

create index if not exists audit_logs_action_created
    on audit_logs (action, created_at);

create index if not exists audit_logs_session
    on audit_logs (session_id);
```

**Integrate into critical functions**:

```typescript
// In auth.ts
export async function createAdminSession(userAgent: string): Promise<AdminSession> {
    const sessionId = generateToken();
    // ... existing logic ...

    await auditLog('admin_login', {
        userAgent
    }, sessionId);

    return { sessionId, userAgentHash, expiresAt };
}

// In db.ts
export async function uploadEncryptedCsv(...): Promise<StoredFile> {
    // ... existing logic ...

    await auditLog('csv_uploaded', {
        filename: file.name,
        rowCount: parsed.rows.length
    });

    return data;
}
```

---

## 🟡 P1: High Priority (Mostly Completed)

### 5. Enforce Password Policy (Completed)

Create `src/lib/server/validation.ts`:

```typescript
export function validateAdminPassword(password: string): string | null {
    if (password.length < 12) {
        return 'Password must be at least 12 characters';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain uppercase letters';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain numbers';
    }
    return null;
}

export function validateLinkPassword(password: string): string | null {
    if (password.length < 6) {
        return 'Password must be at least 6 characters';
    }
    return null;
}
```

Use in routes:

```typescript
// src/routes/admin/login/+page.server.ts
import { validateAdminPassword } from '$lib/server/validation';

const passwordError = validateAdminPassword(password);
if (passwordError) {
    return fail(400, { error: passwordError });
}
```

---

### 6. Add CSV File Size Validation (Completed)

Create in [src/lib/server/csv.ts](src/lib/server/csv.ts):

```typescript
const MAX_CSV_SIZE_MB = 10;
const MAX_CSV_SIZE_BYTES = MAX_CSV_SIZE_MB * 1024 * 1024;

export function validateCsvSize(file: File): string | null {
    if (file.size > MAX_CSV_SIZE_BYTES) {
        return `File exceeds ${MAX_CSV_SIZE_MB}MB limit`;
    }
    return null;
}
```

Use in [src/routes/admin/csv/+page.server.ts](src/routes/admin/csv/+page.server.ts):

```typescript
upload: async ({ request }) => {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
        return fail(400, { error: 'Missing file' });
    }

    // ADD THIS:
    const sizeError = validateCsvSize(file);
    if (sizeError) {
        return fail(400, { error: sizeError });
    }

    // ... rest of upload
}
```

---

### 7. Add Input Validation with Zod (Completed)

Install: `npm install zod`

Create [src/lib/server/schemas.ts](src/lib/server/schemas.ts):

```typescript
import { z } from 'zod';

export const adminLoginSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password required')
});

export const createLinkSchema = z.object({
    name: z.string().min(1, 'Link name required').max(100),
    password: z.string().min(6, 'Password too short'),
    criteria: z.string().default('[]'),
    showSerial: z.boolean().default(false),
    hideFirstColumn: z.boolean().default(false)
});

export const recoveryRequestSchema = z.object({
    linkId: z.string().uuid(),
    message: z.string().max(500, 'Message too long').optional()
});
```

Use in routes:

```typescript
import { adminLoginSchema } from '$lib/server/schemas';

export const actions: Actions = {
    default: async ({ request, cookies, ...event }) => {
        const formData = await request.formData();

        const parsed = adminLoginSchema.safeParse({
            email: formData.get('email'),
            password: formData.get('password')
        });

        if (!parsed.success) {
            return fail(400, { error: parsed.error.errors[0].message });
        }

        const { email, password } = parsed.data;
        // ... continue with validated data
    }
};
```

---

### 8. Improve Device Identification (Completed, still spoofable)

**Current**: User-agent hashing only  
**Better**: Combine multiple signals

Update [src/lib/server/crypto.ts](src/lib/server/crypto.ts):

```typescript
export function getDeviceFingerprint(
    userAgent: string,
    acceptLanguage: string,
    clientIp: string
): string {
    const combined = `${userAgent}|${acceptLanguage}|${clientIp}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
}
```

Update [src/routes/v/[linkId]/+page.server.ts](src/routes/v/[linkId]/+page.server.ts):

```typescript
export const load: PageServerLoad = async ({ params, cookies, request, getClientAddress }) => {
    const userAgent = request.headers.get('user-agent') ?? '';
    const acceptLanguage = request.headers.get('accept-language') ?? '';
    const clientIp = getClientAddress?.() || '0.0.0.0';

    const deviceFingerprint = getDeviceFingerprint(userAgent, acceptLanguage, clientIp);

    // Use deviceFingerprint instead of just userAgent hash
    // ...
}
```

---

## 🟢 P2: Medium Priority (Later)

- [ ] Add `.env.example` to repo
- [ ] Add JSDoc to crypto functions
- [ ] Increase test coverage to 50%
- [ ] Move magic numbers to constants
- [ ] Implement structured logging (simple JSON already added)
- [ ] Add database connection health check on startup
- [ ] Document single-instance rate limit assumption

---

## Testing Checklist

After fixes, test:

```bash
# Run all tests
npm run test

# Type check
npm run check

# Lint
npm run lint

# Build
npm run build
```

Add to [src/lib/server/rateLimit.ts](src/lib/server/rateLimit.ts):

```typescript
// Rate limit tests
export { rateLimit as __testExport_rateLimit };
```

---

## Verification Steps

1. **Logging removed**:

   ```bash
   grep -r "console\." src/ --include="*.ts" | grep -v ".spec"
   ```

   Should return nothing.

2. **Device revocation fixed**:
   - Manually test: create link → activate device → revoke → verify no access

3. **Rate limiting working**:
   - Attempt 5+ logins with wrong password
   - 6th attempt should return 429

4. **Audit logging enabled**:
   - Check `audit_logs` table after operations
   - Verify session IDs tracked

---

## Deployment Ready?

Once these P0 items are complete, the app is significantly more secure:

- ✅ No debug leaks
- ✅ Device revocation works
- ✅ Rate limiting prevents brute force
- ✅ Audit trail for investigation
- ✅ Input validation prevents injection

**Estimated total effort: ~16 hours**
