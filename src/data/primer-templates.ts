/**
 * The coding primers' technique templates in Ruby and Java, keyed by
 * `<topic>::<technique name>` and merged into the primers in primers.ts.
 * Each mirrors the TypeScript template on the same card: the same skeleton
 * to memorise, written the way that language writes it.
 */

export const PRIMER_TEMPLATES: Record<string, { ruby: string; java: string }> = {
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
  },
}
