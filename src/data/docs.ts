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

/** Where a whole topic's reading starts, shown at the foot of its primer. */
export const TOPIC_DOCS: Record<string, DocLink[]> = {
  'TypeScript & JavaScript': [
    mdn('JavaScript Guide', 'Web/JavaScript/Guide'),
    mdn('JavaScript Reference', 'Web/JavaScript/Reference'),
    ts('TypeScript Handbook', 'intro.html'),
    node('Node.js documentation', 'api/'),
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
