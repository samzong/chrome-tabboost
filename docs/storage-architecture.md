# Storage Architecture - Before and After

## Before: Duplicate Cache Per Tab

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Browser                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Tab 1      │   │   Tab 2      │   │   Tab 3      │    │
│  │              │   │              │   │              │    │
│  │ ┌──────────┐ │   │ ┌──────────┐ │   │ ┌──────────┐ │    │
│  │ │ Content  │ │   │ │ Content  │ │   │ │ Content  │ │    │
│  │ │ Script   │ │   │ │ Script   │ │   │ │ Script   │ │    │
│  │ └──────────┘ │   │ └──────────┘ │   │ └──────────┘ │    │
│  │      ↓       │   │      ↓       │   │      ↓       │    │
│  │ ┌──────────┐ │   │ ┌──────────┐ │   │ ┌──────────┐ │    │
│  │ │ Storage  │ │   │ │ Storage  │ │   │ │ Storage  │ │    │
│  │ │  Cache   │ │   │ │  Cache   │ │   │ │  Cache   │ │    │
│  │ │ ~10KB    │ │   │ │ ~10KB    │ │   │ │ ~10KB    │ │    │
│  │ └──────────┘ │   │ └──────────┘ │   │ └──────────┘ │    │
│  │      ↓       │   │      ↓       │   │      ↓       │    │
│  │   Listener   │   │   Listener   │   │   Listener   │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         ↓                   ↓                   ↓           │
│         └───────────────────┴───────────────────┘           │
│                             ↓                                │
│                    ┌─────────────────┐                      │
│                    │ chrome.storage  │                      │
│                    │      .sync      │                      │
│                    └─────────────────┘                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Background Script                         │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │          Storage Cache                        │    │   │
│  │  │          ~10KB                                │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │                     ↓                                  │   │
│  │                 Listener                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                             ↓                                │
│                    ┌─────────────────┐                      │
│                    │ chrome.storage  │                      │
│                    │      .sync      │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘

Total Memory: ~40KB (4 caches × 10KB)
Event Listeners: 4 (3 content scripts + 1 background)
```

## After: Single Cache with Message Passing

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Browser                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Tab 1      │   │   Tab 2      │   │   Tab 3      │    │
│  │              │   │              │   │              │    │
│  │ ┌──────────┐ │   │ ┌──────────┐ │   │ ┌──────────┐ │    │
│  │ │ Content  │ │   │ │ Content  │ │   │ │ Content  │ │    │
│  │ │ Script   │ │   │ │ Script   │ │   │ │ Script   │ │    │
│  │ └──────────┘ │   │ └──────────┘ │   │ └──────────┘ │    │
│  │      ↓       │   │      ↓       │   │      ↓       │    │
│  │ ┌──────────┐ │   │ ┌──────────┐ │   │ ┌──────────┐ │    │
│  │ │ Storage  │ │   │ │ Storage  │ │   │ │ Storage  │ │    │
│  │ │  Proxy   │ │   │ │  Proxy   │ │   │ │  Proxy   │ │    │
│  │ │  <1KB    │ │   │ │  <1KB    │ │   │ │  <1KB    │ │    │
│  │ └──────────┘ │   │ └──────────┘ │   │ └──────────┘ │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         ↓                   ↓                   ↓           │
│         └───────────────────┴───────────────────┘           │
│                             ↓                                │
│             chrome.runtime.sendMessage()                     │
│             (storageGet/storageSet)                          │
│                             ↓                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Background Script                         │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │      Message Handler                          │    │   │
│  │  │      ┌─────────────────────────────┐          │    │   │
│  │  │      │  handle storageGet          │          │    │   │
│  │  │      │  handle storageSet          │          │    │   │
│  │  │      └─────────────────────────────┘          │    │   │
│  │  │                   ↓                            │    │   │
│  │  │      ┌─────────────────────────────┐          │    │   │
│  │  │      │     Storage Cache            │          │    │   │
│  │  │      │        ~10KB                 │          │    │   │
│  │  │      └─────────────────────────────┘          │    │   │
│  │  │                   ↓                            │    │   │
│  │  │               Listener                         │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                             ↓                                │
│                    ┌─────────────────┐                      │
│                    │ chrome.storage  │                      │
│                    │      .sync      │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘

Total Memory: ~10KB (1 cache in background, lightweight proxies)
Event Listeners: 1 (background only)
Message Passing: ~1ms overhead per request (minimal, infrequent)
```

## Key Differences

### Memory Usage
- **Before**: N × 10KB (where N = number of tabs)
- **After**: 10KB (single cache) + 3KB (N lightweight proxies)
- **Savings**: 75-90% with 10+ tabs

### Event Listeners
- **Before**: N + 1 listeners (N content scripts + 1 background)
- **After**: 1 listener (background only)
- **Benefit**: Reduced redundant event processing

### Communication Pattern
- **Before**: Direct chrome.storage API calls from each tab
- **After**: Message passing → single cache in background
- **Trade-off**: +1ms latency for message passing (negligible for infrequent reads)

### Code Complexity
- **Before**: Each content script maintains cache state
- **After**: Content scripts use simple proxy, background manages all cache logic
- **Benefit**: Single source of truth, easier to maintain

## Performance Characteristics

### Read Operation (Before)
```
Content Script → [Check Cache] → [Hit: Return] OR [Miss: chrome.storage API]
Time: ~0ms (cache hit) or ~1-5ms (cache miss)
```

### Read Operation (After)
```
Content Script → [StorageProxy] → Message → Background → [StorageCache] → Response
Time: ~1ms (message passing) + ~0ms (cache hit) = ~1ms total
```

### Write Operation (Before)
```
Content Script → [Update Cache] → [Schedule Write] → chrome.storage API
Time: Async, batched
```

### Write Operation (After)
```
Content Script → [StorageProxy] → Message → Background → [Update Cache] → chrome.storage API
Time: ~1ms (message passing) + Async batched write
```

### Net Performance Impact
- Additional latency: ~1ms per operation
- Frequency: Low (config reads on popup/split view open, ~1-10x per minute)
- User-perceptible impact: None (1ms is imperceptible)
- Memory savings: Significant (90% with 10+ tabs)

## Conclusion
The new architecture trades minimal latency (~1ms per infrequent operation) for significant memory savings (90% with 10+ tabs) and reduced complexity (single source of truth for cached configuration).
