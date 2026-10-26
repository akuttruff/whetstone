/**
 * The coding primers' technique templates in Ruby, Java and Rust, keyed by
 * `<topic>::<technique name>` and merged into the primers in primers.ts.
 * Each mirrors the TypeScript template on the same card: the same skeleton
 * to memorise, written the way that language writes it.
 */

export const PRIMER_TEMPLATES: Record<string, { ruby: string; java: string; rust: string }> = {
  'Arrays & Hashing::Remember what you have seen (set or map)': {
    ruby: `seen = {} # value => index
nums.each_with_index do |x, i|
  need = target - x
  return [seen[need], i] if seen.key?(need)
  seen[x] = i
end`,
    java: `Map<Integer, Integer> seen = new HashMap<>(); // value -> index
for (int i = 0; i < nums.length; i++) {
  int need = target - nums[i];
  if (seen.containsKey(need)) return new int[] { seen.get(need), i };
  seen.put(nums[i], i);
}`,
    rust: `let mut seen: HashMap<i32, usize> = HashMap::new(); // value -> index
for (i, &x) in nums.iter().enumerate() {
    let need = target - x;
    if let Some(&j) = seen.get(&need) {
        return vec![j as i32, i as i32];
    }
    seen.insert(x, i);
}`,
  },
  'Arrays & Hashing::Count how often each thing appears': {
    ruby: `counts = Hash.new(0)
items.each { |x| counts[x] += 1 }
# top-k without a heap: buckets by count
buckets = Array.new(items.length + 1) { [] }
counts.each { |x, n| buckets[n] << x }`,
    java: `Map<String, Integer> counts = new HashMap<>();
for (String x : items) counts.merge(x, 1, Integer::sum);
// top-k without a heap: buckets by count
List<List<String>> buckets = new ArrayList<>();
for (int i = 0; i <= items.length; i++) buckets.add(new ArrayList<>());
for (Map.Entry<String, Integer> e : counts.entrySet()) buckets.get(e.getValue()).add(e.getKey());`,
    rust: `let mut counts: HashMap<&str, usize> = HashMap::new();
for x in &items {
    *counts.entry(x.as_str()).or_insert(0) += 1;
}
// top-k without a heap: buckets by count
let mut buckets: Vec<Vec<&str>> = vec![Vec::new(); items.len() + 1];
for (&x, &n) in &counts {
    buckets[n].push(x);
}`,
  },
  'Arrays & Hashing::Group by a standard form': {
    ruby: `groups = Hash.new { |h, k| h[k] = [] }
strs.each do |s|
  key = s.chars.sort.join # or a count signature
  groups[key] << s
end`,
    java: `Map<String, List<String>> groups = new HashMap<>();
for (String s : strs) {
  char[] chars = s.toCharArray();
  Arrays.sort(chars);
  String key = new String(chars); // or a count signature
  groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
}`,
    rust: `let mut groups: HashMap<String, Vec<String>> = HashMap::new();
for s in &strs {
    let mut chars: Vec<char> = s.chars().collect();
    chars.sort_unstable();
    let key: String = chars.into_iter().collect(); // or a count signature
    groups.entry(key).or_default().push(s.clone());
}`,
  },
  'Arrays & Hashing::Running totals plus a map': {
    ruby: `seen = Hash.new(0)
seen[0] = 1
prefix = 0
count = 0
nums.each do |x|
  prefix += x
  count += seen[prefix - k]
  seen[prefix] += 1
end`,
    java: `Map<Integer, Integer> seen = new HashMap<>();
seen.put(0, 1);
int prefix = 0, count = 0;
for (int x : nums) {
  prefix += x;
  count += seen.getOrDefault(prefix - k, 0);
  seen.merge(prefix, 1, Integer::sum);
}`,
    rust: `let mut seen: HashMap<i32, i32> = HashMap::new();
seen.insert(0, 1);
let (mut prefix, mut count) = (0, 0);
for &x in &nums {
    prefix += x;
    count += seen.get(&(prefix - k)).copied().unwrap_or(0);
    *seen.entry(prefix).or_insert(0) += 1;
}`,
  },
  'Two Pointers::Converging pointers (sorted)': {
    ruby: `l = 0
r = nums.length - 1
while l < r
  sum = nums[l] + nums[r]
  return [l, r] if sum == target
  if sum < target
    l += 1
  else
    r -= 1
  end
end`,
    java: `int l = 0, r = nums.length - 1;
while (l < r) {
  int sum = nums[l] + nums[r];
  if (sum == target) return new int[] { l, r };
  if (sum < target) l++;
  else r--;
}`,
    rust: `let (mut l, mut r) = (0, nums.len() - 1);
while l < r {
    let sum = nums[l] + nums[r];
    if sum == target {
        return vec![l as i32, r as i32];
    }
    if sum < target { l += 1; } else { r -= 1; }
}`,
  },
  'Two Pointers::Read/write pointers (in place)': {
    ruby: `write = 0
nums.each_index do |read|
  if keep?(nums[read])
    nums[write] = nums[read]
    write += 1
  end
end
write`,
    java: `int write = 0;
for (int read = 0; read < nums.length; read++) {
  if (keep(nums[read])) nums[write++] = nums[read];
}
return write;`,
    rust: `let mut write = 0;
for read in 0..nums.len() {
    if keep(nums[read]) {
        nums[write] = nums[read];
        write += 1;
    }
}
write`,
  },
  'Sliding Window::Fixed-size window': {
    ruby: `sum = 0
best = -Float::INFINITY
nums.each_with_index do |x, i|
  sum += x
  sum -= nums[i - k] if i >= k
  best = [best, sum].max if i >= k - 1
end`,
    java: `long sum = 0, best = Long.MIN_VALUE;
for (int i = 0; i < nums.length; i++) {
  sum += nums[i];
  if (i >= k) sum -= nums[i - k];
  if (i >= k - 1) best = Math.max(best, sum);
}`,
    rust: `let (mut sum, mut best) = (0i64, i64::MIN);
for i in 0..nums.len() {
    sum += nums[i] as i64;
    if i >= k { sum -= nums[i - k] as i64; }
    if i + 1 >= k { best = best.max(sum); } // i >= k - 1, without usize underflow
}`,
  },
  'Sliding Window::Variable window, longest valid': {
    ruby: `count = Hash.new(0)
left = 0
best = 0
s.each_char.with_index do |ch, right|
  count[ch] += 1
  while count.size > k # invalid
    l = s[left]
    left += 1
    count[l] -= 1
    count.delete(l) if count[l].zero?
  end
  best = [best, right - left + 1].max
end`,
    java: `Map<Character, Integer> count = new HashMap<>();
int left = 0, best = 0;
for (int right = 0; right < s.length(); right++) {
  count.merge(s.charAt(right), 1, Integer::sum);
  while (/* invalid */ count.size() > k) {
    char l = s.charAt(left++);
    if (count.get(l) == 1) count.remove(l); else count.put(l, count.get(l) - 1);
  }
  best = Math.max(best, right - left + 1);
}`,
    rust: `let mut count: HashMap<u8, usize> = HashMap::new();
let s = s.as_bytes();
let (mut left, mut best) = (0, 0);
for right in 0..s.len() {
    *count.entry(s[right]).or_insert(0) += 1;
    while /* invalid */ count.len() > k {
        let l = s[left];
        left += 1;
        let c = count.get_mut(&l).unwrap();
        *c -= 1;
        if *c == 0 { count.remove(&l); }
    }
    best = best.max(right - left + 1);
}`,
  },
  'Sliding Window::Variable window, shortest valid': {
    ruby: `left = 0
best = Float::INFINITY
n.times do |right|
  add(right)
  while valid?
    best = [best, right - left + 1].min
    remove(left)
    left += 1
  end
end`,
    java: `int left = 0, best = Integer.MAX_VALUE;
for (int right = 0; right < n; right++) {
  add(right);
  while (valid()) {
    best = Math.min(best, right - left + 1);
    remove(left++);
  }
}`,
    rust: `let (mut left, mut best) = (0, usize::MAX);
for right in 0..n {
    add(right);
    while valid() {
        best = best.min(right - left + 1);
        remove(left);
        left += 1;
    }
}`,
  },
  'Sliding Window::Monotonic deque': {
    ruby: `dq = [] # indices, values decreasing
nums.each_with_index do |x, i|
  dq.pop while !dq.empty? && nums[dq.last] < x
  dq << i
  dq.shift if dq.first <= i - k
  out << nums[dq.first] if i >= k - 1
end`,
    java: `Deque<Integer> dq = new ArrayDeque<>(); // indices, values decreasing
for (int i = 0; i < nums.length; i++) {
  while (!dq.isEmpty() && nums[dq.peekLast()] < nums[i]) dq.pollLast();
  dq.addLast(i);
  if (dq.peekFirst() <= i - k) dq.pollFirst();
  if (i >= k - 1) out.add(nums[dq.peekFirst()]);
}`,
    rust: `let mut dq: VecDeque<usize> = VecDeque::new(); // indices, values decreasing
for i in 0..nums.len() {
    while dq.back().is_some_and(|&j| nums[j] < nums[i]) { dq.pop_back(); }
    dq.push_back(i);
    if dq[0] + k <= i { dq.pop_front(); } // dq[0] <= i - k
    if i + 1 >= k { out.push(nums[dq[0]]); }
}`,
  },
  'Stack & Queue::Monotonic stack': {
    ruby: `stack = [] # indices, values decreasing
answer = Array.new(n, 0)
n.times do |i|
  while !stack.empty? && a[stack.last] < a[i]
    j = stack.pop
    answer[j] = i - j # next greater is at i
  end
  stack << i
end`,
    java: `Deque<Integer> stack = new ArrayDeque<>(); // indices, values decreasing
int[] answer = new int[n];
for (int i = 0; i < n; i++) {
  while (!stack.isEmpty() && a[stack.peek()] < a[i]) {
    int j = stack.pop();
    answer[j] = i - j; // next greater is at i
  }
  stack.push(i);
}`,
    rust: `let mut stack: Vec<usize> = Vec::new(); // indices, values decreasing
let mut answer = vec![0; n];
for i in 0..n {
    while let Some(&j) = stack.last() {
        if a[j] >= a[i] { break; }
        stack.pop();
        answer[j] = i - j; // next greater is at i
    }
    stack.push(i);
}`,
  },
  'Sorting & Sweeping::Sort by start, merge': {
    ruby: `sorted = intervals.sort_by(&:first)
out = [sorted[0]]
sorted.drop(1).each do |s, e|
  last = out.last
  if s <= last[1]
    last[1] = [last[1], e].max
  else
    out << [s, e]
  end
end`,
    java: `Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
List<int[]> out = new ArrayList<>();
out.add(intervals[0]);
for (int i = 1; i < intervals.length; i++) {
  int[] last = out.get(out.size() - 1);
  if (intervals[i][0] <= last[1]) last[1] = Math.max(last[1], intervals[i][1]);
  else out.add(intervals[i]);
}`,
    rust: `intervals.sort_by_key(|iv| iv[0]);
let mut out = vec![intervals[0]];
for &[s, e] in &intervals[1..] {
    let last = out.last_mut().unwrap();
    if s <= last[1] { last[1] = last[1].max(e); } else { out.push([s, e]); }
}`,
  },
  'Linked Lists::Iterative reversal': {
    ruby: `prev = nil
curr = head
while curr
  nxt = curr.next
  curr.next = prev
  prev = curr
  curr = nxt
end
prev`,
    java: `ListNode prev = null;
ListNode curr = head;
while (curr != null) {
  ListNode next = curr.next;
  curr.next = prev;
  prev = curr;
  curr = next;
}
return prev;`,
    rust: `let mut prev: Option<Box<ListNode>> = None;
let mut curr = head;
while let Some(mut node) = curr {
    curr = node.next.take();
    node.next = prev;
    prev = Some(node);
}
prev`,
  },
  'Binary Search::Exact match': {
    ruby: `lo = 0
hi = nums.length - 1
while lo <= hi
  mid = (lo + hi) / 2
  return mid if nums[mid] == target
  if nums[mid] < target
    lo = mid + 1
  else
    hi = mid - 1
  end
end
-1`,
    java: `int lo = 0, hi = nums.length - 1;
while (lo <= hi) {
  int mid = (lo + hi) >>> 1;
  if (nums[mid] == target) return mid;
  if (nums[mid] < target) lo = mid + 1;
  else hi = mid - 1;
}
return -1;`,
    rust: `let (mut lo, mut hi) = (0, nums.len()); // half-open [lo, hi): no usize underflow
while lo < hi {
    let mid = lo + (hi - lo) / 2;
    if nums[mid] == target { return Some(mid); }
    if nums[mid] < target { lo = mid + 1; } else { hi = mid; }
}
None // library: nums.binary_search(&target)`,
  },
  'Binary Search::First true / lower bound': {
    ruby: `lo = 0
hi = n # answer in [lo, hi]
while lo < hi
  mid = (lo + hi) / 2
  if ok?(mid)
    hi = mid
  else
    lo = mid + 1
  end
end
lo`,
    java: `int lo = 0, hi = n; // answer in [lo, hi]
while (lo < hi) {
  int mid = (lo + hi) >>> 1;
  if (ok(mid)) hi = mid;
  else lo = mid + 1;
}
return lo;`,
    rust: `let (mut lo, mut hi) = (0, n); // answer in [lo, hi]
while lo < hi {
    let mid = lo + (hi - lo) / 2;
    if ok(mid) { hi = mid; } else { lo = mid + 1; }
}
lo // library: nums.partition_point(|&x| x < target)`,
  },
  'Dynamic Programming::Top-down memoisation': {
    ruby: `memo = {}
f = lambda do |i, j|
  key = [i, j]
  return memo[key] if memo.key?(key)
  # base cases...
  result = [f.call(i - 1, j) + 1, f.call(i, j - 1) + 1].min
  memo[key] = result
end`,
    java: `Map<String, Integer> memo = new HashMap<>();

int f(int i, int j) {
  String key = i + "," + j;
  if (memo.containsKey(key)) return memo.get(key);
  // base cases...
  int result = Math.min(f(i - 1, j) + 1, f(i, j - 1) + 1);
  memo.put(key, result);
  return result;
}`,
    rust: `// closures cannot recurse, so the memo travels as a parameter
fn f(i: usize, j: usize, memo: &mut HashMap<(usize, usize), i32>) -> i32 {
    if let Some(&v) = memo.get(&(i, j)) { return v; }
    // base cases...
    let result = (f(i - 1, j, memo) + 1).min(f(i, j - 1, memo) + 1);
    memo.insert((i, j), result);
    result
}`,
  },
  'Dynamic Programming::1D over positions': {
    ruby: `dp = Array.new(n + 1, 0)
dp[0] = 1
(1..n).each do |i|
  dp[i] = dp[i - 1] + (i >= 2 ? dp[i - 2] : 0)
end`,
    java: `int[] dp = new int[n + 1];
dp[0] = 1;
for (int i = 1; i <= n; i++) {
  dp[i] = dp[i - 1] + (i >= 2 ? dp[i - 2] : 0);
}`,
    rust: `let mut dp = vec![0u64; n + 1];
dp[0] = 1;
for i in 1..=n {
    dp[i] = dp[i - 1] + if i >= 2 { dp[i - 2] } else { 0 };
}`,
  },
  'Dynamic Programming::2D over two sequences': {
    ruby: `prev = Array.new(n + 1, 0)
(1..m).each do |i|
  cur = Array.new(n + 1, 0)
  (1..n).each do |j|
    cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] + 1 : [prev[j], cur[j - 1]].max
  end
  prev = cur
end`,
    java: `int[] prev = new int[n + 1];
for (int i = 1; i <= m; i++) {
  int[] cur = new int[n + 1];
  for (int j = 1; j <= n; j++) {
    cur[j] = a.charAt(i - 1) == b.charAt(j - 1) ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
  }
  prev = cur;
}`,
    rust: `let (a, b) = (a.as_bytes(), b.as_bytes());
let mut prev = vec![0; n + 1];
for i in 1..=m {
    let mut cur = vec![0; n + 1];
    for j in 1..=n {
        cur[j] = if a[i - 1] == b[j - 1] { prev[j - 1] + 1 } else { prev[j].max(cur[j - 1]) };
    }
    prev = cur;
}`,
  },
  'Dynamic Programming::Knapsack (0/1 and unbounded)': {
    ruby: `can = Array.new(target + 1, false)
can[0] = true
nums.each do |x|
  target.downto(x) { |s| can[s] = true if can[s - x] } # 0/1
end`,
    java: `boolean[] can = new boolean[target + 1];
can[0] = true;
for (int x : nums) {
  for (int s = target; s >= x; s--) if (can[s - x]) can[s] = true; // 0/1
}`,
    rust: `let mut can = vec![false; target + 1];
can[0] = true;
for &x in &nums {
    for s in (x..=target).rev() { // 0/1: downwards, so each x is used once
        if can[s - x] { can[s] = true; }
    }
}`,
  },
  'Graphs & Trees::DFS (recursive and iterative)': {
    ruby: `require 'set'
seen = Set.new
dfs = lambda do |u|
  seen << u
  (adj[u] || []).each { |v| dfs.call(v) unless seen.include?(v) }
end`,
    java: `Set<Integer> seen = new HashSet<>();

void dfs(int u) {
  seen.add(u);
  for (int v : adj.getOrDefault(u, List.of())) if (!seen.contains(v)) dfs(v);
}`,
    rust: `fn dfs(u: usize, adj: &HashMap<usize, Vec<usize>>, seen: &mut HashSet<usize>) {
    seen.insert(u);
    for &v in adj.get(&u).into_iter().flatten() { // no entry: no neighbours
        if !seen.contains(&v) { dfs(v, adj, seen); }
    }
}`,
  },
  'Graphs & Trees::BFS and multi-source BFS': {
    ruby: `require 'set'
frontier = [start]
seen = Set[start]
dist = 0
until frontier.empty?
  nxt = []
  frontier.each do |u|
    neighbors(u).each do |v|
      next if seen.include?(v)
      seen << v
      nxt << v
    end
  end
  frontier = nxt
  dist += 1
end`,
    java: `List<Integer> frontier = new ArrayList<>(List.of(start));
Set<Integer> seen = new HashSet<>(List.of(start));
int dist = 0;
while (!frontier.isEmpty()) {
  List<Integer> next = new ArrayList<>();
  for (int u : frontier) for (int v : neighbors(u)) {
    if (seen.add(v)) next.add(v);
  }
  frontier = next;
  dist++;
}`,
    rust: `let mut frontier = vec![start];
let mut seen = HashSet::from([start]);
let mut dist = 0;
while !frontier.is_empty() {
    let mut next = Vec::new();
    for &u in &frontier {
        for v in neighbors(u) {
            if seen.insert(v) { next.push(v); } // insert is false if already seen
        }
    }
    frontier = next;
    dist += 1;
}`,
  },
  'Graphs & Trees::Topological sort (Kahn)': {
    ruby: `indeg = Array.new(n, 0)
edges.each { |a, b| indeg[b] += 1 }
queue = (0...n).select { |i| indeg[i].zero? }
order = []
until queue.empty?
  u = queue.shift
  order << u
  adj[u].each do |v|
    indeg[v] -= 1
    queue << v if indeg[v].zero?
  end
end`,
    java: `int[] indeg = new int[n];
for (int[] e : edges) indeg[e[1]]++;
Deque<Integer> queue = new ArrayDeque<>();
for (int i = 0; i < n; i++) if (indeg[i] == 0) queue.add(i);
List<Integer> order = new ArrayList<>();
while (!queue.isEmpty()) {
  int u = queue.poll();
  order.add(u);
  for (int v : adj.get(u)) if (--indeg[v] == 0) queue.add(v);
}`,
    rust: `let mut indeg = vec![0; n];
for &(_a, b) in &edges { indeg[b] += 1; }
let mut queue: VecDeque<usize> = (0..n).filter(|&i| indeg[i] == 0).collect();
let mut order = Vec::new();
while let Some(u) = queue.pop_front() {
    order.push(u);
    for &v in &adj[u] {
        indeg[v] -= 1;
        if indeg[v] == 0 { queue.push_back(v); }
    }
}`,
  },
  'Graphs & Trees::Union-Find': {
    ruby: `parent = (0...n).to_a
find = ->(x) { parent[x] == x ? x : (parent[x] = find.call(parent[x])) }
union = lambda do |a, b|
  ra = find.call(a)
  rb = find.call(b)
  return false if ra == rb
  parent[rb] = ra
  true
end`,
    java: `int[] parent = new int[n];
for (int i = 0; i < n; i++) parent[i] = i;

int find(int x) { return parent[x] == x ? x : (parent[x] = find(parent[x])); }

boolean union(int a, int b) {
  int ra = find(a), rb = find(b);
  if (ra == rb) return false;
  parent[rb] = ra;
  return true;
}`,
    rust: `let mut parent: Vec<usize> = (0..n).collect();

fn find(parent: &mut [usize], x: usize) -> usize {
    if parent[x] != x {
        let p = parent[x];
        parent[x] = find(parent, p);
    }
    parent[x]
}

fn union(parent: &mut [usize], a: usize, b: usize) -> bool {
    let (ra, rb) = (find(parent, a), find(parent, b));
    if ra == rb { return false; }
    parent[rb] = ra;
    true
}`,
  },
  'Graphs & Trees::Tree recursion: down vs up': {
    ruby: `best = 0
height = lambda do |n|
  return 0 unless n
  l = height.call(n.left)
  r = height.call(n.right)
  best = [best, l + r].max # diameter through n
  1 + [l, r].max
end`,
    java: `int best = 0;

int height(TreeNode n) {
  if (n == null) return 0;
  int l = height(n.left), r = height(n.right);
  best = Math.max(best, l + r); // diameter through n
  return 1 + Math.max(l, r);
}`,
    rust: `let mut best = 0;

fn height(n: &Option<Box<TreeNode>>, best: &mut i32) -> i32 {
    let Some(n) = n else { return 0 };
    let (l, r) = (height(&n.left, best), height(&n.right, best));
    *best = (*best).max(l + r); // diameter through n
    1 + l.max(r)
}`,
  },
  'Backtracking::Choose, explore, unchoose': {
    ruby: `out = []
path = []
go = lambda do |start|
  out << path.dup # or: if complete, record
  (start...nums.length).each do |i|
    path << nums[i]
    go.call(i + 1)
    path.pop
  end
end
go.call(0)`,
    java: `List<List<Integer>> out = new ArrayList<>();
List<Integer> path = new ArrayList<>();

void go(int start) {
  out.add(new ArrayList<>(path)); // or: if complete, record
  for (int i = start; i < nums.length; i++) {
    path.add(nums[i]);
    go(i + 1);
    path.remove(path.size() - 1);
  }
}
// go(0);`,
    rust: `fn go(start: usize, nums: &[i32], path: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
    out.push(path.clone()); // or: if complete, record
    for i in start..nums.len() {
        path.push(nums[i]);
        go(i + 1, nums, path, out);
        path.pop();
    }
}
// go(0, &nums, &mut Vec::new(), &mut out);`,
  },
  'Heaps & Priority Queues::Binary heap from scratch': {
    ruby: `# Ruby's standard library has no heap; this one is ordered by the block.
class Heap
  def initialize(&less)
    @a = []
    @less = less
  end

  def size
    @a.length
  end

  def peek
    @a[0]
  end

  def push(v)
    @a << v
    i = @a.length - 1
    while i > 0
      p = (i - 1) / 2
      break unless @less.call(@a[i], @a[p])
      @a[i], @a[p] = @a[p], @a[i]
      i = p
    end
  end

  def pop
    top = @a[0]
    last = @a.pop
    unless @a.empty?
      @a[0] = last
      i = 0
      loop do
        l = 2 * i + 1
        r = l + 1
        m = i
        m = l if l < @a.length && @less.call(@a[l], @a[m])
        m = r if r < @a.length && @less.call(@a[r], @a[m])
        break if m == i
        @a[i], @a[m] = @a[m], @a[i]
        i = m
      end
    end
    top
  end
end`,
    java: `// java.util.PriorityQueue is the library answer; this is the same thing by hand.
class Heap<T> {
  private final List<T> a = new ArrayList<>();
  private final Comparator<T> cmp;
  Heap(Comparator<T> cmp) { this.cmp = cmp; }
  int size() { return a.size(); }
  T peek() { return a.get(0); }
  void push(T v) {
    a.add(v);
    int i = a.size() - 1;
    while (i > 0) {
      int p = (i - 1) >> 1;
      if (cmp.compare(a.get(i), a.get(p)) >= 0) break;
      Collections.swap(a, i, p);
      i = p;
    }
  }
  T pop() {
    T top = a.get(0);
    T last = a.remove(a.size() - 1);
    if (!a.isEmpty()) {
      a.set(0, last);
      int i = 0;
      for (;;) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.size() && cmp.compare(a.get(l), a.get(m)) < 0) m = l;
        if (r < a.size() && cmp.compare(a.get(r), a.get(m)) < 0) m = r;
        if (m == i) break;
        Collections.swap(a, i, m);
        i = m;
      }
    }
    return top;
  }
}`,
    rust: `// std::collections::BinaryHeap is the library answer (a max-heap; wrap items in Reverse for a min-heap).
// This is the same thing by hand, ordered by the closure.
struct Heap<T, F: Fn(&T, &T) -> bool> {
    a: Vec<T>,
    less: F,
}

impl<T, F: Fn(&T, &T) -> bool> Heap<T, F> {
    fn new(less: F) -> Self { Heap { a: Vec::new(), less } }
    fn len(&self) -> usize { self.a.len() }
    fn peek(&self) -> Option<&T> { self.a.first() }
    fn push(&mut self, v: T) {
        self.a.push(v);
        let mut i = self.a.len() - 1;
        while i > 0 {
            let p = (i - 1) / 2;
            if !(self.less)(&self.a[i], &self.a[p]) { break; }
            self.a.swap(i, p);
            i = p;
        }
    }
    fn pop(&mut self) -> Option<T> {
        let last = self.a.pop()?;
        if self.a.is_empty() { return Some(last); }
        let top = std::mem::replace(&mut self.a[0], last);
        let mut i = 0;
        loop {
            let (l, r) = (2 * i + 1, 2 * i + 2);
            let mut m = i;
            if l < self.a.len() && (self.less)(&self.a[l], &self.a[m]) { m = l; }
            if r < self.a.len() && (self.less)(&self.a[r], &self.a[m]) { m = r; }
            if m == i { break; }
            self.a.swap(i, m);
            i = m;
        }
        Some(top)
    }
}`,
  },
  'Caching::LRU via Map order': {
    ruby: `def get(key)
  return nil unless @m.key?(key)
  v = @m.delete(key)
  @m[key] = v # a Hash keeps insertion order: re-adding moves it to the end
  v
end`,
    java: `public V get(K key) {
  if (!m.containsKey(key)) return null;
  V v = m.remove(key);
  m.put(key, v); // a LinkedHashMap keeps insertion order: re-adding moves it to the end
  return v;
}`,
    rust: `// std has no insertion-ordered map: stamp each entry with a tick and keep BTreeMap<tick, key> as the order
fn get(&mut self, key: &K) -> Option<&V> {
    let (v, t) = self.m.get_mut(key)?; // m: HashMap<K, (V, u64)>
    self.order.remove(t); // drop its old place in the order...
    self.tick += 1;
    *t = self.tick;
    self.order.insert(self.tick, key.clone()); // ...and re-add it at the most recent end
    Some(v)
}
// evict: self.order.pop_first() is the least recently used key`,
  },
  'Async & Concurrency::Worker pool over a shared counter': {
    ruby: `next_index = 0
mutex = Mutex.new
worker = lambda do
  loop do
    i = mutex.synchronize { next_index += 1; next_index - 1 }
    break if i >= items.length
    results[i] = fn.call(items[i], i)
  end
end
Array.new(limit) { Thread.new(&worker) }.each(&:join)`,
    java: `AtomicInteger next = new AtomicInteger();
Runnable worker = () -> {
  for (int i = next.getAndIncrement(); i < items.size(); i = next.getAndIncrement()) results.set(i, fn.apply(items.get(i), i));
};
List<Thread> threads = new ArrayList<>();
for (int w = 0; w < limit; w++) { Thread t = new Thread(worker); t.start(); threads.add(t); }
for (Thread t : threads) t.join();`,
    rust: `let next = AtomicUsize::new(0);
let results = Mutex::new(vec![None; items.len()]);
thread::scope(|s| {
    for _ in 0..limit {
        s.spawn(|| loop {
            let i = next.fetch_add(1, Ordering::SeqCst); // claim the next index
            if i >= items.len() { break; }
            let r = f(&items[i], i);
            results.lock().unwrap()[i] = Some(r);
        });
    }
}); // the scope joins every worker; unscoped threads would need Arc around next and results
let results = results.into_inner().unwrap();`,
  },
  'Async & Concurrency::Timeout and cancellation': {
    ruby: `token = CancelToken.new
thread = Thread.new { run.call(token) }
if thread.join(ms / 1000.0).nil? # still running: cancel and report
  token.cancel
  raise 'timeout'
end
thread.value`,
    java: `Future<T> future = executor.submit(() -> run.apply(token));
try {
  return future.get(ms, TimeUnit.MILLISECONDS);
} catch (TimeoutException e) {
  token.cancel(); // so the callee stops
  throw new Exception("timeout");
}`,
    rust: `let cancelled = Arc::new(AtomicBool::new(false)); // the token the callee polls
let (tx, rx) = mpsc::channel();
thread::spawn({
    let (cancelled, tx) = (Arc::clone(&cancelled), tx);
    move || { let _ = tx.send(run(&cancelled)); }
});
match rx.recv_timeout(Duration::from_millis(ms)) {
    Ok(v) => Ok(v),
    Err(_) => {
        cancelled.store(true, Ordering::SeqCst); // so the callee stops
        Err("timeout")
    }
}`,
  },
  'Strings::Expand around centre': {
    ruby: `expand = lambda do |l, r|
  while l >= 0 && r < s.length && s[l] == s[r]
    l -= 1
    r += 1
  end
  # palindrome is s[(l + 1)...r]
end
s.length.times do |i|
  expand.call(i, i)
  expand.call(i, i + 1)
end`,
    java: `void expand(String s, int l, int r) {
  while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) { l--; r++; }
  // palindrome is s.substring(l + 1, r)
}
// for (int i = 0; i < s.length(); i++) { expand(s, i, i); expand(s, i, i + 1); }`,
    rust: `fn expand(s: &[u8], mut l: usize, mut r: usize) -> (usize, usize) {
    while r < s.len() && s[l] == s[r] {
        if l == 0 { return (0, r + 1); } // usize cannot step below 0
        l -= 1;
        r += 1;
    }
    (l + 1, r) // palindrome is &s[l + 1..r]
}
// for i in 0..s.len() { expand(s, i, i); expand(s, i, i + 1); }`,
  },
}
