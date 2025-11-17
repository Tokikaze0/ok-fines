# Folder Structure Reorganization Guide

## Summary of Changes

The project folder structure has been reorganized to follow Angular best practices and improve maintainability. Here's what changed and how to migrate existing code.

## New Structure Overview

```
src/app/
├── core/                  # Singleton services, guards, interceptors
│   ├── models/
│   ├── services/
│   ├── interceptors/
│   └── guards/
├── shared/                # Reusable components
│   └── components/
├── pages/                 # Routed features/pages
│   ├── home/
│   ├── dashboard/
│   ├── survey/
│   └── admin/
│       └── student-user-management/
└── app-routing.module.ts
```

## Files Moved to `core/`

### Services

| Old Path | New Path |
|----------|----------|
| `src/app/services/auth.service.ts` | `src/app/core/services/auth.service.ts` |
| `src/app/services/user-management.service.ts` | `src/app/core/services/user-management.service.ts` |
| `src/app/services/storage.service.ts` | `src/app/core/services/storage.service.ts` |

### Interceptors

| Old Path | New Path |
|----------|----------|
| `src/app/interceptors/auth.interceptor.ts` | `src/app/core/interceptors/auth.interceptor.ts` |

### Models

| New Path |
|----------|
| `src/app/core/models/user.model.ts` |

## Import Path Updates Required

### Example 1: Importing Services

**Before:**
```typescript
import { AuthService } from '../services/auth.service';
import { UserManagementService } from '../services/user-management.service';
```

**After:**
```typescript
import { AuthService } from '@core/services/auth.service';
import { UserManagementService } from '@core/services/user-management.service';
```

### Example 2: Importing Interceptors

**Before:**
```typescript
import { AuthInterceptor } from './interceptors/auth.interceptor';
```

**After:**
```typescript
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
```

### Example 3: Importing Models

**Before:**
```typescript
import { User } from '../services/user-management.service';
```

**After:**
```typescript
import { User } from '@core/models/user.model';
```

## Path Aliases in tsconfig.json

To use simplified import paths like `@core/`, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"],
      "@pages/*": ["src/app/pages/*"],
      "@environments/*": ["src/environments/*"]
    }
  }
}
```

## Files Needing Updates

### 1. `app.module.ts`
Update interceptor import:
```typescript
// Before
import { AuthInterceptor } from './interceptors/auth.interceptor';

// After
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
```

### 2. `dashboard.page.ts`
Update service imports:
```typescript
// Before
import { UserManagementService } from '../services/user-management.service';

// After
import { UserManagementService } from '@core/services/user-management.service';
```

### 3. `student-user-management.page.ts`
Update service and model imports:
```typescript
// Before
import { UserManagementService, User } from '../services/user-management.service';

// After
import { UserManagementService } from '@core/services/user-management.service';
import { User } from '@core/models/user.model';
```

### 4. Any component using AuthService
```typescript
// Before
import { AuthService } from '../services/auth.service';

// After
import { AuthService } from '@core/services/auth.service';
```

## Models Extraction

The `User` interface has been moved to a dedicated model file:

**`src/app/core/models/user.model.ts`:**
```typescript
export interface User { ... }
export interface BulkStudentImport { ... }
export interface BulkOperationResult { ... }
```

Always import from:
```typescript
import { User, BulkStudentImport, BulkOperationResult } from '@core/models/user.model';
```

## Migration Checklist

- [ ] Update `tsconfig.json` with path aliases
- [ ] Update imports in `app.module.ts`
- [ ] Update imports in `app-routing.module.ts` (if needed)
- [ ] Update imports in `dashboard.page.ts`
- [ ] Update imports in `student-user-management.page.ts`
- [ ] Update imports in `home.page.ts` or login pages
- [ ] Update imports in `register.page.ts`
- [ ] Update imports in any other components using services
- [ ] Run `ng serve` to check for compilation errors
- [ ] Run tests to ensure everything works
- [ ] Commit changes with message: `refactor: reorganize folder structure`

## Benefits of New Structure

✅ **Better Organization** - Core services separated from features  
✅ **Easier Scaling** - New features go in `pages/`, reusable code in `shared/`  
✅ **Improved Maintainability** - Clear separation of concerns  
✅ **Lazy Loading** - Each page can be lazy-loaded independently  
✅ **Type Safety** - Dedicated models file for better organization  
✅ **Consistency** - Follows Angular style guide recommendations  

## Next Steps

1. Complete all import path updates
2. Test the application thoroughly
3. Delete the old `src/app/services/`, `src/app/interceptors/`, and `src/app/guards/` directories
4. Commit and push changes

---

**Created:** November 11, 2025  
**Branch:** backend-madeja
