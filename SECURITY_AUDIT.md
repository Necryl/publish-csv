# Security Audit Report (Re-evaluated)

Generated: February 20, 2026

## Re-evaluation Summary

The quick fixes have been applied. Rate limiting, audit logging, CSV size validation, password policy checks, and stronger device binding are now present. Remaining security risks are mostly about **coverage and robustness** rather than missing features.

**Key remaining risks**:

- Rate limiting is in-memory only (single-instance assumption)
- Device fingerprint uses IP and UA (still spoofable, can cause false negatives)
- Audit logging is partial (not all sensitive actions are logged)

## 🔴 Critical Issues

### 1. **Debug Logging in Production Code (Resolved)**

**Severity**: Medium  
**Files**: `src/lib/server/db.ts`, `src/routes/admin/csv/+page.server.ts`, `src/routes/v/[linkId]/+page.server.ts`

**Problem**: Multiple `console.log()` and `console.error()` statements left in production code that may expose sensitive information:

- `setCurrentFile called with: ${fileId}`
- File IDs being logged
- Form data structure being logged

**Status**: Resolved. Debug logging removed from server and client code.

### 2. **Rate Limiting Added (In-Memory Only)**

**Severity**: High  
**Location**: `src/routes/admin/login/+page.server.ts`, `src/routes/v/[linkId]/+page.server.ts`

**Problem**: Rate limiting exists but is in-memory, so it does not protect multi-instance deployments.

- Admin login attempts
- One-time password verification attempts
- Recovery request submissions

**Impact**: Brute force protection is inconsistent across instances.
**Fix**: Keep in-memory limits for single-instance deployments; only add a shared store if you scale horizontally.

### 3. **Device Binding Improved (Still Spoofable)**

**Severity**: High  
**Location**: `src/lib/server/crypto.ts`, `src/routes/v/[linkId]/+page.server.ts`

**Problem**: Device binding now uses a fingerprint (user-agent + accept-language + IP), but this is still spoofable and can change frequently for mobile users.

```typescript
export function hashUserAgent(userAgent: string): string {
    return crypto.createHash('sha256').update(userAgent).digest('hex');
}
```

User-agents are:

- Public and easily spoofable
- Sent by clients (can be modified)
- Not unique across users

**Impact**: Device binding is better, but not strong against spoofing or IP churn.
**Fix**: Consider device registration or signed device keys stored client-side.

### 4. **Audit Logging Added (Partial Coverage)**

**Severity**: High  
**Location**: Entire application

**Problem**: Audit logging is implemented, but coverage is partial.

- Who accessed which links/data
- When admins approved recovery requests
- When files were uploaded/deleted
- Authentication attempts

**Impact**: Investigation trails are incomplete for some operations.
**Fix**: Add audit logs for deletions, admin link toggles, and viewer data access.

---

## 🟡 High-Priority Issues

### 5. **Password Policy Enforced (Now Active)**

**Severity**: High  
**Location**: `src/routes/admin/login/+page.server.ts`

**Problem**: Password policy is now enforced at login and link creation. Note: if the admin env password is weak, admin login will fail.

```typescript
if (!email || !password) {
    return fail(400, { error: 'Missing credentials' });
}
```

Only checks for presence, not strength.

**Status**: Implemented. Consider validating `ADMIN_PASSWORD` at startup to avoid lockout.

### 6. **Device Revocation Fixed (Resolved)**

**Severity**: Medium  
**Location**: `src/lib/server/db.ts` - `revokeViewerDevice()`

**Problem**: Revocation only denies approved recovery requests for that specific device:

```typescript
await supabase
    .from('recovery_requests')
    .update({ status: 'denied', resolved_at: new Date().toISOString() })
    .eq('link_id', device.link_id)
    .eq('ua_hash', device.ua_hash)
    .eq('status', 'approved');
```

This doesn't prevent the token in `link_devices` table from still being used.

**Status**: Resolved. Revoked devices are deleted before denying requests.

### 7. **CSV File Size Validation Added (Resolved)**

**Severity**: Medium  
**Location**: `src/routes/admin/csv/+page.server.ts`

**Problem**: No file size limits enforced:

```typescript
const text = await file.text();
const parsed = parseCsv(text);
```

**Status**: Implemented. 10MB limit enforced.

### 8. **Input Length Limits on Update Messages (Resolved)**

**Severity**: Low  
**Location**: `src/routes/admin/csv/+page.server.ts`

**Status**: Implemented. 500-character limit enforced server-side and client-side.

### 9. **Column Name Validation Missing (Open)**

**Severity**: Medium  
**Location**: `src/routes/admin/links/+page.server.ts` - `sanitizeCriteria()`

**Problem**: While criteria are filtered to valid columns, there's no validation that column names themselves are safe. A malicious CSV with XSS-like column names (`<script>alert('xss')</script>`) could be included:

```typescript
return parsed.filter((rule) => columns.includes(rule.column));
```

Columns are used directly in display without sanitization.

**Impact**: Potential XSS if column names aren't escaped in frontend  
**Fix**: Ensure Svelte auto-escapes (it does by default), but validate column names server-side to alphanumeric + underscore

---

## 🟠 Medium-Priority Issues

### 10. **Timing Attack Vulnerability in Signature Verification**

**Severity**: Low (Already Mitigated)  
**Location**: `src/lib/server/crypto.ts`

**Good News**: Code correctly uses `crypto.timingSafeEqual()` for cookie signature verification:

```typescript
return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? raw : null;
```

This is correct and prevents timing attacks.

### 11. **Single Admin Limitation**

**Severity**: Medium  
**Location**: Architecture (auth system)

**Problem**: Only one admin account supported via hardcoded `ADMIN_EMAIL` and `ADMIN_PASSWORD`:

```typescript
const adminEmail = requireEnv('ADMIN_EMAIL');
const adminPassword = requireEnv('ADMIN_PASSWORD');
```

**Impact**: No admin segregation, no delegation; single point of failure  
**Fix**: Migrate to role-based admin system with multiple user support (requires schema changes)

### 12. **Recovery Request Can Be Spammed (Partially Mitigated)**

**Severity**: Medium  
**Location**: `src/routes/v/[linkId]/+page.server.ts` - `request` action

**Problem**: Rate limiting exists, but is in-memory and per-instance.
**Impact**: Attackers can bypass by spreading requests across instances.
**Fix**: Use a shared rate limit store and enforce per-link limits.

### 13. **Data Returned Includes Unfiltered Row Count**

**Severity**: Low  
**Location**: `src/routes/v/[linkId]/+page.server.ts` - `load()`

**Problem**: Returns actual filtered row count via `total`:

```typescript
rows: displayRows,
total: filtered.length,
truncated: filtered.length > preview.length,
```

**Impact**: Users can infer data distribution and filtering rules  
**Fix**: Only return truncation status for privacy; consider not exposing exact counts

### 14. **Session Duration Hardcoded**

**Severity**: Low  
**Location**: `src/lib/server/auth.ts`

**Problem**: Admin session timeout is hardcoded to 8 hours:

```typescript
const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();
```

Device session is 30 days:

```typescript
maxAge: 60 * 60 * 24 * 30
```

**Impact**: Not configurable; no option to extend or shorten sessions  
**Fix**: Move to environment variables with reasonable defaults

### 15. **Error Messages May Leak Information (Resolved)**

**Severity**: Low  
**Location**: Multiple routes

**Problem**: Previously, error messages returned Supabase error details directly.

```typescript
catch (error) {
    return fail(400, { error: (error as Error).message });
}
```

**Status**: Resolved. Server actions now return generic errors instead of raw messages.

---

## 🟢 Lower-Priority / Design Notes

### 16. **TypeScript Ops Validation**

**Severity**: Low (Type Safety)  
**Location**: `src/lib/server/csv.ts`

**Current**: `CsvCriteriaOp` is a union type but could be validated better:

```typescript
export type CsvCriteriaOp = 'eq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
```

**Suggestion**: Use `as const` and validate during criteria sanitization to prevent invalid ops

### 17. **MAX_ROWS is Hardcoded**

**Severity**: Very Low  
**Location**: `src/routes/v/[linkId]/+page.server.ts`

**Suggestion**: Move `MAX_ROWS = 500` to environment variable for operational flexibility

### 18. **No HTTPS Enforcement for Non-Dev**

**Severity**: Low (Partially Addressed)  
**Location**: Cookie settings use `secure: !dev` which is correct, but consider adding HSTS header via adapter/reverse proxy

### 19. **Encryption Key Derivation**

**Severity**: Low (Crypto Review)  
**Location**: `src/lib/server/crypto.ts`

**Good News**:

- Uses HKDF-SHA256 for key derivation ✅
- Random 16-byte salt per file ✅
- AES-256-GCM with 12-byte nonces ✅
- Proper authentication tags ✅

### 20. **No CSRF Token Validation Visible**

**Severity**: Low (Likely Mitigated)  
**Location**: Forms use SvelteKit's FormAction

**Note**: SvelteKit has built-in CSRF protection via cross-site request forgery tokens in form requests, but ensure:

- **Cookies**: Using `SameSite=strict` ✅ (correctly set)
- Forms submitted with SvelteKit's `<form>` component (need to verify frontend)

---

## 📋 Recommendations Priority List

| Priority | Fix                                  | Effort  | Impact   |
| -------- | ------------------------------------ | ------- | -------- |
| 🔴 P0    | Remove console logging               | 1 hour  | Critical |
| 🔴 P0    | Implement rate limiting              | 4 hours | Critical |
| 🔴 P0    | Add audit logging                    | 8 hours | Critical |
| 🟡 P1    | Improve device identification        | 6 hours | High     |
| 🟡 P1    | Fix device revocation logic          | 1 hour  | High     |
| 🟡 P1    | Enforce password policy              | 2 hours | High     |
| 🟡 P1    | Add CSV file size limits             | 30 min  | High     |
| 🟠 P2    | Return generic error messages (done) | 2 hours | Medium   |
| 🟠 P2    | Rate limit recovery requests         | 2 hours | Medium   |
| 🟠 P2    | Add input length validation          | 1 hour  | Medium   |

---

## Testing Recommendations

1. **Security Testing**:
   - Load test rate limiting endpoints
   - Attempt to bypass device binding (user-agent spoofing)
   - Submit massive CSV files
   - Flood recovery request endpoint
   - Test SQL injection in filter criteria

2. **Audit Logging**:
   - Verify all sensitive operations are logged
   - Test log integrity
   - Ensure logs don't contain sensitive data

3. **Cryptography**:
   - Verify key derivation with different salts
   - Test decryption of old files
   - Validate authentication tag protection

---

## Deployment Checklist

- [x] Remove all `console.log()` statements
- [ ] Enable HTTPS enforcement (`secure: true` in production)
- [ ] Document single-instance rate limiting assumption
- [x] Set up audit logging (partial coverage)
- [ ] Add environment variable validation for encryption keys
- [x] Backup Supabase before schema migrations
- [x] Test file size limits in staging
- [x] Review error messages for information leakage

---

## Conclusion

The application has **solid cryptographic foundations** and now includes core operational protections. The remaining highest-risk items are:

1. In-memory rate limiting (not shared across instances)
2. Device binding still spoofable and IP-sensitive
3. Partial audit logging coverage
4. Partial audit logging coverage

Addressing these items will bring the system to a low-risk posture.
