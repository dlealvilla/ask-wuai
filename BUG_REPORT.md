# Bug Report - Little Thinker AI

## Critical Bugs

### 1. Missing Dependencies in useCallback Hooks
**Location**: `src/components/MainView.tsx`

**Issue**: Several `useCallback` hooks are missing dependencies, which can cause stale closures and bugs.

- **Line 127**: `handleQuestion` callback is missing `activeChild` and `fetchAnswer` dependencies
- **Line 272**: `fetchAnswer` callback is missing `activeChild` dependency  
- **Line 343**: `handleTellMore` is not wrapped in `useCallback` and uses `fetchAnswer` which could be stale

**Impact**: Stale closures can cause incorrect behavior when dependencies change, leading to bugs in question handling and answer fetching.

**Fix**: Add missing dependencies to dependency arrays or wrap functions properly.

---

### 2. Race Condition in Media Generation
**Location**: `src/components/MainView.tsx` - `fetchProgressiveMedia` function (line 275)

**Issue**: The function checks `currentQuestionRef.current !== questionId` but doesn't properly cancel ongoing image generation requests when a new question arrives.

**Impact**: If a user asks a new question while images are still generating, old images might appear for the new question, causing confusion.

**Fix**: Use AbortController for image generation requests or add better cancellation logic.

---

### 3. Potential Null Reference Error
**Location**: `src/main.tsx` line 9

**Issue**: Uses non-null assertion operator (`!`) on `getElementById("root")` without checking if the element exists.

**Impact**: If the HTML doesn't have a `#root` element, the app will crash with a runtime error.

**Fix**: Add a null check or error handling.

---

### 4. Missing Dependency in useEffect
**Location**: `src/hooks/useVoiceInput.ts` line 70

**Issue**: The `useEffect` that initializes Web Speech Recognition has an empty dependency array but uses `useWebSpeech` which is a module-level variable.

**Impact**: If `useWebSpeech` changes, the effect won't re-run, potentially causing issues.

**Fix**: This might be intentional, but should be documented or handled properly.

---

## Medium Priority Issues

### 5. Memory Leak Potential in Voice Input
**Location**: `src/hooks/useVoiceInput.ts`

**Issue**: The `recognition` object cleanup in the useEffect cleanup function calls `recognition.abort()`, but if the recognition object is in certain states, this might not fully clean up.

**Impact**: Memory leaks over time, especially if the component unmounts during active recognition.

**Fix**: Add more comprehensive cleanup logic.

---

### 6. Unhandled Promise in MainView
**Location**: `src/components/MainView.tsx` line 114-122

**Issue**: The `articulate` function call uses `.then().catch()` but doesn't handle the case where the component unmounts before the promise resolves.

**Impact**: Potential state updates on unmounted components, causing React warnings.

**Fix**: Use a ref to track if component is mounted or use AbortController.

---

### 7. Type Safety Issue in SettingsContext
**Location**: `src/contexts/SettingsContext.tsx` line 315

**Issue**: The `addChild` callback uses `childrenList.length` in the dependency array, but should use `childrenList` itself or handle it differently.

**Impact**: Stale closure issues when adding children.

**Fix**: Review dependency array logic.

---

### 8. Error Handling in Supabase Functions
**Location**: `supabase/functions/answer/index.ts` and other functions

**Issue**: Some error cases return generic error messages without logging enough context for debugging.

**Impact**: Difficult to debug production issues.

**Fix**: Add more detailed error logging (while being careful not to expose sensitive data).

---

## Low Priority / Code Quality Issues

### 9. Inconsistent Error Handling
**Location**: Multiple files

**Issue**: Some async operations use try-catch, others use `.catch()`, and error messages are inconsistent.

**Impact**: Inconsistent user experience and harder maintenance.

**Fix**: Standardize error handling patterns.

---

### 10. Missing Input Validation
**Location**: `supabase/functions/answer/index.ts` line 114

**Issue**: The function accepts user input without validation. While Supabase RLS should handle security, input validation would prevent malformed requests.

**Impact**: Potential for malformed requests causing errors.

**Fix**: Add input validation (e.g., check if question is a non-empty string, ageRange is valid, etc.).

---

### 11. Timer State Management
**Location**: `src/components/MainView.tsx` lines 137-163

**Issue**: Timer initialization effect depends on `settings.timerMinutes` but the dependency array might not include all necessary dependencies.

**Impact**: Timer might not update correctly when settings change.

**Fix**: Review timer effect dependencies.

---

### 12. CORS Headers Security
**Location**: All Supabase functions

**Issue**: CORS headers allow all origins (`"Access-Control-Allow-Origin": "*"`). This is fine for public APIs but should be documented.

**Impact**: Any website can call these functions (though they still need proper auth).

**Fix**: Consider restricting to specific origins in production if needed.

---

## Recommendations

1. **Add React Error Boundaries**: Wrap main components in error boundaries to catch and handle React errors gracefully.

2. **Add Loading States**: Some async operations don't show loading states clearly.

3. **Add Unit Tests**: Critical functions like `fetchAnswer` and voice input handling should have tests.

4. **Type Safety**: Some `any` types could be replaced with proper TypeScript types.

5. **Accessibility**: Review ARIA labels and keyboard navigation.

---

## Summary

**Total Issues Found**: 12
- **Critical**: 4
- **Medium**: 4  
- **Low Priority**: 4

Most critical issues are related to React hooks dependencies and race conditions. These should be fixed to prevent bugs in production.

