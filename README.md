# OK-Fines: Project Contribution Tracking System

A comprehensive web and mobile application for managing project contributions and tracking fines. Built with Angular, Ionic, and Firebase.

## 🎯 Project Overview

OK-Fines is an integrated platform designed to help organizations track student contributions to projects and manage associated fines or penalties. The system supports multiple user roles including Admin, Student, and Homeroom coordinators.

**Current Branch:** `backend-madeja`

## ✨ Features

### Core Functionality
- 🔐 **User Authentication** - Secure login and registration with Firebase Authentication
- 👥 **User Management** - Admin-only student user registration and management
- 📊 **Dashboard** - Role-based dashboards for different user types
- 📤 **Bulk User Upload** - CSV-based student registration
- 🎭 **Society Tracking** - Track students by society affiliation
- 🆔 **Student ID Management** - Track students with MMC format IDs

### User Roles
- **Admin** - Full system access, user management
- **Student** - view contributions
- **Homeroom** - Manage student records and contributions (legacy)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Ionic CLI: `npm install -g @ionic/cli`
- Angular CLI: `npm install -g @angular/cli`

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tokikaze0/ok-fines.git
   cd ok-fines
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Firebase Configuration**
   - Create `src/environments/environment.ts` with your Firebase configuration:
   ```typescript
   export const environment = {
     production: false,
     firebaseConfig: {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
     }
   };
   ```
   - Create `src/environments/environment.prod.ts` with production Firebase config

4. **Start the development server**
   ```bash
   npm start
   # or
   ng serve
   ```

5. **Open in browser**
   Navigate to `http://localhost:4200/`

## 📁 Project Structure

```
src/
├── app/
│   ├── services/
│   │   └── user-management.service.ts       # User CRUD operations
│   ├── dashboard/
│   │   ├── dashboard.page.ts
│   │   ├── dashboard.page.html
│   │   └── dashboard.page.scss
│   ├── student-user-management/
│   │   ├── student-user-management.page.ts
│   │   ├── student-user-management.page.html
│   │   ├── student-user-management.module.ts
│   │   └── student-user-management.page.scss
│   ├── home/
│   ├── login/
│   ├── register/
│   ├── survey/
│   ├── interceptors/
│   │   └── auth.interceptor.ts              # HTTP interceptor for auth
│   ├── app-routing.module.ts
│   └── app.module.ts
├── environments/                             # Firebase configs (not tracked in git)
├── assets/
├── theme/
└── index.html
```

## 🛠️ Available Commands

```bash
# Development server
npm start              # Runs the dev server on http://localhost:4200

# Build
npm run build         # Production build
npm run watch        # Watch mode development build

# Testing
npm test             # Run unit tests with Karma
npm run lint         # Run ESLint

# Ionic specific
ionic serve          # Ionic development server
ionic build          # Ionic production build
ionic capacitor build ios    # Build for iOS
ionic capacitor build android # Build for Android
```

## 📊 User Management Features

### Adding Students Manually
1. Navigate to Dashboard → Student User Management
2. Fill in the form with:
   - Email
   - Password
   - Student ID (format: MMC20**-*****)
   - Society
3. Click "Add Student"

### Bulk CSV Upload
1. Click "Bulk Upload CSV" button
2. Select a CSV file with the following format:

```csv
email,password,studentId,society
student1@example.com,password123,MMC2023-00001,CCIS
student2@example.com,password456,MMC2023-00002,CBA
student3@example.com,password789,MMC2024-00001,ENGINEERING
```

## 🔐 Security Features

- Firebase Authentication with email/password
- Role-based access control
- Admin-only user registration
- Protected routes with route guards
- HTTP interceptor for token management
- Sensitive configs excluded from version control

## 🗄️ Database Structure (Firestore)

### Users Collection
```typescript
{
  uid: string,
  email: string,
  role: 'admin' | 'student' | 'homeroom',
  createdAt: ISO8601 timestamp,
  createdBy: admin uid,
  studentId?: string,    // MMC20**-*****
  society?: string
}
```

## 📱 Technology Stack

### Frontend
- **Angular 20** - Modern web framework
- **Ionic 8** - Cross-platform mobile UI
- **TypeScript 5.8** - Type-safe JavaScript
- **RxJS 7.8** - Reactive programming

### Backend & Services
- **Firebase** - Authentication, Firestore database
- **Capacitor 7.4** - Native mobile bridges

### Build & Dev Tools
- **Angular CLI 20** - Project scaffolding
- **ESLint 9** - Code linting
- **Karma/Jasmine** - Testing framework
- **Webpack** - Module bundling

## 📝 Environment Variables

**Note:** The `/src/environments/` folder is excluded from version control for security.

Create the following files locally:

### environment.ts (Development)
```typescript
export const environment = {
  production: false,
  firebaseConfig: { /* your config */ }
};
```

### environment.prod.ts (Production)
```typescript
export const environment = {
  production: true,
  firebaseConfig: { /* your config */ }
};
```

## 🔄 Git Workflow

**Current Branch:** `backend-madeja`

```bash
# Pull latest changes
git pull origin backend-madeja

# Create feature branch
git checkout -b feature/your-feature

# Push changes
git push origin backend-madeja
```

**Note:** The `/src/environments/` folder is ignored in `.gitignore` to prevent accidental commits of sensitive data.

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
ng test --code-coverage

# Run linting
ng lint
```

## 📦 Build & Deployment

### Development Build
```bash
npm run watch
```

### Production Build
```bash
npm run build
```

### For Mobile Platforms
```bash
# iOS
ionic capacitor build ios

# Android
ionic capacitor build android
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# If port 4200 is busy, specify a different port
ng serve --port 4201
```

### Firebase Connection Issues
- Verify Firebase credentials in `environment.ts`
- Check Firestore security rules
- Ensure Firebase project is active

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install
```

## 📚 Key Components

### UserManagementService
Handles all CRUD operations for student users:
- `createStudentUser()` - Create new student
- `getAllStudentUsers()` - Fetch all students
- `updateStudentUser()` - Update student info
- `deleteStudentUser()` - Delete student
- `createBulkStudents()` - Batch create from CSV

### StudentUserManagementPage
Admin interface for managing students:
- Add/Edit/Delete students
- Bulk CSV upload
- View student list

### AuthInterceptor
Automatically adds authentication tokens to HTTP requests

## 🤝 Contributing

1. Create a feature branch from `backend-madeja`
2. Make your changes
3. Commit with clear messages
4. Push to the remote branch
5. Create a Pull Request

## 📄 License

This project is part of an academic assignment.

## 👥 Team

**Project:** 4th Year Integration Programming 2  
**Institution:** Malawi University  
**Repository Owner:** Tokikaze0

## 📞 Support

For issues or questions, contact the development team or create an issue in the GitHub repository.

---

**Last Updated:** November 11, 2025  
**Branch:** `backend-madeja`  
**Status:** Active Development
