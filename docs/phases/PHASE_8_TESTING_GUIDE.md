# Phase 8.1 Testing Guide: Infinite Scroll

## 🚀 Quick Start: Run & Test Locally

### Step 1: Start Backend Dev Server
```powershell
# From workspace root
npm --prefix backend run dev

# Expected output:
# > backend@1.0.0 dev
# > tsx watch src/index.ts --env-file=.env
# 
# ✓ Server running on http://localhost:3001
# ✓ WebSocket server ready
```

### Step 2: Start Frontend Dev Server
```powershell
# From workspace root (new terminal tab)
npm run dev

# Expected output:
# > vite
# 
# ✓ ready in 234ms
# ➜  Local:   http://localhost:5173/
# ➜  press h + enter to show help
```

### Step 3: Open in Browser
Navigate to `http://localhost:5173/`  
Login with any test user

---

## 📋 Manual Test Cases

### Test 1: Students Page - Basic Infinite Scroll
**Setup:** Ensure mock data has 50+ students

**Steps:**
1. Navigate to **Student Management** page
2. Scroll to bottom of student list
3. Observe: New students load automatically
4. Scroll again to load next batch
5. Verify: No duplicates appear

**Expected:** ✅ Smooth loading, no lag, item count increases

### Test 2: Students Page - Filters Reset Pagination
**Steps:**
1. Scroll through students (load 2-3 pages)
2. Type in search box (e.g., "john")
3. Observe: List resets to top, shows filtered results
4. Continue scrolling - loads more filtered items

**Expected:** ✅ Filter triggers new query from cursor=undefined

### Test 3: Leave Management - Dual Tabs
**Steps:**
1. Go to **Leave Management** page
2. Scroll through **Student Leaves** tab (load 2+ pages)
3. Click **Staff Leaves** tab
4. Observe: Independent pagination for staff leaves
5. Switch back to Student Leaves
6. Verify: Position restored (thanks to React Query cache)

**Expected:** ✅ Each tab maintains its own pagination state

### Test 4: Mobile View - Responsive Layout
**Steps:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (e.g., iPhone 14)
4. Load Students page
5. Scroll to bottom multiple times
6. Verify: Layout adjusts, infinite scroll still works

**Expected:** ✅ Single column layout, smooth scrolling on mobile

### Test 5: Network Throttling - Slow Connection
**Setup:** Simulate slow 3G network

**Steps:**
1. Open DevTools → Network tab
2. Throttle to "Slow 3G" (100 Kbps)
3. Navigate to Students page
4. Watch network requests
5. Verify: Skeleton loaders appear during fetch
6. Each request should be ~15KB

**Expected:** ✅ Loaders animate smoothly, no hanging

### Test 6: Empty State
**Steps:**
1. Go to Students page
2. Search for non-existent student (e.g., "xyzabc123")
3. Observe: Empty state message appears
4. Clear search
5. Verify: List repopulates

**Expected:** ✅ Clean empty state UI, transitions smooth

### Test 7: Error Handling
**Setup:** Temporarily break backend route

**Steps:**
1. Comment out data fetch in backend (return 500 error)
2. Navigate to Students page
3. Observe: Error UI appears with retry button
4. Fix backend code
5. Click retry button
6. Verify: Data loads successfully

**Expected:** ✅ Error handled gracefully, retry works

### Test 8: Leave Approval with Pagination
**Steps:**
1. Login as **Admin** or **Warden**
2. Go to **Leave Management**
3. Scroll through pending requests
4. Approve/reject a request
5. List updates without full reload
6. Scroll more - new requests load

**Expected:** ✅ Action succeeds, pagination continues

---

## 🔍 Debugging Tips

### Check React Query State
```javascript
// In browser console
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
queryClient.getQueryData(['students', ...]);  // View cached data
```

### Monitor Network Requests
1. Open DevTools → Network tab
2. Filter by `Fetch/XHR`
3. Look for requests with `?cursor=` parameter
4. Each should return ~50 items
5. Check response size (~15KB)

### Check Intersection Observer
```javascript
// Test if element is visible
const observer = document.querySelector('[aria-label="Load more trigger"]');
if (observer) console.log('Observer found');
```

### Performance Metrics
```javascript
// Measure rendering performance
window.addEventListener('load', () => {
  console.log('Time to first page:', performance.now(), 'ms');
});
```

---

## 🧪 Automated Test Commands (Phase 8.1.2)

These will be added once Vitest is configured:

```bash
# Run pagination tests
npm run test -- pagination.test.ts

# Run InfiniteList component tests  
npm run test -- infinite-list.test.tsx

# Run integration tests
npm run test -- pages/students.integration.test.tsx

# Coverage report
npm run test -- --coverage
```

---

## 📊 Performance Targets

### Acceptable Performance:
- **Initial Load:** <1 second
- **Page Load:** <500ms (target: <300ms)
- **Scroll Response:** <16ms (60fps)
- **Network Request:** <15KB per page
- **Memory Growth:** <1MB per 100 pages loaded

### Monitor with:
1. DevTools → Performance tab → Record
2. Check for long tasks (>50ms)
3. Verify FPS stays at 60
4. Monitor memory in Memory tab

### Example Test:
```
1. Record in Performance panel
2. Scroll from top to bottom of list
3. Load multiple pages
4. Check: <50ms tasks, 60fps, <2MB memory growth
```

---

## ✅ Sign-Off Checklist

Before considering Phase 8.1 complete:

- [ ] All 8 test cases pass on desktop
- [ ] All 8 test cases pass on mobile (tested via DevTools)
- [ ] No console errors or warnings
- [ ] Network requests average <15KB
- [ ] Page load time <1s
- [ ] Smooth scrolling at 60fps
- [ ] No duplicate items in paginated lists
- [ ] Filters correctly reset pagination
- [ ] Tab switching maintains state (Leave page)
- [ ] Error states handled gracefully

---

## 🐛 Known Issues & Workarounds

### Issue: Duplicate items on rapid scroll
**Cause:** Race condition in setData  
**Workaround:** React Query deduplication handles this (keyed by item.id)  
**Status:** Fixed in InfiniteList deduplication logic

### Issue: Scroll jumps when loading new items
**Cause:** Page height changes  
**Workaround:** Use virtual scrolling for large lists (future optimization)  
**Status:** Acceptable for Phase 8.1 (smooth enough)

---

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| Infinite scroll not working | Check query key includes all filters |
| Items duplicating | Verify deduplicationKey matches item.id |
| Network requests failing | Check backend is running on port 3001 |
| Skeleton loaders never disappear | Check browser console for errors |
| Filters not resetting pagination | Ensure query key includes filter state |
| Mobile view broken | Check DevTools → Responsive design mode |

---

**Ready to test!** Run the dev servers and follow test cases above.  
Report any issues with detailed steps to reproduce.
