# Storage Cache Refactoring

## Problem

Previously, every content script instance (one per tab) initialized its own `StorageCache`, leading to:
- Duplicated configuration data in memory for each open tab
- Multiple `chrome.storage.onChanged` listeners doing redundant work
- Memory usage scaling linearly with the number of tabs

## Solution

The storage caching has been refactored to eliminate per-tab duplication:

### Architecture Changes

1. **Background Script** (`src/js/background.js`)
   - Maintains a single `StorageCache` instance
   - Added message handlers for `storageGet` and `storageSet` actions
   - Serves storage requests from all content scripts

2. **Storage Proxy** (`src/utils/storage-proxy.js`)
   - Lightweight proxy used by content scripts
   - Forwards all storage operations to the background script via `chrome.runtime.sendMessage`
   - No local caching, no storage listeners
   - API-compatible with `StorageCache` for easy migration

3. **Unified Storage** (`src/utils/storage-unified.js`)
   - Context-aware storage accessor for shared utilities
   - Auto-detects execution context (content script vs extension page)
   - Uses `StorageProxy` in content scripts
   - Uses `StorageCache` in background/extension pages
   - Allows shared utility files to work in both contexts

### Files Modified

- `src/js/contentScript.js` - Uses `StorageProxy` instead of `StorageCache`
- `src/js/splitView/splitViewState.js` - Uses `StorageProxy`
- `src/js/splitView/splitViewEvents.js` - Uses `StorageProxy`
- `src/utils/iframe-compatibility.js` - Uses unified storage (works in both contexts)
- `src/js/background.js` - Added storage message handlers

### Files Created

- `src/utils/storage-proxy.js` - Storage proxy for content scripts
- `src/utils/storage-unified.js` - Context-aware storage accessor

### Benefits

1. **Reduced Memory Usage**: Configuration data cached once instead of N times (where N = number of tabs)
2. **Fewer Event Listeners**: Single `chrome.storage.onChanged` listener instead of one per tab
3. **Improved Sync Performance**: Storage changes broadcast once to all tabs, not processed N times
4. **Maintained Performance**: Message passing is fast for small, infrequent configuration reads
5. **API Compatibility**: Existing code requires minimal changes

### Trade-offs

- **Slight Latency**: First-time storage reads in content scripts require message passing (~1ms overhead)
- **Dependency on Background**: Content scripts depend on background script being available
- **Async Always**: All storage operations are async (were already async in most cases)

### Testing

New test files:
- `tests/unit/storageProxy.test.js` - Unit tests for StorageProxy
- `tests/integration/storageMessaging.integration.test.js` - Integration tests for message passing

### Migration Guide

For other parts of the codebase:

**Content Scripts:**
```javascript
// Before
import storageCache from "../utils/storage-cache.js";
await storageCache.init();
const settings = await storageCache.get({ key: "default" });

// After
import storageProxy from "../utils/storage-proxy.js";
await storageProxy.init(); // No-op, but kept for compatibility
const settings = await storageProxy.get({ key: "default" });
```

**Shared Utilities (used by both content scripts and background):**
```javascript
// Before
import storageCache from "./storage-cache.js";
const settings = await storageCache.get({ key: "default" });

// After
import * as storage from "./storage-unified.js";
const settings = await storage.get({ key: "default" });
```

**Background/Extension Pages:**
```javascript
// No changes needed - continue using storageCache
import storageCache from "../utils/storage-cache.js";
await storageCache.init();
const settings = await storageCache.get({ key: "default" });
```

## Performance Impact

### Before
- Memory: ~X KB × N tabs (where X = size of cached config)
- Storage listener overhead: N listeners × M changes

### After
- Memory: ~X KB (single cache in background)
- Storage listener overhead: 1 listener × M changes
- Message passing overhead: ~1ms per storage operation in content scripts (negligible for infrequent config reads)

### Net Result
Significant memory savings with minimal latency impact, especially beneficial when:
- Many tabs are open (10+)
- Cached configuration is large
- Storage changes are frequent
