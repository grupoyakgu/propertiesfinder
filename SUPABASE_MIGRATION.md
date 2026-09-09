# Supabase Migration Guide

This document tracks the migration from Prisma/PostgreSQL to Supabase.

## ✅ Completed

### Environment Configuration
- Updated `.env.example` with Supabase variables
- Created `src/lib/supabase.ts` for Supabase client initialization

### Database Schema
- Created `migrations/001_initial_schema.sql` with all table definitions
- Includes RLS (Row Level Security) setup

### Core Library Files
- `src/lib/auth.ts` - Updated to use Supabase for user queries
- `src/lib/app-settings.ts` - Updated to use Supabase upsert operations
- `src/lib/comments.ts` - Updated to fetch comments with user relations
- `src/lib/prisma.ts` - Now exports Supabase client for backward compatibility

### Authentication Routes
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Complete password reset

### Favorites & Comments Routes
- `GET /api/favorites` - List all opportunities
- `POST /api/favorites` - Toggle like on a property
- `GET /api/comments` - Get comments for a property
- `POST /api/comments` - Add comment (auto-likes property)

## 🔄 Remaining Work

### Favorites Routes
Update `src/app/api/favorites/[id]/route.ts`:
- PATCH: Reassign opportunity to different user
- Template:
  ```typescript
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", assignedUserId)
    .single();

  const { error } = await supabase
    .from("favorites")
    .update({ assigned_user_id: assignedUserId })
    .eq("id", favoriteId);
  ```

Update `src/app/api/favorites/export-xls/route.ts`:
- Use Supabase to fetch all favorites with parcel data
- Same query structure as `GET /api/favorites`

Update `src/app/api/favorites/ids/route.ts`:
- Use Supabase to fetch just favorite IDs
  ```typescript
  const { data } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("source", "catastro");
  ```

### Comments Routes
Update `src/app/api/comments/[id]/route.ts`:
- DELETE: Remove comment
  ```typescript
  await supabase.from("comments").delete().eq("id", commentId);
  ```

### Map Presets Routes
Update `src/app/api/map-presets/route.ts`:
- GET: List user's map presets
  ```typescript
  const { data } = await supabase
    .from("map_presets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  ```
- POST: Create new preset
  ```typescript
  const presetId = randomBytes(12).toString("hex");
  const { data } = await supabase
    .from("map_presets")
    .insert({
      id: presetId,
      user_id: user.id,
      name,
      south, west, north, east,
      filters: JSON.stringify(filters),
      polygon: polygon ? JSON.stringify(polygon) : null,
      is_default: false,
    })
    .select("*")
    .single();
  ```

Update `src/app/api/map-presets/[id]/route.ts`:
- PATCH: Update preset
- DELETE: Remove preset

### Cadastral Parcels Routes
Update `src/app/api/catastro-parcels/route.ts`:
- Query Supabase instead of Catastro (for imported parcels)
- Keep existing Catastro OVC queries
- Combine results appropriately

Update `src/app/api/catastro-parcels/[referencia]/route.ts`:
- Query Supabase for parcel details
- Keep Catastro API fallback

### User Management Routes
Update `src/app/api/users/route.ts`:
- GET: Fetch current user (use getCurrentUser())

Update `src/app/api/user-settings/route.ts`:
- PATCH: Update user preferences
  ```typescript
  await supabase
    .from("users")
    .update({ map_locked, show_all_on_map })
    .eq("id", user.id);
  ```

Update `src/app/api/admin/users/route.ts`:
- GET: List all users
- POST: Create user (admin only)

Update `src/app/api/admin/users/[id]/route.ts`:
- PATCH: Update user (admin only)
- DELETE: Delete user (admin only)

### Analysis Engine Routes
Update `src/app/api/analysis-engine/route.ts`:
- POST: Save analysis results to `analysis_results` table
  ```typescript
  const resultId = randomBytes(12).toString("hex");
  await supabase.from("analysis_results").upsert({
    id: resultId,
    user_id: user.id,
    parcel_ids: parcelIds,
    parcel_key: parcelKey,
    mode: mode,
    report: report,
    data: data,
  });
  ```

Update `src/app/api/analysis-engine/export-pdf/route.ts`:
- Fetch analysis results from Supabase
  ```typescript
  const { data } = await supabase
    .from("analysis_results")
    .select("*")
    .eq("id", resultId)
    .single();
  ```

### Page Components
Update `src/app/dashboard/page.tsx`:
- Replace Prisma queries with Supabase
- Fetch favorites, map presets, user settings

Update `src/app/catastro/[referencia]/page.tsx`:
- Fetch parcel from Supabase
- Fetch related comments and favorites

### Type Conversions
Update `src/lib/types.ts` if needed to handle Supabase column name conversions:
- snake_case (Supabase) → camelCase (client)
- Use helper functions for consistent transformation

## General Migration Patterns

### Find by ID
```typescript
// Before: Prisma
const user = await prisma.user.findUnique({ where: { id: userId } });

// After: Supabase
const { data: user } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .single();
```

### Find Many with Filter
```typescript
// Before: Prisma
const items = await prisma.item.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: "desc" }
});

// After: Supabase
const { data: items } = await supabase
  .from("items")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
```

### Create
```typescript
// Before: Prisma
const item = await prisma.item.create({
  data: { userId, name, value }
});

// After: Supabase
const { data: item } = await supabase
  .from("items")
  .insert({ id: generateId(), user_id: userId, name, value })
  .select("*")
  .single();
```

### Update
```typescript
// Before: Prisma
await prisma.item.update({
  where: { id: itemId },
  data: { name: newName }
});

// After: Supabase
await supabase
  .from("items")
  .update({ name: newName })
  .eq("id", itemId);
```

### Delete
```typescript
// Before: Prisma
await prisma.item.delete({ where: { id: itemId } });

// After: Supabase
await supabase.from("items").delete().eq("id", itemId);
```

### Upsert
```typescript
// Before: Prisma
await prisma.item.upsert({
  where: { id: itemId },
  update: { name: newName },
  create: { id: itemId, name: newName }
});

// After: Supabase
await supabase
  .from("items")
  .upsert({ id: itemId, name: newName })
  .select("*")
  .single();
```

## Important Notes

1. **IDs**: Use `randomBytes(12).toString("hex")` for generating random IDs instead of Prisma's auto-generated ones
2. **Date Handling**: Supabase returns ISO strings; convert to Date if needed
3. **Joins**: Use the `select()` parameter with dot notation: `select("*, users:user_id(id, name)")`
4. **Field Names**: Remember to convert between snake_case (DB) and camelCase (JS)
5. **Error Handling**: Always check error responses from Supabase

## Testing Checklist

- [ ] Run migrations in Supabase SQL Editor
- [ ] Test user signup/login
- [ ] Test password reset flow
- [ ] Test favorites (like/unlike)
- [ ] Test comments (create/read)
- [ ] Test map presets
- [ ] Test analysis engine
- [ ] Test admin routes
- [ ] Test file exports

## Deployment

1. Set environment variables in Vercel:
   - `NEXT_SUPABASE_URL`
   - `NEXT_SUPABASE_ANON_KEY`
   - `NEXT_APP_URL`
   - `SESSION_SECRET`
   - `ANTHROPIC_API_KEY`

2. Run migrations in Supabase project
3. Deploy to Vercel
