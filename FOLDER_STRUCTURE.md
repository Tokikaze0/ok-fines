# Project Folder Structure Guide

## Overview
This document describes the new organized folder structure for the OK-Fines project, designed for scalability and maintainability.

## Directory Tree

```
src/app/
├── core/                              # Core application module
│   ├── auth/                          # Authentication logic
│   ├── models/                        # TypeScript interfaces and models
│   │   └── user.model.ts
│   ├── services/                      # Application-wide services
│   │   ├── auth.service.ts
│   │   ├── user-management.service.ts
│   │   ├── storage.service.ts
│   │   └── api.service.ts
│   ├── interceptors/                  # HTTP interceptors
│   │   └── auth.interceptor.ts
│   └── guards/                        # Route guards
│       ├── auth.guard.ts
│       └── admin.guard.ts
│
├── shared/                            # Shared across features
│   ├── components/                    # Reusable UI components
│   ├── pipes/                         # Custom pipes
│   ├── directives/                    # Custom directives
│   └── models/                        # Shared DTOs/models
│
├── pages/                             # Feature/Route pages
│   ├── home/                          # Home/Login page
│   │   ├── home.page.ts
│   │   ├── home.page.html
│   │   ├── home.page.scss
│   │   ├── home.module.ts
│   │   └── home-routing.module.ts
│   │
│   ├── login/                         # Login page
│   │   └── (similar structure)
│   │
│   ├── register/                      # Registration page
│   │   └── (similar structure)
│   │
│   ├── survey/                        # Survey page
│   │   └── (similar structure)
│   │
│   ├── dashboard/                     # Main dashboard (admin)
│   │   ├── dashboard.page.ts
│   │   ├── dashboard.page.html
│   │   ├── dashboard.page.scss
│   │   ├── dashboard.module.ts
│   │   └── dashboard-routing.module.ts
│   │
│   ├── student-dashboard/             # Student dashboard
│   │   └── (similar structure)
│   │
│   └── admin/                         # Admin features
│       ├── admin-routing.module.ts
│       └── student-user-management/   # Manage students
│           ├── student-user-management.page.ts
│           ├── student-user-management.page.html
│           ├── student-user-management.page.scss
│           └── student-user-management.module.ts
│
├── app.component.ts
├── app.component.html
├── app.component.scss
├── app.module.ts
└── app-routing.module.ts
```

## Folder Purposes

### `core/`
**Purpose:** Singleton services and cross-cutting concerns
- **Not lazy-loaded** - imported once in AppModule
- Contains services that should exist only once
- Application-wide interceptors and guards

**Contents:**
- `services/` - Auth, UserManagement, Storage, API calls
- `interceptors/` - HTTP interceptors for auth tokens
- `guards/` - Route protection and authorization
- `models/` - Global TypeScript interfaces

### `shared/`
**Purpose:** Reusable components across multiple features
- Shared UI components
- Common pipes and directives
- Shared models/DTOs

**Usage:** Import in feature modules as needed

### `pages/`
**Purpose:** Feature modules and lazy-loaded routes
- One subdirectory per routed page/feature
- Each has own module for lazy loading
- Self-contained with routing

**Key pages:**
- `home/` - Initial landing page
- `login/` - Authentication
- `register/` - User registration
- `dashboard/` - Main admin interface
- `survey/` - Survey management
- `admin/` - Administrative features

## File Organization Within a Page

Each page/feature should follow this structure:

```
feature-name/
├── feature-name.page.ts          # Component logic
├── feature-name.page.html        # Template
├── feature-name.page.scss        # Styles
├── feature-name.module.ts        # Feature module (imports Common, etc.)
└── feature-name-routing.module.ts # Feature routing (if needed)
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Services | `{name}.service.ts` | `auth.service.ts` |
| Components | `{name}.component.ts` | `user-card.component.ts` |
| Pages | `{name}.page.ts` | `dashboard.page.ts` |
| Guards | `{name}.guard.ts` | `auth.guard.ts` |
| Interceptors | `{name}.interceptor.ts` | `auth.interceptor.ts` |
| Models | `{name}.model.ts` | `user.model.ts` |
| Modules | `{name}.module.ts` | `app.module.ts` |
| Routing | `{name}-routing.module.ts` | `app-routing.module.ts` |

## Import Paths

### From Core Module
```typescript
// Services
import { AuthService } from '@core/services/auth.service';
import { UserManagementService } from '@core/services/user-management.service';

// Guards
import { AuthGuard } from '@core/guards/auth.guard';

// Models
import { User } from '@core/models/user.model';
```

### From Shared Module
```typescript
import { SomeComponent } from '@shared/components/some/some.component';
```

## Module Dependencies

```
AppModule (root)
    ├── core (imported once)
    │   ├── services
    │   ├── interceptors
    │   └── guards
    │
    └── Feature Modules (lazy-loaded)
        ├── SharedModule (if needed)
        └── own components/services
```

## Routing Structure

**AppRoutingModule** defines main routes with lazy loading:

```typescript
const routes: Routes = [
  { path: 'home', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
  { path: 'dashboard', loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule) },
  { path: 'admin', loadChildren: () => import('./pages/admin/admin.module').then(m => m.AdminModule) },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];
```

## Migration Guide

To migrate a page to the new structure:

1. **Create new directory** under `pages/` or appropriate location
2. **Move files** to the new location
3. **Update import paths** in components
4. **Update routing** in app-routing.module.ts
5. **Test** that lazy loading works
6. **Delete old directory**

## Best Practices

1. **Core Services** - Only singleton, app-wide services go here
2. **Lazy Loading** - Each feature page should be lazy-loaded
3. **Shared Components** - Reuse components across features
4. **Type Safety** - Define models in core/models for global types
5. **Imports** - Use relative paths for feature-specific, absolute for shared
6. **Module Imports** - Each feature module imports CommonModule and needed shared modules

## Environment

The `/src/environments/` folder is NOT tracked in git. Create it locally with:

```
environments/
├── environment.ts        # Development config
└── environment.prod.ts   # Production config
```

---

**Maintained:** November 11, 2025
