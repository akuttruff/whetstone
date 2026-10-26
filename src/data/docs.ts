/**
 * Further reading for the Knowledge track: the reference page behind each
 * question, MDN wherever MDN covers the ground, the language's or tool's own
 * documentation where it does not. Kept apart from the questions so the
 * question bank stays readable and a test can check every key.
 */

export interface DocLink {
  label: string
  url: string
}

const mdn = (label: string, path: string): DocLink => ({ label, url: `https://developer.mozilla.org/en-US/docs/${path}` })
const node = (label: string, path: string): DocLink => ({ label, url: `https://nodejs.org/${path}` })
const ts = (label: string, path: string): DocLink => ({ label, url: `https://www.typescriptlang.org/docs/handbook/${path}` })
const react = (label: string, path: string): DocLink => ({ label, url: `https://react.dev/learn/${path}` })
const owasp = (label: string, url: string): DocLink => ({ label, url })
const rb = (label: string, path: string): DocLink => ({ label, url: `https://docs.ruby-lang.org/en/3.4/${path}` })
const rails = (label: string, path: string): DocLink => ({ label, url: `https://guides.rubyonrails.org/${path}` })
const jdk = (label: string, path: string): DocLink => ({ label, url: `https://docs.oracle.com/en/java/javase/21/${path}` })
const devjava = (label: string, path: string): DocLink => ({ label, url: `https://dev.java/learn/${path}` })
const rust = (label: string, path: string): DocLink => ({ label, url: `https://doc.rust-lang.org/${path}` })
const rustbook = (label: string, path: string): DocLink => rust(label, `book/${path}`)
const rststd = (label: string, path: string): DocLink => rust(label, `std/${path}`)
const docsrs = (label: string, path: string): DocLink => ({ label, url: `https://docs.rs/${path}` })
const tokio = (label: string, path: string): DocLink => ({ label, url: `https://tokio.rs/tokio/${path}` })
const link = (label: string, url: string): DocLink => ({ label, url })

/** Where a whole topic's reading starts, shown at the foot of its primer. */
export const TOPIC_DOCS: Record<string, DocLink[]> = {
  'TypeScript & JavaScript': [
    mdn('JavaScript Guide', 'Web/JavaScript/Guide'),
    mdn('JavaScript Reference', 'Web/JavaScript/Reference'),
    ts('TypeScript Handbook', 'intro.html'),
    node('Node.js documentation', 'api/'),
  ],
  'Ruby': [
    rb('Ruby documentation', 'index.html'),
    rails('Rails Guides', ''),
    link('Ruby language reference', 'https://ruby-doc.org/'),
  ],
  'Java': [
    jdk('Java SE 21 documentation', 'index.html'),
    devjava('Learn Java (dev.java)', ''),
    link('OpenJDK', 'https://openjdk.org/'),
  ],
  'Rust': [
    rustbook('The Rust Programming Language', ''),
    rust('The Rust Reference', 'reference/'),
    rststd('Standard library documentation', ''),
    rust('Rust by Example', 'rust-by-example/'),
    rust('The Cargo Book', 'cargo/'),
  ],
  'Web & HTTP': [
    mdn('HTTP', 'Web/HTTP'),
    mdn('Web security', 'Web/Security'),
    mdn('Web APIs', 'Web/API'),
  ],
  'Performance': [
    mdn('Web performance', 'Web/Performance'),
    mdn('Performance API', 'Web/API/Performance_API'),
  ],
  'Testing & Quality': [
    mdn('Cross-browser testing', 'Learn_web_development/Extensions/Testing'),
  ],
}

/** The pages behind one question, by its id. */
export const PROBLEM_DOCS: Record<string, DocLink[]> = {
  // ── Ruby ────────────────────────────────────────────────────────────
  'rb-gvl-concurrency': [rb('Thread', 'Thread.html'), rb('Fiber', 'Fiber.html'), rb('Ractor', 'ractor_md.html')],
  'rb-blocks-procs-lambdas': [rb('Proc', 'Proc.html'), rb('Methods: blocks and yield', 'syntax/methods_rdoc.html')],
  'rb-method-lookup': [rb('Module', 'Module.html'), rb('Refinements', 'syntax/refinements_rdoc.html'), rb('BasicObject#method_missing', 'BasicObject.html#method-i-method_missing')],
  'rb-duck-typing-types': [link('RBS', 'https://github.com/ruby/rbs'), link('Sorbet', 'https://sorbet.org/docs/overview'), link('Steep', 'https://github.com/soutaro/steep')],
  'rb-exceptions': [rb('Exceptions', 'syntax/exceptions_rdoc.html'), rb('Exception', 'Exception.html'), rb('StandardError', 'StandardError.html')],
  'rb-memory-gc': [rb('GC', 'GC.html'), rb('ObjectSpace', 'ObjectSpace.html'), link('memory_profiler', 'https://github.com/SamSaffron/memory_profiler')],
  'rb-require-bundler': [rb('Kernel#require', 'Kernel.html#method-i-require'), link('Bundler', 'https://bundler.io/'), link('Zeitwerk', 'https://github.com/fxn/zeitwerk')],
  'rb-rack-request-lifecycle': [link('Rack specification', 'https://github.com/rack/rack/blob/main/SPEC.rdoc'), rails('Rails on Rack', 'rails_on_rack.html'), link('Puma', 'https://github.com/puma/puma')],
  'rb-enumerable-lazy': [rb('Enumerable', 'Enumerable.html'), rb('Enumerator', 'Enumerator.html'), rb('Enumerator::Lazy', 'Enumerator/Lazy.html')],
  'rb-metaprogramming': [rb('Module#define_method', 'Module.html#method-i-define_method'), rb('BasicObject#instance_eval', 'BasicObject.html#method-i-instance_eval'), rb('Object#send', 'Object.html#method-i-send')],
  'rb-activerecord-performance': [rails('Active Record Query Interface', 'active_record_querying.html'), link('Bullet', 'https://github.com/flyerhzm/bullet')],
  'rb-testing': [link('RSpec', 'https://rspec.info/documentation/'), link('Minitest', 'https://docs.seattlerb.org/minitest/'), rails('Testing Rails Applications', 'testing.html')],
  'rb-mutability-frozen': [rb('Object#freeze', 'Object.html#method-i-freeze'), rb('Data', 'Data.html'), rb('Struct', 'Struct.html')],
  'rb-performance-tooling': [rb('YJIT', 'yjit/yjit_md.html'), link('StackProf', 'https://github.com/tmm1/stackprof'), link('benchmark-ips', 'https://github.com/evanphx/benchmark-ips')],
  // ── Java ────────────────────────────────────────────────────────────
  'java-jvm-memory-gc': [jdk('Garbage collection tuning', 'gctuning/introduction-garbage-collection-tuning.html'), jdk('G1 garbage collector', 'gctuning/garbage-first-g1-garbage-collector1.html'), jdk('ZGC', 'gctuning/z-garbage-collector.html')],
  'java-concurrency-jmm': [jdk('Java Language Specification: memory model', 'docs/specs/jls/jls-17.html#jls-17.4'), jdk('Virtual threads', 'core/virtual-threads.html'), link('Concurrency (Java Tutorials)', 'https://docs.oracle.com/javase/tutorial/essential/concurrency/')],
  'java-generics-erasure': [devjava('Generics', 'generics/'), jdk('Records', 'language/records.html'), jdk('Sealed classes', 'language/sealed-classes-and-interfaces.html')],
  'java-exceptions': [devjava('Exceptions', 'exceptions/'), jdk('Optional', 'docs/api/java.base/java/util/Optional.html'), jdk('AutoCloseable', 'docs/api/java.base/java/lang/AutoCloseable.html')],
  'java-equals-hashcode-immutability': [jdk('Object#equals', 'docs/api/java.base/java/lang/Object.html#equals(java.lang.Object)'), jdk('Records', 'language/records.html'), devjava('Using records', 'records/')],
  'java-collections-internals': [jdk('HashMap', 'docs/api/java.base/java/util/HashMap.html'), jdk('ConcurrentHashMap', 'docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html'), devjava('Collections', 'api/collections-framework/')],
  'java-streams-lambdas': [link('Streams (Java Tutorials)', 'https://docs.oracle.com/javase/tutorial/collections/streams/'), jdk('java.util.stream', 'docs/api/java.base/java/util/stream/package-summary.html'), devjava('Lambda expressions', 'lambdas/')],
  'java-classloading-build': [jdk('ClassLoader', 'docs/api/java.base/java/lang/ClassLoader.html'), devjava('Modules', 'modules/'), link('Gradle dependency resolution', 'https://docs.gradle.org/current/userguide/dependency_resolution.html')],
  'java-spring-request-lifecycle': [link('Spring Web MVC', 'https://docs.spring.io/spring-framework/reference/web/webmvc.html'), link('Spring transaction management', 'https://docs.spring.io/spring-framework/reference/data-access/transaction.html'), link('Spring dependency injection', 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html')],
  'java-jit-performance': [jdk('JIT compiler', 'vm/java-hotspot-virtual-machine-performance-enhancements.html'), jdk('Flight Recorder', 'jfapi/why-use-jfr-api.html'), link('async-profiler', 'https://github.com/async-profiler/async-profiler')],
  'java-testing': [link('JUnit 5 user guide', 'https://junit.org/junit5/docs/current/user-guide/'), link('Mockito', 'https://site.mockito.org/'), link('Testcontainers', 'https://java.testcontainers.org/')],
  'java-serialization-json': [link('Jackson', 'https://github.com/FasterXML/jackson'), jdk('java.time', 'docs/api/java.base/java/time/package-summary.html'), jdk('ObjectInputFilter', 'docs/api/java.base/java/io/ObjectInputFilter.html')],
  'java-reactive-backpressure': [link('Reactive Streams specification', 'https://www.reactive-streams.org/'), jdk('java.util.concurrent.Flow', 'docs/api/java.base/java/util/concurrent/Flow.html'), link('Project Reactor reference', 'https://projectreactor.io/docs/core/release/reference/')],
  'java-memory-leaks': [jdk('jcmd', 'docs/specs/man/jcmd.html'), link('Eclipse Memory Analyzer', 'https://eclipse.dev/mat/'), link('Caffeine', 'https://github.com/ben-manes/caffeine')],
  // ── Rust ────────────────────────────────────────────────────────────
  'rust-ownership-moves': [rustbook('What is ownership?', 'ch04-01-what-is-ownership.html'), rustbook('References and borrowing', 'ch04-02-references-and-borrowing.html'), rust('Rust by Example: ownership and moves', 'rust-by-example/scope/move.html')],
  'rust-borrow-checker-errors': [rust('E0502: mutable borrow while borrowed', 'error_codes/E0502.html'), rust('E0499: two mutable borrows', 'error_codes/E0499.html'), rust('Rustonomicon: splitting borrows', 'nomicon/borrow-splitting.html')],
  'rust-lifetimes-variance': [rustbook('Validating references with lifetimes', 'ch10-03-lifetime-syntax.html'), rust('Reference: lifetime elision', 'reference/lifetime-elision.html'), rust('Rustonomicon: subtyping and variance', 'nomicon/subtyping.html')],
  'rust-traits-generics-dyn': [rustbook('Traits: defining shared behavior', 'ch10-02-traits.html'), rustbook('Using trait objects', 'ch18-02-trait-objects.html'), rust('Reference: traits and dyn compatibility', 'reference/items/traits.html')],
  'rust-associated-types-coherence': [rustbook('Advanced traits', 'ch20-02-advanced-traits.html'), rust('Reference: implementations and the orphan rules', 'reference/items/implementations.html'), rststd('Iterator::Item', 'iter/trait.Iterator.html')],
  'rust-enums-option-result-matching': [rustbook('Enums and pattern matching', 'ch06-00-enums.html'), rststd('Option', 'option/enum.Option.html'), rust('Reference: patterns', 'reference/patterns.html')],
  'rust-error-handling-design': [rustbook('Recoverable errors with Result', 'ch09-02-recoverable-errors-with-result.html'), rststd('std::error::Error', 'error/trait.Error.html'), docsrs('thiserror', 'thiserror')],
  'rust-smart-pointers-interior-mutability': [rustbook('Smart pointers', 'ch15-00-smart-pointers.html'), rststd('std::cell', 'cell/index.html'), rststd('Mutex', 'sync/struct.Mutex.html')],
  'rust-send-sync': [rust('Rustonomicon: Send and Sync', 'nomicon/send-and-sync.html'), rststd('Send', 'marker/trait.Send.html'), rststd('Sync', 'marker/trait.Sync.html')],
  'rust-threads-channels-atomics': [rustbook('Using threads', 'ch16-01-threads.html'), rststd('std::sync::atomic', 'sync/atomic/index.html'), link('Rust Atomics and Locks (Mara Bos)', 'https://marabos.nl/atomics/')],
  'rust-async-model': [rustbook('Async and await', 'ch17-00-async-await.html'), rststd('Future', 'future/trait.Future.html'), rststd('std::pin', 'pin/index.html')],
  'rust-async-in-practice': [tokio('Tokio tutorial: shared state', 'tutorial/shared-state'), tokio('Tokio tutorial: select', 'tutorial/select'), docsrs('tokio::task::spawn_blocking', 'tokio/latest/tokio/task/fn.spawn_blocking.html')],
  'rust-iterators-closures': [rustbook('Closures', 'ch13-01-closures.html'), rustbook('Iterators', 'ch13-02-iterators.html'), rststd('Iterator', 'iter/trait.Iterator.html')],
  'rust-strings-utf8': [rustbook('Storing UTF-8 text with strings', 'ch08-02-strings.html'), rststd('String', 'string/struct.String.html'), rststd('str', 'primitive.str.html')],
  'rust-collections': [rststd('std::collections', 'collections/index.html'), rststd('HashMap', 'collections/struct.HashMap.html'), rststd('hash_map::Entry', 'collections/hash_map/enum.Entry.html')],
  'rust-unsafe-ffi-soundness': [rustbook('Unsafe Rust', 'ch20-01-unsafe-rust.html'), rust('Reference: behavior considered undefined', 'reference/behavior-considered-undefined.html'), rust('Rustonomicon: FFI', 'nomicon/ffi.html')],
  'rust-memory-layout-drop': [rust('Reference: type layout', 'reference/type-layout.html'), rststd('Drop', 'ops/trait.Drop.html'), rststd('Copy', 'marker/trait.Copy.html')],
  'rust-modules-cargo-semver': [rustbook('Packages, crates and modules', 'ch07-00-managing-growing-projects-with-packages-crates-and-modules.html'), rust('Cargo: features', 'cargo/reference/features.html'), rust('Cargo: semver compatibility', 'cargo/reference/semver.html')],
  'rust-macros': [rustbook('Macros', 'ch20-05-macros.html'), rust('Reference: macros by example', 'reference/macros-by-example.html'), rust('Reference: procedural macros', 'reference/procedural-macros.html')],
  'rust-testing-benchmarking': [rustbook('Writing automated tests', 'ch11-00-testing.html'), link('proptest book', 'https://proptest-rs.github.io/proptest/'), link('criterion.rs user guide', 'https://bheisler.github.io/criterion.rs/book/')],
  'rust-performance-profiling': [rust('Cargo: profiles', 'cargo/reference/profiles.html'), link('The Rust Performance Book', 'https://nnethercote.github.io/perf-book/'), rust('rustc: profile-guided optimization', 'rustc/profile-guided-optimization.html')],
  'rust-api-design-idioms': [link('Rust API Guidelines', 'https://rust-lang.github.io/api-guidelines/'), rststd('From', 'convert/trait.From.html'), link('Rust design patterns: newtype', 'https://rust-unofficial.github.io/patterns/patterns/behavioural/newtype.html')],
  'rust-serde': [link('Serde', 'https://serde.rs/'), link('Serde: attributes', 'https://serde.rs/attributes.html'), link('Serde: data model', 'https://serde.rs/data-model.html')],
  'rust-axum-request-lifecycle': [docsrs('axum', 'axum/latest/axum/'), docsrs('tower::Service', 'tower/latest/tower/trait.Service.html'), docsrs('tower-http', 'tower-http')],
  'rust-editions-2024': [rust('Edition Guide: Rust 2024', 'edition-guide/rust-2024/index.html'), rust('Edition Guide: what are editions?', 'edition-guide/editions/index.html'), link('Announcing Rust 1.85.0 and Rust 2024', 'https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/')],
  'rust-when-wrong-tool-interop': [link('PyO3 user guide', 'https://pyo3.rs/'), link('wasm-bindgen guide', 'https://rustwasm.github.io/docs/wasm-bindgen/'), link('cxx: safe interop between Rust and C++', 'https://cxx.rs/')],
  'rust-compile-times-dev-workflow': [link('Rust Performance Book: compile times', 'https://nnethercote.github.io/perf-book/compile-times.html'), rust('cargo check', 'cargo/commands/cargo-check.html'), link('sccache', 'https://github.com/mozilla/sccache')],
  // ── TypeScript & JavaScript ──────────────────────────────────────────
  'ts-event-loop': [
    mdn('JavaScript execution model', 'Web/JavaScript/Reference/Execution_model'),
    mdn('Microtask guide', 'Web/API/HTML_DOM_API/Microtask_guide'),
    mdn('queueMicrotask()', 'Web/API/Window/queueMicrotask'),
  ],
  'ts-structural-typing': [
    ts('Type compatibility', 'type-compatibility.html'),
    ts('Everyday types', '2/everyday-types.html'),
  ],
  'ts-generics-variance': [
    ts('Generics', '2/generics.html'),
    ts('Variance annotations', '2/generics.html#variance-annotations'),
    ts('Conditional types', '2/conditional-types.html'),
  ],
  'ts-async-patterns': [
    mdn('Using promises', 'Web/JavaScript/Guide/Using_promises'),
    mdn('async function', 'Web/JavaScript/Reference/Statements/async_function'),
    mdn('AbortController', 'Web/API/AbortController'),
    mdn('Promise.allSettled()', 'Web/JavaScript/Reference/Global_Objects/Promise/allSettled'),
  ],
  'ts-memory-perf': [
    mdn('Memory management', 'Web/JavaScript/Guide/Memory_management'),
    mdn('WeakRef', 'Web/JavaScript/Reference/Global_Objects/WeakRef'),
    node('Diagnosing memory issues in Node', 'learn/diagnostics/memory'),
  ],
  'ts-modules-tooling': [
    mdn('JavaScript modules', 'Web/JavaScript/Guide/Modules'),
    node('ECMAScript modules in Node', 'api/esm.html'),
    node('Dual CommonJS/ES module packages', 'api/packages.html#dual-commonjses-module-packages'),
  ],
  'ts-react-rendering': [
    react('Render and commit', 'render-and-commit'),
    react('Preserving and resetting state', 'preserving-and-resetting-state'),
    react('Synchronizing with effects', 'synchronizing-with-effects'),
  ],
  'ts-closures-this': [
    mdn('Closures', 'Web/JavaScript/Guide/Closures'),
    mdn('this', 'Web/JavaScript/Reference/Operators/this'),
    mdn('Arrow function expressions', 'Web/JavaScript/Reference/Functions/Arrow_functions'),
  ],
  'ts-iterators-generators': [
    mdn('Iterators and generators', 'Web/JavaScript/Guide/Iterators_and_generators'),
    mdn('Iteration protocols', 'Web/JavaScript/Reference/Iteration_protocols'),
    mdn('for await...of', 'Web/JavaScript/Reference/Statements/for-await...of'),
  ],
  'ts-error-handling': [
    mdn('Error', 'Web/JavaScript/Reference/Global_Objects/Error'),
    mdn('Error: cause', 'Web/JavaScript/Reference/Global_Objects/Error/cause'),
    mdn('try...catch', 'Web/JavaScript/Reference/Statements/try...catch'),
  ],
  'ts-node-streams': [
    node('Stream', 'api/stream.html'),
    node('Backpressuring in streams', 'learn/modules/backpressuring-in-streams'),
    mdn('Streams API', 'Web/API/Streams_API'),
  ],
  'ts-immutability-state': [
    mdn('Object.freeze()', 'Web/JavaScript/Reference/Global_Objects/Object/freeze'),
    mdn('structuredClone()', 'Web/API/Window/structuredClone'),
    react('Updating objects in state', 'updating-objects-in-state'),
  ],
  'ts-testing-frontend': [
    { label: 'Testing Library: about queries', url: 'https://testing-library.com/docs/queries/about/' },
    mdn('ARIA roles', 'Web/Accessibility/ARIA/Reference/Roles'),
  ],
  'ts-bundling-perf': [
    mdn('Lazy loading', 'Web/Performance/Guides/Lazy_loading'),
    mdn('import() (dynamic import)', 'Web/JavaScript/Reference/Operators/import'),
    mdn('rel="modulepreload"', 'Web/HTML/Reference/Attributes/rel/modulepreload'),
  ],
  // ── Web & HTTP ───────────────────────────────────────────────────────
  'web-http-caching': [
    mdn('HTTP caching', 'Web/HTTP/Guides/Caching'),
    mdn('Cache-Control', 'Web/HTTP/Reference/Headers/Cache-Control'),
    mdn('ETag', 'Web/HTTP/Reference/Headers/ETag'),
  ],
  'web-cors-auth': [
    mdn('Cross-Origin Resource Sharing (CORS)', 'Web/HTTP/Guides/CORS'),
    mdn('Using HTTP cookies', 'Web/HTTP/Guides/Cookies'),
    mdn('Set-Cookie', 'Web/HTTP/Reference/Headers/Set-Cookie'),
    mdn('HTTP authentication', 'Web/HTTP/Guides/Authentication'),
  ],
  'web-oauth-oidc': [
    { label: 'OAuth 2.1', url: 'https://oauth.net/2.1/' },
    { label: 'How OpenID Connect works', url: 'https://openid.net/developers/how-connect-works/' },
    mdn('HTTP authentication', 'Web/HTTP/Guides/Authentication'),
  ],
  'web-owasp': [
    owasp('OWASP Top Ten', 'https://owasp.org/projects/top-ten'),
    mdn('Web security', 'Web/Security'),
    mdn('Content Security Policy (CSP)', 'Web/HTTP/Guides/CSP'),
  ],
  'web-realtime': [
    mdn('WebSockets API', 'Web/API/WebSockets_API'),
    mdn('Using server-sent events', 'Web/API/Server-sent_events/Using_server-sent_events'),
    mdn('EventSource', 'Web/API/EventSource'),
  ],
  'web-api-design': [
    mdn('HTTP request methods', 'Web/HTTP/Reference/Methods'),
    mdn('HTTP response status codes', 'Web/HTTP/Reference/Status'),
    { label: 'Introduction to GraphQL', url: 'https://graphql.org/learn/' },
    { label: 'Introduction to gRPC', url: 'https://grpc.io/docs/what-is-grpc/introduction/' },
  ],
  'web-http-versions': [
    mdn('Evolution of HTTP', 'Web/HTTP/Guides/Evolution_of_HTTP'),
    mdn('Connection management in HTTP/1.x', 'Web/HTTP/Guides/Connection_management_in_HTTP_1.x'),
    mdn('HTTP/3', 'Glossary/HTTP_3'),
  ],
  'web-dns-tls': [
    mdn('Populating the page: how browsers work', 'Web/Performance/Guides/How_browsers_work'),
    mdn('DNS', 'Glossary/DNS'),
    mdn('Transport Layer Security', 'Web/Security/Defenses/Transport_Layer_Security'),
    mdn('An overview of HTTP', 'Web/HTTP/Guides/Overview'),
  ],
  'web-cookies-sessions': [
    mdn('Using HTTP cookies', 'Web/HTTP/Guides/Cookies'),
    mdn('Set-Cookie: SameSite', 'Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value'),
    owasp('OWASP session management cheat sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html'),
  ],
  'web-accessibility': [
    mdn('Accessibility', 'Web/Accessibility'),
    mdn('HTML: a good basis for accessibility', 'Learn_web_development/Core/Accessibility/HTML'),
    mdn('ARIA', 'Web/Accessibility/ARIA'),
    mdn('Understanding WCAG', 'Web/Accessibility/Guides/Understanding_WCAG'),
  ],
  'web-threat-modeling': [
    mdn('Web security', 'Web/Security'),
    owasp('OWASP threat modeling', 'https://community.owasp.org/Threat_Modeling'),
    owasp('OWASP threat modeling cheat sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html'),
  ],
  'web-secrets-management': [
    owasp('OWASP secrets management cheat sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html'),
    { label: 'The Twelve-Factor App: config', url: 'https://12factor.net/config' },
  ],
  // ── Testing & Quality ────────────────────────────────────────────────
  'test-strategy': [
    mdn('Introduction to cross-browser testing', 'Learn_web_development/Extensions/Testing/Introduction'),
    { label: 'The practical test pyramid', url: 'https://martinfowler.com/articles/practical-test-pyramid.html' },
  ],
  'test-contract-load': [
    { label: 'Pact: how it works', url: 'https://docs.pact.io/' },
    { label: 'Grafana k6 documentation', url: 'https://grafana.com/docs/k6/latest/' },
  ],
  // ── Performance ──────────────────────────────────────────────────────
  'perf-web-vitals': [
    mdn('Web performance', 'Web/Performance'),
    mdn('Critical rendering path', 'Web/Performance/Guides/Critical_rendering_path'),
    mdn('PerformanceObserver', 'Web/API/PerformanceObserver'),
    { label: 'Web Vitals', url: 'https://web.dev/articles/vitals' },
  ],
  'perf-backend': [
    node('Profiling Node.js applications', 'learn/getting-started/profiling'),
    { label: 'The USE method', url: 'https://www.brendangregg.com/usemethod.html' },
  ],
  'perf-caching-strategy': [
    mdn('HTTP caching', 'Web/HTTP/Guides/Caching'),
    mdn('Cache-Control', 'Web/HTTP/Reference/Headers/Cache-Control'),
  ],
  'perf-profiling-method': [
    mdn('Performance API', 'Web/API/Performance_API'),
    mdn('Performance fundamentals', 'Web/Performance/Guides/Fundamentals'),
    { label: 'Chrome DevTools: analyze runtime performance', url: 'https://developer.chrome.com/docs/devtools/performance' },
  ],
}

/** A link's site, for showing where it goes. */
export const siteOf = (url: string): string => new URL(url).hostname.replace(/^www\./, '')
