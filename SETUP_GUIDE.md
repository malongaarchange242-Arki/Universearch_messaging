# Messaging Service Setup Guide

## Issue
The messaging service returns 500 errors because:
1. **Database tables don't exist** - Migrations haven't been run on Supabase
2. **JWT token missing fields** - Frontend JWT might not include required fields

## Step 1: Run Database Migrations

### Option A: Direct SQL in Supabase Dashboard
1. Go to [Supabase Console](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Create a new query
5. Copy contents of `services/messaging-service/migrations/001_create_messaging_tables.sql`
6. Run the query

### Option B: Use Supabase CLI
```bash
cd services/messaging-service
supabase db push
```

### Option C: Manual psql Connection
```bash
psql postgresql://postgres:PASSWORD@HOST:5432/postgres -f migrations/001_create_messaging_tables.sql
```

## Step 2: Verify JWT Token Contains Required Fields

The frontend JWT must include:
- `is_admin` (boolean) - whether user is an admin
- `institution_id` (UUID/string) - the institution ID

### Frontend (messagerie.js)
When sending requests, the JWT token should have this structure (in the payload):
```json
{
  "user_id": "...",
  "is_admin": true/false,
  "institution_id": "...",
  "user_type": "admin|institution|user"
}
```

### Check Current Token
Open browser DevTools → Application → Local Storage → Look for `softura_session.jwt_token`
Decode it at [jwt.io](https://jwt.io) to verify the payload

## Step 3: Update Backend Auth Middleware (if needed)

If the JWT doesn't include required fields, the auth middleware needs to handle gracefully:

```typescript
export const getUser = (request: FastifyRequest): JWTPayload => {
  const user = (request as any).user;
  
  // Provide defaults if fields are missing
  return {
    user_id: user?.user_id || user?.sub || 'unknown',
    is_admin: user?.is_admin || false,
    institution_id: user?.institution_id || 'unknown',
    user_type: user?.user_type || 'user'
  };
};
```

## Step 4: Test the Service

### Health Check
```bash
curl http://localhost:3006/health
```

### Get Conversations (requires auth)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3006/conversations?limit=50&offset=0
```

## Debugging

### Check Logs
The service now logs detailed errors:
```
Conversations error: relation "conversations" does not exist
```

### Common Errors

**"relation 'conversations' does not exist"**
→ Run the migrations (Step 1)

**"user not found in request"**
→ Auth middleware failed, check JWT token

**"Failed to fetch conversations: undefined is not a function"**
→ Likely missing JWT payload fields, check token structure

## Environment Variables

Ensure `.env` is set:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3006
```

## File Locations

- **Migrations**: `services/messaging-service/migrations/001_create_messaging_tables.sql`
- **Routes**: `services/messaging-service/src/routes.ts`
- **Auth**: `services/messaging-service/src/middleware/auth.ts`
- **Queries**: `services/messaging-service/src/modules/messages/queries.ts`

---
**Status**: Requires setup   
**Priority**: High - Messaging service won't work without this
