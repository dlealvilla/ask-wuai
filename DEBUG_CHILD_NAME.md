# Debugging Child Name Issue

## Problem
"Enrique" appears to be hardcoded in answers even though code uses `activeChild?.name || settings.childName`.

## How to Debug

### 1. Check Browser Console
Open browser DevTools (F12) and look for:
```
🔍 Child name debug: {
  activeChild: "...",
  settingsChildName: "...",
  finalName: "...",
  activeChildFull: {...}
}
```

### 2. Check Supabase Function Logs
In Supabase Dashboard → Edge Functions → answer → Logs, look for:
```
🔍 Answer function received childName: "..."
🔍 System prompt nameInstruction: "..."
```

### 3. Possible Issues

**Issue A: activeChild is null/undefined**
- Check if a child profile is selected
- Verify `activeChild` is being set correctly in SettingsContext

**Issue B: Conversation History**
- Old conversation history might contain "Enrique"
- The AI might be using context from previous messages
- Solution: Clear conversation history or start fresh

**Issue C: Cached Settings**
- localStorage might have old "Enrique" value
- Solution: Clear browser localStorage or check `settings.childName`

**Issue D: Deployment Issue**
- Changes might not be deployed to Lovable
- Check if latest commit is deployed

### 4. Quick Fix Test

1. Open browser console
2. Run: `localStorage.clear()` (this will reset all settings)
3. Refresh page
4. Select/create a child profile
5. Ask a question
6. Check console logs for the debug output

### 5. Verify Active Child

In browser console, check:
```javascript
// Check what's in localStorage
localStorage.getItem('curious-buddy-active-child')
localStorage.getItem('curious-buddy-settings')

// Check React DevTools
// Look at SettingsContext → activeChild
```

