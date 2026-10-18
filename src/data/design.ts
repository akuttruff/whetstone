import type { DesignProblem } from '../types.ts'
import { DESIGN_PROBLEMS as BASE } from './design-base.ts'

const META: Record<string, { topic: string; pattern: string; difficulty: DesignProblem['difficulty'] }> = {
  'design-url-shortener': { topic: 'Core Services', pattern: 'Read-heavy key lookup with ID generation', difficulty: 'easy' },
  'design-rate-limiter': { topic: 'Core Services', pattern: 'Distributed counters and algorithms', difficulty: 'medium' },
  'design-kv-store': { topic: 'Storage', pattern: 'Partitioning, replication and consistency', difficulty: 'hard' },
  'design-chat-system': { topic: 'Real-Time', pattern: 'Persistent connections and fan-out', difficulty: 'medium' },
  'design-news-feed': { topic: 'Real-Time', pattern: 'Fan-out on write vs read', difficulty: 'medium' },
  'design-web-crawler': { topic: 'Data Pipelines', pattern: 'Distributed work queue with politeness', difficulty: 'medium' },
}

const fromDraft: DesignProblem[] = BASE.map((p) => {
  const meta = META[p.id]
  if (!meta) throw new Error(`design.ts: no META for ${p.id}`)
  return { ...p, track: 'design', source: 'builtin', ...meta }
})

const added: DesignProblem[] = [
  {
    id: 'design-distributed-cache',
    track: 'design',
    source: 'builtin',
    title: 'Distributed Cache',
    topic: 'Storage',
    pattern: 'Consistent hashing and cache coherence',
    difficulty: 'medium',
    prompt: [
      'Design a distributed in-memory cache (like Memcached or a Redis cluster) that sits in front of a relational database for a large web application. Clients `get(key)`, `set(key, value, ttl)` and `delete(key)`.',
      'Assume tens of millions of requests per second across the fleet, values up to 1 MB, and that the cache must survive individual node failures without a thundering herd on the database.',
    ],
    functional: [
      'get / set / delete with per-key TTL',
      'Horizontal scaling: adding or removing a node moves as few keys as possible',
      'Optional: atomic increments and compare-and-set for counters and locks',
    ],
    nonFunctional: [
      'Sub-millisecond p99 for a hit inside the datacenter',
      'Hit rate above 95% for the hot working set',
      'A node failure degrades hit rate gracefully rather than failing requests',
      'No stale reads beyond an agreed window after a write to the database',
    ],
    talkingPoints: [
      {
        heading: 'Placement',
        bullets: [
          'Consistent hashing with virtual nodes so each physical node owns many small ranges; losing one node reshuffles 1/N of keys',
          'Client-side routing (smart clients with the ring) vs a proxy tier (Twemproxy, Envoy); trade operational simplicity for an extra hop',
          'Hot keys: replicate the hottest keys to several nodes or add a tiny local in-process cache in front',
        ],
      },
      {
        heading: 'Coherence with the database',
        bullets: [
          'Cache-aside is the default: read-through on miss, delete (not update) the key on write to avoid ordering races',
          'Write-through and write-behind: when strong read-your-writes matters, and the durability cost of write-behind',
          'The classic race: a reader loads stale data after a concurrent writer deleted the key; mitigations are lease tokens (Facebook memcache) or short TTLs',
        ],
      },
      {
        heading: 'Eviction and memory',
        bullets: [
          'LRU vs LFU vs sampled-LRU (Redis); TTL expiry as lazy plus periodic sweeps',
          'Slab allocation to avoid fragmentation with mixed value sizes',
          'Value size limits and compression above a threshold',
        ],
      },
      {
        heading: 'Failure modes',
        bullets: [
          'Thundering herd on a popular miss: request coalescing (single-flight) and probabilistic early expiration',
          'Cold start after deploy: warming from a snapshot or gradual traffic ramp',
          'Replication for availability (primary/replica per shard) vs accepting a cold shard',
        ],
      },
    ],
    followUps: [
      'How would you invalidate a cached derived value when any of three source tables changes?',
      'A single key gets 2 million reads per second. What breaks and what do you do?',
      'How do you measure and alert on hit rate per key prefix?',
    ],
  },
  {
    id: 'design-message-queue',
    track: 'design',
    source: 'builtin',
    title: 'Message Queue / Event Streaming Platform',
    topic: 'Data Pipelines',
    pattern: 'Partitioned log with consumer groups',
    difficulty: 'hard',
    prompt: [
      'Design a durable message broker like Kafka or Pub/Sub: producers publish to topics, consumer groups read independently, and messages must not be lost once acknowledged.',
      'Target millions of messages per second across topics, retention of days, and consumers that can replay from any point.',
    ],
    functional: [
      'Publish to a topic with an optional partition key; ordering guaranteed per key',
      'Consumer groups: each message delivered to one consumer per group; multiple groups each get everything',
      'Replay from an offset or timestamp; retention by time and size',
      'At-least-once delivery, with the building blocks for effectively-once',
    ],
    nonFunctional: [
      'Durable once acknowledged (survives broker loss)',
      'Horizontally scalable throughput by adding partitions and brokers',
      'Consumer lag observable; backpressure rather than data loss when consumers fall behind',
    ],
    talkingPoints: [
      {
        heading: 'Core abstraction',
        bullets: [
          'An append-only log per partition; offsets are the consumer\'s cursor, stored separately from the data',
          'Partition count sets the parallelism ceiling for a consumer group; discuss choosing and later increasing it',
          'Sequential disk I/O and zero-copy sends are why a log beats a traditional queue at throughput',
        ],
      },
      {
        heading: 'Durability and replication',
        bullets: [
          'Leader/follower replication per partition; in-sync replica set; acks=all vs acks=1 trade latency for safety',
          'Leader election via a coordinator (ZooKeeper historically, Raft-based KRaft now)',
          'Unclean leader election: availability vs losing acknowledged writes',
        ],
      },
      {
        heading: 'Delivery semantics',
        bullets: [
          'At-least-once from retries plus consumer-side idempotency (dedupe key) is the practical "exactly once"',
          'Idempotent producers (sequence numbers) and transactional writes across partitions',
          'Dead-letter topics and poison-message handling',
        ],
      },
      {
        heading: 'Operations',
        bullets: [
          'Consumer rebalancing and its pauses; sticky assignment',
          'Retention, compaction (keep latest per key) for changelog topics',
          'Schema registry and compatibility rules so producers and consumers evolve independently',
        ],
      },
    ],
    followUps: [
      'A consumer group is 3 hours behind. How do you find out, and what are your options?',
      'How do you guarantee ordering for a user\'s events when the user is reassigned to a new partition?',
      'When would you choose a simple queue (SQS, RabbitMQ) over a log?',
    ],
  },
  {
    id: 'design-typeahead',
    track: 'design',
    source: 'builtin',
    title: 'Search Typeahead',
    topic: 'Search & Retrieval',
    pattern: 'Precomputed prefix index with ranking',
    difficulty: 'medium',
    prompt: [
      'Design the autocomplete box for a large search product: as the user types, return the top 10 suggestions for the prefix within tens of milliseconds, ranked by popularity and personal history.',
      'Assume billions of queries per day feeding the popularity data and a suggestion corpus of hundreds of millions of distinct strings.',
    ],
    functional: [
      'Top-k suggestions for a prefix, updated as the user types',
      'Ranking by global frequency, recency and (optionally) the user\'s own history',
      'Freshness: trending queries appear within minutes; blocked terms removed quickly',
    ],
    nonFunctional: [
      'p99 under 50 ms end to end, including network',
      'Read QPS orders of magnitude above write QPS; writes can be batched',
      'Graceful degradation: serve global results if personalisation is unavailable',
    ],
    talkingPoints: [
      {
        heading: 'Data structure',
        bullets: [
          'A trie where each node caches its top-k completions; lookup is O(prefix) with no ranking at query time',
          'Memory: hundreds of millions of strings do not fit one machine with per-node top-k; shard by prefix range',
          'Alternatives: sorted arrays with binary search per shard, or an inverted index (Elasticsearch completion suggester)',
        ],
      },
      {
        heading: 'Building and refreshing',
        bullets: [
          'Offline: aggregate query logs (stream processing) into counts with time decay, rebuild the trie, swap in atomically',
          'Trending: a fast path that bumps recent counts in a small hot trie merged at query time',
          'Blocklist applied at build and at serve time',
        ],
      },
      {
        heading: 'Serving',
        bullets: [
          'Client: debounce keystrokes, cancel stale requests, cache per-prefix results in the browser',
          'Edge/CDN caching of the most common prefixes (1-2 characters) which dominate traffic',
          'Personalisation layer merges the user\'s recent queries from a KV store',
        ],
      },
    ],
    followUps: [
      'How do you handle typos (fuzzy prefix matching) without blowing up latency?',
      'Multi-language input and tokenisation: what changes?',
      'How would you A/B test a ranking change here?',
    ],
  },
  {
    id: 'design-notifications',
    track: 'design',
    source: 'builtin',
    title: 'Notification System',
    topic: 'Core Services',
    pattern: 'Fan-out with per-channel delivery and dedupe',
    difficulty: 'medium',
    prompt: [
      'Design a service that sends notifications to users over push (iOS/Android), email and SMS. Producers across the company call it with an event; it decides who gets what, on which channel, and delivers reliably.',
      'Assume tens of millions of notifications a day, bursts of millions in minutes (a product launch), and strict user preferences and rate limits.',
    ],
    functional: [
      'Send to a user or audience with a template and payload; per-channel rendering',
      'User preferences: opt-out per category and channel, quiet hours, digest batching',
      'Delivery tracking: sent, delivered, opened; retries on transient failure',
      'Idempotency: the same event submitted twice sends once',
    ],
    nonFunctional: [
      'No lost notifications once accepted',
      'Time-sensitive alerts within seconds; marketing within minutes',
      'Third-party providers (APNs, FCM, Twilio, SES) can fail or throttle independently',
    ],
    talkingPoints: [
      {
        heading: 'Pipeline',
        bullets: [
          'API accepts and validates, writes to a durable queue, returns 202 with an id',
          'Workers resolve audience, apply preferences and rate limits, render templates, enqueue per channel',
          'Per-channel senders with provider-specific batching, backoff and circuit breakers',
        ],
      },
      {
        heading: 'Correctness',
        bullets: [
          'Idempotency keys stored with a TTL to drop duplicates from producer retries',
          'Priority queues so an alert is never stuck behind a marketing blast',
          'Device token lifecycle: registration, rotation, pruning after invalid-token responses',
        ],
      },
      {
        heading: 'Scale and observability',
        bullets: [
          'Audience of millions: fan out in chunks, use a KV lookup for preferences, avoid per-user DB hits',
          'Track per-provider success rate and latency; route around a degraded provider',
          'Analytics events for sent/delivered/opened feeding a warehouse',
        ],
      },
    ],
    followUps: [
      'A user has three devices. What does "delivered" mean and when do you stop retrying?',
      'How do you prevent a buggy producer from spamming every user?',
      'Design the digest: batch low-priority notifications into one email per day.',
    ],
  },
  {
    id: 'design-payments',
    track: 'design',
    source: 'builtin',
    title: 'Payment Processing',
    topic: 'Correctness & Consistency',
    pattern: 'Idempotent state machine with reconciliation',
    difficulty: 'hard',
    prompt: [
      'Design the payment service for an online store: charge a customer via an external processor (Stripe, Adyen), record it, and never double-charge or lose a charge, even when networks fail mid-request.',
      'Assume thousands of payments per second at peak, multiple processors, and auditors who need an exact ledger.',
    ],
    functional: [
      'Create a payment for an order; capture, refund, partial refund',
      'Query payment status; webhooks from processors update state',
      'Ledger: double-entry records of every money movement',
      'Reconciliation against processor statements',
    ],
    nonFunctional: [
      'Exactly-once effect on money despite at-least-once messaging',
      'Strong consistency for a single payment\'s state; auditable history',
      'Processor outages must not lose intent: retry later, never charge twice',
    ],
    talkingPoints: [
      {
        heading: 'Idempotency',
        bullets: [
          'Client-supplied idempotency key per payment attempt, stored with the response; replays return the stored result',
          'Pass the same key to the processor so their side dedupes too',
          'The unknown-outcome case: timeout after sending to the processor; mark pending and resolve by querying, never by retrying blind',
        ],
      },
      {
        heading: 'State and storage',
        bullets: [
          'Payment as an explicit state machine (created, authorised, captured, failed, refunded) with transitions in a transaction',
          'Relational DB with serialisable or row-locked transitions; events appended to an outbox in the same transaction',
          'Ledger entries immutable; balances derived, never edited',
        ],
      },
      {
        heading: 'Integration',
        bullets: [
          'Webhooks: verify signatures, dedupe by event id, apply out-of-order events by comparing state',
          'Reconciliation job diffs internal ledger against processor reports and raises exceptions for humans',
          'PCI scope: tokenise cards at the edge so raw card data never touches your servers',
        ],
      },
    ],
    followUps: [
      'The processor returns 500 after charging the card. Walk through exactly what happens.',
      'How do you handle currency and rounding across a partial refund?',
      'A second processor is added for failover. What has to change?',
    ],
  },
  {
    id: 'design-observability',
    track: 'design',
    source: 'builtin',
    title: 'Metrics and Logging Pipeline',
    topic: 'Data Pipelines',
    pattern: 'High-volume ingestion with time-series storage',
    difficulty: 'medium',
    prompt: [
      'Design the observability platform for a company with thousands of services: collect metrics, logs and traces, store them, and let engineers query and alert on them.',
      'Assume tens of millions of metric samples per second, terabytes of logs per day, and alert evaluation that must be timely and reliable during an incident when everything is noisiest.',
    ],
    functional: [
      'Ingest metrics (counters, gauges, histograms with labels), structured logs and traces',
      'Query by label/time range; dashboards; alert rules with routing',
      'Retention tiers: high-resolution recent data, downsampled history',
    ],
    nonFunctional: [
      'Ingestion never blocks the services being observed',
      'Alerting latency under a minute; the pipeline is itself monitored',
      'Cost control: cardinality limits, sampling for traces, log volume quotas',
    ],
    talkingPoints: [
      {
        heading: 'Collection',
        bullets: [
          'Agents or sidecars (OpenTelemetry collector) batch and compress; push vs pull (Prometheus scraping) trade-offs',
          'Backpressure: local buffering with bounded size and drop policies, never unbounded memory in the app',
          'Trace context propagation across services; head-based vs tail-based sampling',
        ],
      },
      {
        heading: 'Storage',
        bullets: [
          'Time-series DB with label-indexed series; the cardinality explosion from a user-id label',
          'Logs: columnar/object storage with an index on a few fields; full-text indexing is the expensive option',
          'Downsampling and tiering to object storage; separate hot and cold query paths',
        ],
      },
      {
        heading: 'Query and alerting',
        bullets: [
          'Alert evaluation as a streaming job over recent data, isolated from ad-hoc queries',
          'Multi-window burn-rate alerts on SLOs rather than threshold alerts on raw metrics',
          'Correlation: jump from a metric spike to the traces and logs in that window',
        ],
      },
    ],
    followUps: [
      'A team adds a label with 10 million distinct values. What happens and how do you guard against it?',
      'How would you keep alerting working when the storage cluster is down?',
      'What would you sample, and how do you explain missing traces to engineers?',
    ],
  },
  {
    id: 'design-llm-gateway',
    track: 'design',
    source: 'builtin',
    title: 'LLM Inference Gateway',
    topic: 'AI Systems',
    pattern: 'Routing, batching and caching for expensive stateful compute',
    difficulty: 'hard',
    prompt: [
      'Design the platform layer through which every product at a company calls large language models: a gateway in front of hosted APIs and self-hosted models that handles routing, rate limits, cost control, caching, observability and safety.',
      'Assume thousands of requests per second, streaming responses, prompts of up to 100k tokens, and strict budgets per team.',
    ],
    functional: [
      'OpenAI-compatible API with streaming; route by model name, cost, latency or capability',
      'Per-team quotas, budgets and priority; fallbacks when a provider fails',
      'Prompt/response logging with redaction; evaluation hooks',
      'Caching of identical and near-identical requests; prompt-prefix caching for shared system prompts',
    ],
    nonFunctional: [
      'Time-to-first-token p95 within a bounded overhead of the upstream',
      'No request lost on provider failure without a clear error',
      'Cost attribution accurate to the token',
    ],
    talkingPoints: [
      {
        heading: 'Serving self-hosted models',
        bullets: [
          'Continuous batching and paged KV cache (vLLM-style) to keep GPUs busy; why batch size trades latency for throughput',
          'Prefix caching: identical system prompts share KV state; route requests with the same prefix to the same replica',
          'Capacity planning in tokens per second, not requests; long prompts dominate prefill cost',
        ],
      },
      {
        heading: 'Gateway behaviour',
        bullets: [
          'Token-bucket limits per team in tokens, not requests; admission control that sheds low-priority traffic first',
          'Retries with budgets and idempotency; streaming makes mid-stream failure handling explicit',
          'Semantic cache (embedding similarity) for FAQ-like traffic; exact cache keyed on normalised request',
        ],
      },
      {
        heading: 'Safety and quality',
        bullets: [
          'Input/output classifiers for policy, PII redaction before logging, prompt-injection boundaries for tool use',
          'Offline evals on logged traffic before changing routing or models; canary a new model on a percentage',
          'Observability: tokens, latency per phase, cost, refusal rate, per-prompt-template dashboards',
        ],
      },
    ],
    followUps: [
      'A provider degrades to 10x latency. How does the gateway notice and what does it do?',
      'How would you implement a budget that resets monthly without a central lock on every request?',
      'What do you log, for how long, and who can read it?',
    ],
  },
  {
    id: 'design-rag-search',
    track: 'design',
    source: 'builtin',
    title: 'Document Q&A With Retrieval (RAG)',
    topic: 'AI Systems',
    pattern: 'Ingestion pipeline plus hybrid retrieval',
    difficulty: 'medium',
    prompt: [
      'Design a system that answers employee questions over a company\'s internal documents (wikis, tickets, PDFs, chat) using an LLM with retrieval. Answers must cite sources and respect document permissions.',
      'Assume millions of documents that change daily, thousands of users, and that a wrong but confident answer is worse than no answer.',
    ],
    functional: [
      'Ingest and keep documents fresh from many sources; chunk, embed, index',
      'Query: retrieve relevant chunks the user is allowed to see, generate an answer with citations',
      'Feedback loop: thumbs up/down, "wrong source" reports',
    ],
    nonFunctional: [
      'Permissions enforced at retrieval time, never post-hoc',
      'Answer latency of a few seconds with streaming',
      'Measurable quality: retrieval recall and answer faithfulness tracked over time',
    ],
    talkingPoints: [
      {
        heading: 'Ingestion',
        bullets: [
          'Connectors with change detection (webhooks or polling), a document store of record, chunking that respects structure (headings, tables)',
          'Embeddings in a vector index plus a keyword index (BM25); hybrid retrieval beats either alone',
          'Metadata: source, ACL, timestamps, for filtering and freshness ranking',
        ],
      },
      {
        heading: 'Query path',
        bullets: [
          'Query rewriting, retrieve top-N from both indexes, rerank with a cross-encoder, pass top-k with citations into the prompt',
          'ACL filtering inside the vector query (pre-filter), not after the fact, so recall is not silently destroyed',
          'Grounding: instruct the model to answer only from context and say "I don\'t know"; verify citations exist',
        ],
      },
      {
        heading: 'Evaluation and operations',
        bullets: [
          'A golden set of questions with known sources; measure recall@k and faithfulness with an LLM judge plus human review',
          'Re-embedding on model upgrade is a full reindex: version the index and swap',
          'Cost: cache embeddings per chunk hash; batch embedding jobs',
        ],
      },
    ],
    followUps: [
      'A document\'s permissions change. How quickly is that reflected and how?',
      'Users complain the answers are stale. Diagnose.',
      'How would you add structured data (a SQL database) as a source?',
    ],
  },
  {
    id: 'design-multi-region',
    track: 'design',
    source: 'builtin',
    title: 'Multi-Region Active-Active Service',
    topic: 'Correctness & Consistency',
    pattern: 'Data residency, replication and conflict handling',
    difficulty: 'hard',
    prompt: [
      'Take a single-region user-profile and settings service and make it serve users from three regions with low latency, survive a full region outage, and keep EU user data in the EU.',
      'Assume reads dominate, writes are per-user and rarely contended, and some settings must be read-your-writes.',
    ],
    functional: [
      'Read and update a user\'s profile from any region',
      'EU residents\' data stored only in EU regions',
      'Failover: a region loss redirects traffic with bounded data loss',
    ],
    nonFunctional: [
      'Local-region read latency; write latency acceptable up to one cross-region round trip',
      'Clear, documented consistency guarantees per operation',
      'Operable: deploy and roll back per region',
    ],
    talkingPoints: [
      {
        heading: 'Data placement',
        bullets: [
          'Home region per user (by residency rule), replicated asynchronously to others for reads; EU users not replicated outside',
          'Routing by user to their home region for writes; GeoDNS/anycast for reads',
          'Alternative: a globally consistent database (Spanner, CockroachDB) at the cost of write latency and price',
        ],
      },
      {
        heading: 'Consistency',
        bullets: [
          'Read-your-writes: route a user to their home region briefly after a write, or pass a version token the replica must reach',
          'Conflicts under active-active writes: last-writer-wins with hybrid logical clocks, or per-field CRDTs',
          'Idempotent, versioned writes so retries across regions are safe',
        ],
      },
      {
        heading: 'Failure',
        bullets: [
          'Region outage: promote a replica for non-EU users; EU users degrade to read-only unless a second EU region exists',
          'Replication lag monitoring; failover runbooks tested regularly',
          'Split-brain prevention: a single source of truth for which region is home',
        ],
      },
    ],
    followUps: [
      'A user moves from the US to the EU. Walk through migrating their data.',
      'Which operations would you refuse to make active-active, and why?',
      'How do you test a region failover without scaring customers?',
    ],
  },
  {
    id: 'design-lld-parking-lot',
    track: 'design',
    source: 'builtin',
    title: 'Low-Level Design: Parking Garage',
    topic: 'Object-Oriented Design',
    pattern: 'Entities, invariants and extensibility',
    difficulty: 'easy',
    prompt: [
      'Design the classes and interfaces for a multi-level parking garage: vehicles of different sizes, spots of different sizes, entry and exit gates that issue and settle tickets, and pricing that varies by duration and vehicle type.',
      'This is a code-level design question: expect to write interfaces in your language and discuss where the invariants live.',
    ],
    functional: [
      'Park a vehicle in the nearest suitable spot; reject when full',
      'Issue a ticket on entry; compute the fee and free the spot on exit',
      'Support new vehicle and spot types and new pricing rules without rewriting core classes',
    ],
    nonFunctional: [
      'Correct under concurrent entries at several gates',
      'Testable: pricing and allocation isolated from I/O',
    ],
    talkingPoints: [
      {
        heading: 'Entities',
        bullets: [
          'Vehicle (size), Spot (size, level, occupied), Level, Garage, Ticket (vehicle, spot, enteredAt), Gate',
          'Prefer composition and small interfaces over a deep inheritance tree; a vehicle "fits" a spot via a compatibility rule, not subclasses',
        ],
      },
      {
        heading: 'Allocation and invariants',
        bullets: [
          'A SpotAllocator strategy (nearest, by level, by size) kept separate from Garage so it can change',
          'Invariant: a spot is occupied by at most one vehicle; enforce in one place with a lock or an atomic claim',
          'Availability counts per size per level for O(1) "is there room" answers',
        ],
      },
      {
        heading: 'Pricing',
        bullets: [
          'PricingStrategy interface; rules composed (hourly, daily cap, EV surcharge) and unit-tested with injected clocks',
          'Money as integer cents; never floats',
        ],
      },
    ],
    followUps: [
      'Add reservations: a spot held until a time. What changes?',
      'Two gates admit cars for the last spot at the same instant. Show the code path that prevents double allocation.',
      'How do you persist state and recover after a crash?',
    ],
  },
]

export const DESIGN_PROBLEMS: DesignProblem[] = [...fromDraft, ...added]
