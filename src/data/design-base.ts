import type { LegacyDesignProblem as DesignProblem } from './legacy.ts'

export const DESIGN_PROBLEMS: DesignProblem[] = [
  {
    id: 'design-url-shortener',
    title: 'Short URL Service',
    prompt: [
      'Design a URL shortening service like bit.ly or TinyURL. Users submit a long URL and receive a short link (e.g. `https://shrt.ly/Ab3xK9Q`) that redirects to the original URL.',
      'Assume the service stores on the order of billions of unique URLs and handles a mix of API write traffic and heavy redirect read traffic (reading a short URL is far more frequent than creating one).',
    ],
    functional: [
      'Create a short code for a given long URL (POST /v1/urls)',
      'Resolve a short code to the long URL via an HTTP redirect (GET /:code → 302)',
      'Return the original URL when the same long URL is submitted twice (dedupe)',
      'Custom aliases: a user can request a specific code (e.g. shrt.ly/myblog)',
      'Stats endpoint: click counts per short URL',
    ],
    nonFunctional: [
      'Redirects are the hot path: single-digit ms p99, must survive viral-link traffic spikes',
      'Redirect service must be stateless and horizontally scalable',
      'Code space must be practically collision-free at billions of rows',
      'Data must survive node failures (persistence on the write path)',
    ],
    talkingPoints: [
      {
        heading: 'Requirements & scale estimate',
        bullets: [
          'Traffic split: redirects ≈ 50–100× more QPS than creation',
          'Estimate: 1B URLs × ~100 bytes ≈ 100 GB raw; metadata (counts, owner, created) roughly doubles that',
          'Short code length: 6 base62 chars gives 62⁶ ≈ 5.7×10¹⁰ codes; 7 chars gives ~3.5×10¹² — virtually collision-free even at billions of rows',
          'Is storage centralized per-service or per-shard? Key design: lookups by code alone, no client-side routing hints',
        ],
      },
      {
        heading: 'API design',
        bullets: [
          'POST /v1/urls { longUrl, customCode? } → { shortCode, shortUrl }',
          'GET /:code → 302 Location: longUrl (302 so the browser keeps showing the short URL; discuss 301 vs 302 for caching)',
          'Handle collisions, invalid/claimed custom aliases, and rate limits on creation',
        ],
      },
      {
        heading: 'ID / code generation',
        bullets: [
          'Option A — random base62 (6–7 chars): uniform, stateless to generate; detect collisions at insert time and retry',
          'Option B — monotonic counter encoded in base62: deterministic, zero collisions, but the counter becomes a hotspot (use Redis INCR or a Snowflake-style ID to shard it)',
          'Counter also makes "recently created" queries easy, but let anyone predict codes — argue for random if enumeration/abuse is a concern',
        ],
      },
      {
        heading: 'Data model & storage',
        bullets: [
          'Core table: code (PK) → long URL + metadata (owner, created_at, click_count)',
          'Start with a sharded key-value store (Cassandra, DynamoDB) keyed by code; partition keys are only ever looked up by exact code, so hashing is natural',
          'Keep the redirect response itself (the long URL) in cache so the hot path never touches the primary store',
          'Click counts are eventually-consistent: increment in cache, flush to the store on an interval',
        ],
      },
      {
        heading: 'Serving the hot path',
        bullets: [
          'Front the KV store with a multi-level cache (in-process + Redis); cache size chosen so 99% of redirects never hit the store',
          'Redirect service is stateless — put it behind a load balancer, scale by QPS',
          'Serve redirects from edge/CDN nodes; pin hot codes so a viral link is answered locally everywhere',
          'Pre-warm: when a URL is created, fan the mapping out to the cache tier',
        ],
      },
      {
        heading: 'Reliability & edge cases',
        bullets: [
          'What happens when a cache node dies? — nothing user-visible if the store is the source of truth',
          'Long-URL length limits; reject or truncate at the API',
          'Abuse: phishing short links — rate-limit creation, scan metadata, support takedown by code',
          'Deleting a URL: mark soft-deleted so existing shares degrade gracefully',
        ],
      },
    ],
    followUps: [
      'A short link goes viral: 1M redirects/second for 10 minutes. What breaks first and how do you absorb it?',
      'Two requests race to claim the same custom alias. How do you make this safe?',
      'The interviewer asks for click-through analytics over the past 30 days — where does that read path go?',
    ],
  },
  {
    id: 'design-rate-limiter',
    title: 'Rate Limiter',
    prompt: [
      'Design a distributed rate limiter for an API gateway serving thousands of clients. Each client has a quota (e.g. 100 requests/minute) and must be throttled consistently across many gateway instances.',
      'The limiter must be low-latency (it sits in the request path) and must not become a single point of failure for the API.',
    ],
    functional: [
      'Allow/deny a request for (clientId, endpoint, tier) in under ~1 ms of added latency',
      'Support per-client quotas with multiple tiers (free, pro, enterprise)',
      'Expose remaining quota and reset time to callers (e.g. X-RateLimit-* headers, 429 + Retry-After)',
      'Admin API to change quotas without redeploys',
    ],
    nonFunctional: [
      'Correct enough under distribution: brief over- or under-admission during failover is acceptable, long-term cheating is not',
      'Latency in the critical path: p99 overhead budget < 1–2 ms',
      'Degradation policy: if limiter state is unavailable, define whether to fail open or fail closed',
      'Quota accounting must survive gateway instance restarts',
    ],
    talkingPoints: [
      {
        heading: 'Requirements & scale',
        bullets: [
          'Estimate: 100k active clients, 1M req/s at peak, each request must be checked once — the limiter sees 100% of traffic',
          'Quota windows: fixed minute, sliding minute, or burstable? "100 req/min" is ambiguous — clarify with the interviewer (this is a great opportunity to demonstrate clarifying questions)',
        ],
      },
      {
        heading: 'Algorithms',
        bullets: [
          'Fixed window: O(1), trivial to shard, but boundary bursts (199 req at :59 + 199 at :00 pass a 100/min limit)',
          'Sliding window log: exact but stores every request timestamp — too much memory at high QPS',
          'Sliding window counter: approximate with two fixed windows weighted by overlap — good precision, O(1) state',
          'Token bucket: store tokens (cap C, refill rate R); allows bursts up to C while enforcing R long-term — usually the right pick for APIs',
        ],
      },
      {
        heading: 'Distributed enforcement',
        bullets: [
          'Central state (Redis) with atomic check-and-decrement via a Lua script: consistent, but every request hits Redis',
          'Hybrid: pre-allocate quota chunks to gateway instances (e.g. a server pulls 10% of the per-minute budget every 6 s); local enforcement, periodic reconciliation — low latency, slight over-admission under skew',
          'Shard clients across limiter nodes by hash(clientId) so one node owns each client’s state — no cross-node coordination per request',
        ],
      },
      {
        heading: 'Storage & state',
        bullets: [
          'State per (clientId, endpoint, window): tokens remaining + last-refill time — a hash, so a Redis cluster fits comfortably',
          'Quota config (tiers) is small and hot: cache in gateway memory, refresh on change via pub/sub',
          'Clock skew across nodes: use a single monotonic source or tolerate a bounded drift; for sliding windows, store timestamps in one timezone/epoch',
        ],
      },
      {
        heading: 'Failure modes & API surface',
        bullets: [
          'Redis down: fail open (serve unthrottled) vs fail closed (deny everyone) — pick per endpoint; a premium API may prefer degraded but safe',
          'Gateway instance dies mid-window: unused local tokens lapse — acceptable if chunk pull is frequent enough',
          'Responses: 429 with Retry-After; X-RateLimit-Limit / -Remaining / -Reset headers on every call',
        ],
      },
    ],
    followUps: [
      'The interviewer wants strict "no more than 100 req/min ever, even across failover." How do you change the design?',
      'Clock skew between limiter nodes is up to 5 seconds. Does it break correctness for your chosen algorithm?',
      'One client is 90% of all traffic. How does your sharding strategy hold up?',
    ],
  },
  {
    id: 'design-kv-store',
    title: 'Key-Value Store (Redis-like)',
    prompt: [
      'Design a distributed key-value store with the GET/SET/DELETE API, TTL support, and horizontal scalability — think of a managed Redis or a DynamoDB-lite.',
      'It should be readable at moderate scale (millions of keys, sub-millisecond reads on the happy path), but the design must explain how it grows to billions of keys.',
    ],
    functional: [
      'GET / SET / DELETE on string (and optionally list/hash) values',
      'SET with TTL; expired keys read as absent',
      'Multi-key atomic operations (MSET, or at minimum a CAS via WATCH/compare-and-swap)',
      'Persistence options: durable vs high-performance mode per deployment',
    ],
    nonFunctional: [
      'Read latency p99 < 1 ms on the fast path (in-memory); writes durable enough for the SLA',
      'Scale to billions of keys / hundreds of GB by adding nodes',
      'Tolerate node and shard failures with bounded data loss (define: zero for synced writes, ≤ seconds for async)',
      'Redistribute keys online without stopping the service',
    ],
    talkingPoints: [
      {
        heading: 'Requirements & scale',
        bullets: [
          'Estimate: 10M keys × ~100 B ≈ 1 GB in memory — one box; 1B keys ≈ 100 GB — many boxes, so sharding is mandatory',
          'Read/write ratio? For a cache-like workload, assume 90/10 reads; this drives replica count',
        ],
      },
      {
        heading: 'Data model & node internals',
        bullets: [
          'Hash map with near O(1) access (skip list or hash table), plus a lazy expiry check on access + a background sweeper',
          'Value types: start with strings; encoding a hash/list as values avoids a document model',
          'Write-ahead log (append-only file) for durability: append then ack; snapshot + replay for fast restart',
        ],
      },
      {
        heading: 'Sharding & routing',
        bullets: [
          'Consistent hashing of keys onto a ring of virtual nodes — add/remove a node moves only ~1/N of the keys',
          'Client-side routing (client owns the ring) vs a proxy tier (proxy owns the ring) — trade latency vs operational simplicity',
          'Each shard = one partition; a key’s home shard decides where its primary lives',
        ],
      },
      {
        heading: 'Replication & consistency',
        bullets: [
          'Each shard: 1 primary + N replicas; replicas tail the primary’s op log',
          'Async replication = lower latency, lose in-flight writes on failover; sync/semi-sync = durable but higher write latency — offer it per key space (like DynamoDB’s "strong vs eventual")',
          'Failover: promote a replica using a consensus/quorum protocol (Raft) so there is exactly one primary per shard',
          'Reads from replicas are stale by the replication lag — expose a staleness bound or route "read-your-writes" to the primary',
        ],
      },
      {
        heading: 'API & durability semantics',
        bullets: [
          'Document the guarantee: "after ACK, a replica-failover loses at most X seconds of writes (async mode) or nothing (sync mode)"',
          'TTL and hot keys: a key getting 100k reads/s is a hotspot — per-shard rate limiting or replica-local caching',
        ],
      },
    ],
    followUps: [
      'A shard’s primary dies mid-rebalance. What are the failure windows and how long is the key space unavailable?',
      'An application wants exactly-once semantics for SETs. Can you offer that, and what would it cost?',
      'The interviewer asks: why not just use a B-tree disk-backed store like RocksDB for everything? When would you? When wouldn’t you?',
    ],
  },
  {
    id: 'design-chat-system',
    title: 'Real-Time Chat (1:1 + Group)',
    prompt: [
      'Design a chat system supporting direct messages and group conversations (up to ~1,000 members) with real-time delivery, read receipts, and reliable offline catch-up.',
      'Messages must not be lost and must arrive in order per conversation. The system serves tens of millions of users at the peak hour.',
    ],
    functional: [
      'Send/receive 1:1 and group messages in real time',
      'Read receipts per conversation (and per-message for 1:1)',
      'Offline messages delivered on reconnect; last-N unread badge count',
      'Presence: online/away state per user',
      'Message deletion and (optionally) reactions',
    ],
    nonFunctional: [
      'Delivery: at-least-once with no duplicates visible to the user (dedupe by message ID)',
      'Ordering: strictly ordered per conversation, even across out-of-order transport',
      'Latency: < 500 ms median for an online recipient',
      'Scale: 10M concurrent connections for the gateway tier',
    ],
    talkingPoints: [
      {
        heading: 'Requirements & scale',
        bullets: [
          'Estimate: 10M peak concurrent users, ~10 msg/s/user at peak ⇒ 100M msg/s is the extreme; realistically 1–10M msg/s',
          'Message size: a few hundred bytes typical, images/files go to object storage and only the URL travels through chat',
        ],
      },
      {
        heading: 'Client connectivity',
        bullets: [
          'WebSocket (or long-poll fallback) to a pool of stateless connection gateways behind a load balancer; one connection per user per device',
          'Gateways keep a connection registry: userId → gateway node (e.g. in a shared KV/Redis) so the server can route a push to the right socket',
          'Heartbeats double as presence signals: last ping time + a TTL marks the user away/offline',
        ],
      },
      {
        heading: 'Message pipeline',
        bullets: [
          'Gateway forwards the message to the message service (stateless); the message service assigns a **monotonically increasing sequence number per conversation** — this is what gives ordering',
          'Persist to a per-conversation log (append-only; a DB table (conversation_id, seq, …) or a Kafka topic per conversation partition)',
          'Fan out: publish to each recipient’s personal stream via pub/sub (Kafka topics per user, or an in-process queue when the recipient is online)',
          'Offline recipient: the gateway pulls from their stream on reconnect using the last delivered seq — no redelivery of already-seen messages',
        ],
      },
      {
        heading: 'Read receipts & unread counts',
        bullets: [
          'Receipt = "user U has read up to seq S in conversation C" — a tiny write, stored per (user, conversation)',
          'Unread count for a conversation = max seq of the conversation − my read seq; compute lazily, don’t increment a counter on every fan-out',
          'Group read receipts ("3 of 8 seen") = count of distinct users whose read seq ≥ the message seq',
        ],
      },
      {
        heading: 'Reliability & scale-out',
        bullets: [
          'At-least-once: client acks each message ID; the sender can retransmit until acked, and the receiver dedupes by ID',
          'Fan-out cost for a 1,000-person group = 1,000 fan-out writes per message — acceptable; for very large groups, switch to pull (recipients fetch the conversation log) instead of push',
          'Backpressure: a slow client drains its stream at connection speed; keep a bounded buffer per user and evict oldest-first',
        ],
      },
    ],
    followUps: [
      'A group has 50,000 members and one user posts. Push fan-out is now 50k writes — redesign that path.',
      'The gateway holding your socket dies after your message was accepted but before delivery. What does the client observe, and how do you recover?',
      'How would you add end-to-end encryption without breaking offline storage and group chat?',
    ],
  },
  {
    id: 'design-news-feed',
    title: 'News Feed (Timeline)',
    prompt: [
      'Design a social-media news feed: when a user opens the app, show them recent posts from people they follow (and a few recommended items), newest first, with pagination.',
      'Scale: hundreds of millions of users, most following a few hundred accounts; a minority of users (celebrities) have tens of millions of followers.',
    ],
    functional: [
      'POST: publish a post (text, media reference, tags)',
      'GET /feed: the next page of feed items for a user (newest first)',
      'Follow/unfollow, affecting the feed prospectively',
      'Like/comment counts on feed items (eventually consistent is fine)',
    ],
    nonFunctional: [
      'Feed fetch p95 < 200 ms',
      'Post-to-feed-visible latency < a few seconds for a typical follower',
      'Celebrities posting must not blow up the write path',
      'Feed items ordered by time (with optional ranking later)',
    ],
    talkingPoints: [
      {
        heading: 'Requirements & scale',
        bullets: [
          'Estimate: 300M users, ~10M DAU-ish power users posting; average user follows ~250 accounts; feed page ≈ 20 items',
          'Key asymmetry to name early: a normal user’s post needs ~250 fan-out writes; a celebrity’s needs 30M — this drives the whole design',
        ],
      },
      {
        heading: 'Core trade-off: fan-out on write vs read',
        bullets: [
          'Write fan-out (push): when A posts, append A’s post ID to each follower’s feed list. Feed read = fetch one list — fast; celebrity post = 30M appends — slow/expensive',
          'Read fan-out (pull): on feed fetch, gather all followees, fetch their recent posts, merge-sort. Read cost grows with follow count; writes are cheap and celebrities are free',
          'Hybrid (the standard answer): push for users with < N followers (e.g. 10k); pull for celebrities; at read time, merge the pre-computed feed + on-the-fly fetch of followed celebrities’ latest posts',
        ],
      },
      {
        heading: 'Data model',
        bullets: [
          'Posts: KV store keyed by postID (id, author, created_at, text, media_url) — high read, rarely written',
          'Per-author timeline: sorted set by created_at so "latest 5 posts of author X" is a cheap range read',
          'Follower graph: store both follow (out) and follower (in) edges — push needs in-edges, pull needs out-edges',
          'Feed list per user: a sorted set (or list) of (postID, timestamp), capped at the last K items (e.g. 500) — eviction is acceptable since older items are still pull-able from authors',
        ],
      },
      {
        heading: 'Serving the feed',
        bullets: [
          'GET /feed: 1) fetch my pre-computed feed list 2) for followed celebrities, fetch their latest posts 3) merge + dedupe 4) hydrate post bodies (batched multi-get) 5) attach like/comment counts 6) return the first 20 + a cursor',
          'Cursor pagination (last timestamp/postID), never offset — offsets skew as the feed moves',
          'Cache aggressively: the feed list per user is the hottest key; short TTL (10–30 s) is enough since new posts can be merged in after cache',
        ],
      },
      {
        heading: 'Ranking & enrichment',
        bullets: [
          'Start chronological; a ranking pass (recency + affinity score) can run asynchronously or off the critical path for the first page',
          'Engagement counts (likes) are read-heavy: keep counters in cache, flush to the store; tolerate slight staleness',
          'Recommendation items ("people you may know", suggested posts) are a separate service merged at the tail — keep the social feed pure',
        ],
      },
    ],
    followUps: [
      'A user follows 10,000 accounts and 500 are celebrities. How long does the read path take now, and what do you cut?',
      'A celebrity with 40M followers posts. Walk through exactly what happens in your hybrid design.',
      'The interviewer asks you to add "recency re-rank by engagement" to the first page without breaking the 200 ms budget. Where does that compute live?',
    ],
  },
  {
    id: 'design-web-crawler',
    title: 'Web Crawler',
    prompt: [
      'Design a web crawler that continuously indexes a large subset of the web for a search engine. It must discover new URLs, fetch and parse pages, extract links, and feed a downstream index builder.',
      'Constraints: be polite to websites (respect robots.txt, per-domain rate limits), handle retries for flaky hosts, and deduplicate aggressively because the web is full of near-identical content.',
    ],
    functional: [
      'URL discovery: new links found on crawled pages enter the crawl frontier',
      'Fetch & parse: produce text content + outlinks per page',
      'URL normalization & dedup: one canonical URL per distinct page',
      'Per-domain rate limiting and robots.txt compliance',
      'Re-crawl scheduling: fresh pages more often than stale ones',
    ],
    nonFunctional: [
      'Throughput: 100k+ pages/s fleet-wide at peak',
      'No domain is ever hammered beyond its configured budget',
      'Duplicate fetches < 1% of total work',
      'A worker or shard failure loses at most a small bounded set of in-flight URLs',
    ],
    talkingPoints: [
      {
        heading: 'Requirements & scale',
        bullets: [
          'Estimate: 10B live URLs, ~10% re-crawled per month ⇒ ~1B fetches/month ≈ 400 pages/s average, 100k/s with spiky bursts — oversize for the burst, not the average',
          'Output: (url, content, outlinks, crawl_time) handed to a separate indexing pipeline — keep crawl and index decoupled',
        ],
      },
      {
        heading: 'System architecture (the four components)',
        bullets: [
          '**URL frontier (queue)**: a big distributed queue of pending URLs, sharded by hash(url) across N partitions; each partition has a consumer group of workers — this is the heart of the system',
          '**Dispatcher/scheduler**: assigns work, enforces per-domain budgets, applies freshness-based priority (fresh page > old page > discovered-new)',
          '**Fetch + parse workers**: stateless, disposable; claim a URL, fetch (with timeout), parse HTML, extract links + text, emit results',
          '**Link extractor & dedup service**: normalizes each outlink (strip fragments, canonical host, lowercase), checks a seen-set before enqueueing',
        ],
      },
      {
        heading: 'Deduplication',
        bullets: [
          'Exact URL dedup: a distributed Bloom filter (or a KV of URL → crawl metadata) answers "have we seen this URL, and when?" in O(1)',
          'Near-duplicate content: a SimHash or MinHash per page; if a new page’s fingerprint is within a small Hamming distance of a recently seen one, mark it a duplicate and skip indexing (optional phase)',
          'Normalization matters more than the hash: query-param ordering, trailing slashes, and tracking params all create false "new" URLs',
        ],
      },
      {
        heading: 'Politeness & retry',
        bullets: [
          'Per-domain token bucket in the dispatcher: a domain with budget 1 req/s gets at most that, regardless of how many workers exist; hot domains (with 100k queued URLs) naturally spread out',
          'robots.txt: fetch and cache it per domain; obey Crawl-delay and disallow rules',
          'Retries: exponential backoff with jitter; after N failures move the URL to a dead-letter queue for a later retry pass, never poison the main frontier',
        ],
      },
      {
        heading: 'Reliability & operations',
        bullets: [
          'Workers claim URLs with a lease (e.g. 60 s): if a worker dies, the lease expires and the URL is re-enqueued — at-least-once fetch, dedup on output',
          'Progress tracking: per-partition lag metrics; alert if a partition’s frontier depth grows (workers falling behind)',
          'Re-crawl policy stored with URL metadata: change frequency estimate per domain (news site vs. static docs) drives priority scoring',
        ],
      },
    ],
    followUps: [
      'A single site suddenly generates 50M new URLs in one day. What happens to your frontier, and what does the scheduler do?',
      'The interviewer asks: how do you crawl JavaScript-heavy pages where links only exist after rendering? What changes in the architecture?',
      'A competitor hammers your fetch pool with a crawl of your crawler’s user-agent. How do you detect and react?',
    ],
  },
];
