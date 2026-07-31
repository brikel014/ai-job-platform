# Employer Profile - Architecture

## 📁 File Structure

```
app/employer/profile/
├── page.tsx                    # Main orchestrator component
├── types.ts                    # TypeScript types & interfaces
├── stepConfig.ts              # Step configuration & constants
├── hooks/
│   └── useEmployerProfileForm.ts  # Form logic & state management
├── components/
│   ├── Step1CompanyName.tsx    # Step 1: Company name input
│   ├── Step2Location.tsx       # Step 2: Location details
│   ├── Step3AdditionalInfo.tsx # Step 3: About & website
│   └── SuccessScreen.tsx       # Success confirmation screen
└── utils/
    └── profilePayloadBuilder.ts   # Payload preparation logic
```

## 🏗️ Architecture Overview

### Separation of Concerns

1. **page.tsx** - Main Component (Orchestrator)
   - Minimal logic
   - Uses custom hook for state
   - Renders appropriate step/screen
   - Handles form submission

2. **types.ts** - Type Definitions
   - `EmployerProfileFormState` - Form data structure
   - `FormState` - Complete form state
   - `FormActions` - Available actions
   - `MessageState` - Success/error messages

3. **hooks/useEmployerProfileForm.ts** - Business Logic
   - State management
   - Form validation
   - API calls (create/update profile)
   - Step navigation logic
   - Side effects (loading profile, auth checks)

4. **components/** - UI Components
   - Each step is a separate component
   - Props-based, reusable
   - No business logic
   - Clear interface contracts

5. **utils/profilePayloadBuilder.ts** - Data Transformation
   - Prepares API payload
   - Handles optional fields
   - Data trimming/validation

## 🔄 Data Flow

```
User Action
    ↓
page.tsx (calls action from hook)
    ↓
useEmployerProfileForm (updates state)
    ↓
page.tsx re-renders with new state
    ↓
Appropriate component renders with updated props
```

## 🎯 Key Principles

### 1. Single Responsibility
Each file/component has one clear purpose:
- `page.tsx` → orchestration & rendering
- `useEmployerProfileForm` → state & logic
- Step components → UI only
- `profilePayloadBuilder` → data transformation

### 2. Composition over Inheritance
- Small, focused components
- Composed together in main page
- Easy to test individually

### 3. Props Down, Events Up
- Parent passes data via props
- Children call callbacks for events
- Unidirectional data flow

### 4. Type Safety
- Strong TypeScript types throughout
- Clear interfaces for all props
- Type-safe state management

## 📝 Adding a New Step

1. Create component in `components/StepX.tsx`
2. Add step config to `stepConfig.ts`
3. Add fields to `EmployerProfileFormState` in `types.ts`
4. Update validation in `lib/validation/employerProfile.ts`
5. Add case to `renderStepContent()` in `page.tsx`

## 🧪 Testing Strategy

### Unit Tests
- Test `useEmployerProfileForm` hook independently
- Test each step component with various props
- Test `profilePayloadBuilder` with different inputs

### Integration Tests
- Test full form flow
- Test validation
- Test API integration

### E2E Tests
- Test complete user journey
- Test success/error scenarios

## 🚀 Benefits of This Structure

1. **Maintainability**
   - Easy to find and modify code
   - Clear responsibilities
   - Self-documenting structure

2. **Testability**
   - Each piece can be tested independently
   - Mock dependencies easily
   - Clear input/output contracts

3. **Scalability**
   - Add new steps without touching existing code
   - Extract patterns into shared utilities
   - Reuse components across features

4. **Developer Experience**
   - Easy onboarding for new developers
   - Clear where to add new features
   - Type safety catches errors early

5. **Performance**
   - Can optimize individual components
   - Can lazy load steps if needed
   - Memoization opportunities clear

## 📚 Related Documentation

- See `stepConfig.ts` for step definitions
- See `lib/validation/employerProfile.ts` for validation rules
- See `lib/db/employerProfiles.ts` for API functions

