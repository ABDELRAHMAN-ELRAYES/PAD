# Frontend Implementation Rules for AI Agents

## Overview

This document provides comprehensive rules and guidelines for AI agents building and completing the frontend of the Lynkr platform. Following these rules ensures consistency, maintainability, and alignment with the existing codebase architecture.

---
Act as a senior expert react software engineer with 20 years of experience to implement the ui of the module @documents/modules/module_2 and connect it to the api endpoints and make the user flow works normally with strict following the rules at @frontend_implementation_rules.md you have to scan all required endpoints to know carefully precisely the required data which must be sent to the server and the recieved data and attributes recieved from the endpoint call 
 

 
## Core Principles


## 2. Project Architecture

### 2.1 Directory Structure (CRITICAL)

Follow the established feature-based architecture:

```
web/src/
├── app/                    # App configuration
│   ├── App.tsx            # Root component
│   ├── Router.tsx         # Route definitions
│   └── providers/         # Context providers
├── features/              # Feature modules (PRIMARY WORK AREA)
│   ├── [module-name]/
│   │   ├── components/    # Module-specific components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Module-specific hooks
│   │   └── types/         # Module-specific types
├── shared/                # Shared resources
│   ├── components/
│   │   ├── ui/            # Base UI components (Radix wrappers)
│   │   ├── common/        # Common reusable components
│   │   └── layout/        # Layout components
│   ├── constants/         # Application constants
│   ├── hooks/             # Shared custom hooks
│   ├── lib/               # Third-party library configs
│   ├── services/          # API service layer
│   ├── types/             # Shared type definitions
│   └── utils/             # Utility functions
├── assets/                # Static assets
├── styles/                # Global styles
└── main.tsx              # Entry point
```

### 2.2 Module Organization Rules

**ALWAYS** organize new frontend work by module correspondence:

| Backend Module | Frontend Feature Directory |
|---------------|---------------------------|
| Module 1: IAM | `features/auth/` |
| Module 2: Provider Onboarding | `features/profile/` |
| Module 3: Search & Discovery | `features/services/` |
| Module 4: Requests & Proposals | `features/request/` (NEW) |
| Module 5: Payments & Escrow | `features/payment/` |
| Module 6: Messaging & Meetings | `features/project/` |
| Module 7: Teaching & Scheduling | `features/teaching/` (NEW) |
| Module 8: Ratings & Reviews | `features/reviews/` (NEW) |
| Module 9: Notifications | `features/notifications/` (NEW) |
| Module 10: Reporting & Moderation | `features/reports/` (NEW) |
| Module 11: Subscription | `features/subscription/` (NEW) |
| Admin Features | `features/admin/` |

> [!IMPORTANT]
> Each feature module MUST be self-contained with its own `components/`, `pages/`, and optionally `hooks/` and `types/` directories.

---

## 3. Component Development Rules

### 3.1 Component Structure

Every component file must follow this pattern:

```tsx
// Component imports first (React, third-party, then local)
import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { useAuthStore } from '@/shared/hooks/useAuth';

// Types/Interfaces immediately after imports
interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onAction?: (data: ActionData) => void;
}

// Component definition using arrow function with FC type
export const ComponentName: FC<ComponentNameProps> = ({ prop1, prop2 = 0, onAction }) => {
  // Hooks first
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // State declarations
  const [loading, setLoading] = useState(false);
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // Early returns for loading/error states
  if (loading) return <LoadingSpinner />;
  
  // Main render
  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
};
```

### 3.2 Component Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | `[Name]Page.tsx` | `LoginPage.tsx`, `RequestsPage.tsx` |
| Components | `[Name].tsx` | `RequestCard.tsx`, `ProposalForm.tsx` |
| Layouts | `[Name]Layout.tsx` | `DashboardLayout.tsx` |
| Forms | `[Name]Form.tsx` | `CreateRequestForm.tsx` |
| Modals/Dialogs | `[Name]Modal.tsx` or `[Name]Dialog.tsx` | `ConfirmDeleteModal.tsx` |
| Cards | `[Name]Card.tsx` | `ProviderCard.tsx` |
| Lists | `[Name]List.tsx` | `ProposalList.tsx` |

### 3.3 Component Placement Rules

```
✅ CORRECT: Module-specific component in feature directory
features/request/components/RequestCard.tsx

✅ CORRECT: Reusable UI component in shared
shared/components/ui/button.tsx

❌ WRONG: Module-specific component in shared
shared/components/RequestCard.tsx

❌ WRONG: Generic component in feature directory
features/auth/components/Button.tsx
```

### 3.4 Status Tags & Badges Usage (MANDATORY)

- **ALWAYS use centralized tag components** from `@/shared/components/common/tags`.
- **NEVER create inline badges** or new tag components inside feature directories.
- **IF a required tag is missing**, you MUST create it in `shared/components/common/tags` first, then import and use it.

```tsx
// ✅ CORRECT
import { ProjectStatusTag } from '@/shared/components/common/tags';
<ProjectStatusTag status={project.status} />

// ❌ WRONG
<span className="bg-green-100 text-green-800 px-2 py-1 rounded">
  {project.status}
</span>
```

---

## 4. TypeScript Rules (CRITICAL)

### 4.1 Strict Typing Requirements

- **NEVER use `any` type** - Use `unknown` with type guards if type is truly unknown
- **ALWAYS define interfaces** for component props, API responses, and form data
- **ALWAYS use explicit return types** for functions when not immediately obvious
- **Use type-only imports** when importing only types: `import type { User } from '@/types'`

### 4.2 Type Naming Conventions

```typescript
// Entity types - Pascal case
interface User { ... }
interface ProviderProfile { ... }
interface Request { ... }

// Props interfaces - suffix with Props
interface RequestCardProps { ... }
interface UserFormProps { ... }

// API response types - suffix with Response
interface LoginResponse { ... }
interface RequestListResponse { ... }

// API request types - suffix with Payload or Input
interface CreateRequestPayload { ... }
interface UpdateProfileInput { ... }

// Enum-like types (string unions)
type RequestStatus = 'PENDING' | 'PUBLIC' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
type UserRole = 'CLIENT' | 'PROVIDER_PENDING' | 'PROVIDER_APPROVED' | 'ADMIN';
```

### 4.3 Type Location Rules

| Type Category | Location |
|--------------|----------|
| Shared entity types (User, Request, etc.) | `shared/types/` |
| API response/request types | `shared/types/` or `features/[module]/types/` |
| Module-specific types | `features/[module]/types/` |
| Component props | `features/[module]/types/` or `shared/types/` |

> [!IMPORTANT]
> **Strict Rule:** Types MUST be defined ONLY in dedicated `types/` directories. NEVER define types inside component files, service files, or utility files.
> - Do NOT export types from service files.
> - Do NOT define interfaces/types inside `.tsx` or `.ts` files that contain logic.

### 4.4 Backend Alignment

Types MUST align with backend module types. Reference backend type definitions in:
- `server/src/modules/[module]/types/I[Entity].ts`

```typescript
// ✅ CORRECT - Aligned with backend
interface Request {
  id: string;
  title: string;
  description: string;
  status: string; // Backend uses string, not enum
  serviceId: string;
  clientId: string;
  providerId?: string;
  priceMax?: number;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

// ❌ WRONG - Using enums (backend uses strings)
interface Request {
  status: RequestStatus; // Enum not used in backend
}
```

---

## 5. API Integration Rules

### 5.1 Service Layer Structure

All API calls MUST go through the service layer in `shared/services/`:

```typescript
// shared/services/request.service.ts
import api from '@/shared/lib/axios';
import type { Request, CreateRequestPayload, RequestListResponse } from '@/shared/types';

export const requestService = {
  // GET requests
  getRequests: async (filters?: RequestFilters): Promise<RequestListResponse> => {
    const response = await api.get('/requests', { params: filters });
    return response.data;
  },
  
  // GET by ID
  getRequestById: async (id: string): Promise<Request> => {
    const response = await api.get(`/requests/${id}`);
    return response.data.data;
  },
  
  // POST (create)
  createRequest: async (data: CreateRequestPayload): Promise<Request> => {
    const response = await api.post('/requests', data);
    return response.data.data;
  },
  
  // PUT/PATCH (update)
  updateRequest: async (id: string, data: Partial<CreateRequestPayload>): Promise<Request> => {
    const response = await api.put(`/requests/${id}`, data);
    return response.data.data;
  },
  
  // DELETE
  deleteRequest: async (id: string): Promise<void> => {
    await api.delete(`/requests/${id}`);
  },
  
  // Actions
  cancelRequest: async (id: string): Promise<Request> => {
    const response = await api.post(`/requests/${id}/cancel`);
    return response.data.data;
  },
};
```

### 5.2 API Endpoint Alignment

Reference the backend API endpoints from module `details.md` files:

| Module | Base Path | Reference |
|--------|-----------|-----------|
| Auth | `/api/auth/` | `documents/modules/module_1/details.md` |
| Users | `/api/users/` | `documents/modules/module_1/details.md` |
| Providers | `/api/providers/` | `documents/modules/module_2/details.md` |
| Requests | `/api/requests/` | `documents/modules/module_4/details.md` |
| Proposals | `/api/proposals/` | `documents/modules/module_4/details.md` |
| Projects | `/api/projects/` | `documents/modules/module_6/details.md` |
| Conversations | `/api/conversations/` | `documents/modules/module_6/details.md` |
| Messages | `/api/messages/` | `documents/modules/module_6/details.md` |
| Meetings | `/api/meetings/` | `documents/modules/module_6/details.md` |
| Payments | `/api/payments/` | `documents/modules/module_5/details.md` |

### 5.3 Error Handling Pattern

```typescript
// In service layer - let errors bubble up
export const requestService = {
  createRequest: async (data: CreateRequestPayload): Promise<Request> => {
    const response = await api.post('/requests', data);
    return response.data.data;
  },
};

// In component - handle errors at usage point
const handleSubmit = async (data: FormData) => {
  try {
    setLoading(true);
    await requestService.createRequest(data);
    toast.success('Request created successfully');
    navigate('/requests');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      toast.error(error.response?.data?.message || 'Failed to create request');
    } else {
      toast.error('An unexpected error occurred');
    }
  } finally {
    setLoading(false);
  }
};
```

---

## 6. State Management Rules

### 6.1 When to Use Each State Type

| State Type | When to Use | Example |
|------------|-------------|---------|
| `useState` | Local component state | Form inputs, UI toggles |
| Zustand Store | Global/shared state | Auth state, user data, app settings |
| React Query | Server state | API data fetching, caching, mutations |
| URL State | Shareable state | Filters, pagination, active tabs |

### 6.2 Zustand Store Pattern

```typescript
// shared/stores/authStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '@/shared/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  
  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        token: null,
        
        setUser: (user) => set({ user, isAuthenticated: true }),
        setToken: (token) => set({ token }),
        logout: () => set({ user: null, isAuthenticated: false, token: null }),
      }),
      { name: 'auth-storage' }
    )
  )
);
```

### 6.3 Store Naming and Location

- Stores go in `shared/hooks/` or create `shared/stores/` directory
- Name stores as `use[Entity]Store.ts`
- Export hook-style function: `useAuthStore`, `useNotificationStore`

---

## 7. Styling Rules (Tailwind CSS)

### 7.1 Styling Approach

**ALWAYS use Tailwind CSS utility classes**. Never write custom CSS unless absolutely necessary.

```tsx
// ✅ CORRECT - Tailwind utilities
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
</div>

// ❌ WRONG - Custom CSS
<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
  <h2>Title</h2>
</div>
```

### 7.2 Responsive Design (MANDATORY)

**ALL pages and components MUST be responsive**. Use mobile-first breakpoints:

```tsx
<div className="
  flex flex-col gap-4 p-4          // Mobile (default)
  md:flex-row md:gap-6 md:p-6      // Tablet (768px+)
  lg:gap-8 lg:p-8                  // Desktop (1024px+)
">
```

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| (default) | 0px | Mobile phones |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large screens |

### 7.3 Dark Mode Support

Always include dark mode variants where appropriate:

```tsx
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">Content</p>
</div>
```

### 7.4 Design Consistency

- Use consistent spacing scale (4, 8, 12, 16, 24, 32, 48, 64)
- Use consistent border radius (`rounded-md`, `rounded-lg`, `rounded-xl`)
- Follow existing color palette in `tailwind.config.js`
- Match design patterns from existing components

---

## 8. Form Handling Rules

### 8.2 Form Validation Alignment

Validation rules MUST align with backend validation. Reference backend service layer validation.

---

## 9. Routing Rules

### 9.2 Route Protection

- Use `ProtectedRoute` component for authenticated routes
- Use role-based guards for provider/admin routes
- Handle unauthorized access gracefully with redirects

---

## 10. Real-Time Features (Socket.IO)

### 10.1 Socket Connection Pattern

```typescript
// shared/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './useAuth';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { token, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    
    socketRef.current = io(import.meta.env.VITE_WS_URL, {
      auth: { token },
    });
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
    });
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, token]);
  
  return socketRef.current;
};
```

### 10.2 Socket Events Reference

Reference backend socket events from `server/src/services/socket.service.ts`:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join` | Client → Server | Join conversation room |
| `message:new` | Both | New message in conversation |
| `message:read` | Client → Server | Mark message as read |
| `conversation:typing` | Both | Typing indicator |
| `meeting:invite` | Server → Client | Meeting invitation |
| `meeting:accept` | Client → Server | Accept meeting |
| `meeting:decline` | Client → Server | Decline meeting |

---

## 11. Module-Specific Implementation Guidelines

### Module 1: IAM (features/auth)

**Pages Required:**
- LoginPage
- RegisterPage (with OTP verification)
- ForgotPasswordPage
- ResetPasswordPage
- GoogleOAuthCallback

**Key Features:**
- Email + Password login
- OTP verification flow
- Google OAuth integration
- Session management

---

### Module 2: Provider Onboarding (features/profile)

**Pages Required:**
- ProviderApplicationPage (multi-step form)
- ProfileViewPage
- ProfileEditPage

**Key Features:**
- Multi-step provider application wizard
- Experience/Education/Language forms
- Skill selection
- Availability schedule editor

---

### Module 3: Search & Discovery (features/services)

**Pages Required:**
- ServicesListPage
- ProviderSearchPage
- ProviderDetailPage

**Key Features:**
- Search with filters (category, rating, price)
- Provider cards with ratings
- Paginated results
- Sort options

---

### Module 4: Requests & Proposals (features/request)

**Pages Required:**
- CreateRequestPage
- RequestsListPage (client view)
- RequestDetailPage
- MyRequestsPage
- ProposalFormPage
- ProposalsListPage

**Key Features:**
- Request creation (direct/public)
- Proposal submission
- Proposal acceptance/rejection flow
- Request status tracking

---

### Module 5: Payments & Escrow (features/payment)

**Pages Required:**
- PaymentPage
- PaymentHistoryPage
- WalletPage
- WithdrawalPage

**Key Features:**
- Stripe payment integration
- Escrow status display
- Milestone payments
- Withdrawal requests

---

### Module 6: Messaging & Collaboration (features/project)

**Pages Required:**
- ProjectsListPage
- ProjectDetailPage
- ConversationPage
- MeetingsPage

**Key Features:**
- Real-time chat (Socket.IO)
- File sharing
- Video meetings (Agora)
- Project activity timeline

---

### Module 7: Teaching & Scheduling (features/teaching)

**Pages Required:**
- AvailabilityPage
- SessionsListPage
- BookSessionPage
- VideoSessionPage

**Key Features:**
- Weekly availability calendar
- Session booking
- Video conferencing (max 20)
- Session reminders

---

### Module 8: Ratings & Reviews (features/reviews)

**Components Required:**
- RatingForm
- ReviewCard
- RatingsSummary
- WriteReviewModal

**Key Features:**
- Star rating system
- Multi-criteria ratings
- Review submission after completion

---

### Module 9: Notifications (features/notifications)

**Components Required:**
- NotificationBell
- NotificationDropdown
- NotificationsPage

**Key Features:**
- Real-time notifications
- Notification types (request, payment, message)
- Mark as read

---

### Module 10: Reporting (features/reports)

**Pages Required:**
- ReportFormPage
- MyReportsPage (admin)

**Key Features:**
- Report submission with evidence
- Report status tracking

---

### Module 11: Subscription (features/subscription)

**Pages Required:**
- SubscriptionPlansPage
- SubscribePage
- ManageSubscriptionPage

**Key Features:**
- Plan comparison
- Stripe subscription checkout
- Subscription management

---

## 12. Accessibility Requirements (MANDATORY)

All components MUST meet WCAG 2.1 AA standards:

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- Include proper ARIA labels
- Ensure keyboard navigation
- Maintain color contrast ratios (4.5:1 for normal text)
- Provide focus indicators
- Support screen readers

```tsx
// ✅ CORRECT - Accessible button
<button
  aria-label="Close dialog"
  className="focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <XIcon aria-hidden="true" />
</button>

// ❌ WRONG - Non-accessible
<div onClick={handleClose}>
  <XIcon />
</div>
```

---

## 13. Testing Guidelines

### 13.1 Test File Structure

```
features/[module]/
├── components/
│   ├── ComponentName.tsx
│   └── __tests__/
│       └── ComponentName.test.tsx
```

### 13.2 Testing Approach

- Unit test critical business logic
- Integration test API service layer
- E2E test critical user flows

---

## 14. Code Quality Checklist

Before completing any component or page:

- [ ] TypeScript strict mode passes (`npx tsc --noEmit`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] Component is responsive (test on mobile, tablet, desktop)
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Proper TypeScript types defined
- [ ] Accessibility requirements met
- [ ] Dark mode supported (if applicable)
- [ ] Matches existing design patterns

---

## 15. Error Prevention Rules

### 15.1 Common Mistakes to Avoid

| ❌ Don't | ✅ Do |
|---------|------|
| Use `any` type | Define proper interfaces |
| Put module components in shared | Keep module-specific in feature dir |
| Use inline styles | Use Tailwind classes |
| Ignore error states | Handle all error scenarios |
| Hardcode API URLs | Use environment variables |
| Skip loading states | Always show loading feedback |
| Use `console.log` in production | Use proper error handling |
| Ignore TypeScript errors | Fix all type errors |
| Create duplicate components | Reuse existing shared components |

### 15.2 Pre-Implementation Checklist

Before implementing any feature:

1. [ ] Read corresponding module documentation in `documents/modules/module_X/`
2. [ ] Check backend API endpoints in `details.md`
3. [ ] Review existing similar components for patterns
4. [ ] Identify reusable shared components
5. [ ] Plan component hierarchy
6. [ ] Define TypeScript types first

---

## 16. Communication Protocol

### 16.1 Documentation References

When implementing any module, ALWAYS reference:

1. **PRD/BRD**: `documents/lynkr_prd_brd.md`
2. **Module Overview**: `documents/modules/module_X/module_X_*.md`
3. **Module Details**: `documents/modules/module_X/details.md`
4. **Backend Rules**: `documents/implementation_rules.md`
5. **Database Schema**: `documents/schema.mermaid`
6. **Frontend README**: `web/README.md`

### 16.2 When to Ask for Clarification

ALWAYS ask the user for clarification when:

- UI/UX design decisions are not specified
- Multiple valid implementation approaches exist
- Business logic is ambiguous
- Third-party integration details are missing
- Breaking changes to existing code are required

---

## Summary

Following these rules ensures:

1. **Consistency** - All code follows the same patterns
2. **Maintainability** - Code is organized and easy to understand
3. **Quality** - TypeScript, accessibility, and testing requirements are met
4. **Alignment** - Frontend matches backend structure and expectations
5. **Scalability** - Architecture supports future growth

> [!IMPORTANT]
> These rules are mandatory for all AI agents working on the Lynkr frontend. Deviations require explicit user approval.
