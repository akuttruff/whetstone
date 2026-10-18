import type { Port } from '../types.ts'

/**
 * The coding problems in Ruby: a starter and a reference solution per
 * problem id, mirroring the TypeScript versions. Function names are the
 * snake_case form of the TypeScript names, which is what the test runner
 * resolves. `server/content.test.ts` runs every solution here through the
 * real Ruby sandbox against the problem's tests.
 */

const LIST_NODE = `class ListNode
  attr_accessor :val, :next
  def initialize(val = 0, nxt = nil)
    @val = val
    @next = nxt
  end
end

`

const TREE_NODE = `class TreeNode
  attr_accessor :val, :left, :right
  def initialize(val = 0, left = nil, right = nil)
    @val = val
    @left = left
    @right = right
  end
end

`

export const RUBY_PORTS: Record<string, Port> = {
  'two-sum': {
    starter: `# Return the indices of the two numbers in nums that sum to target.
def two_sum(nums, target)
  # your code
  []
end
`,
    solution: `def two_sum(nums, target)
  seen = {}
  nums.each_with_index do |n, i|
    complement = target - n
    return [seen[complement], i] if seen.key?(complement)
    seen[n] = i
  end
  raise 'no two-sum solution exists'
end
`,
  },
  'max-profit-stock': {
    starter: `# Maximum profit from at most one buy/sell transaction.
def max_profit(prices)
  # your code
  0
end
`,
    solution: `def max_profit(prices)
  min_so_far = Float::INFINITY
  best = 0
  prices.each do |price|
    min_so_far = price if price < min_so_far
    best = price - min_so_far if price - min_so_far > best
  end
  best
end
`,
  },
  '3sum': {
    starter: `# All unique triplets in nums that sum to zero.
def three_sum(nums)
  # your code
  []
end
`,
    solution: `def three_sum(nums)
  nums = nums.sort
  result = []
  (0...nums.length - 2).each do |i|
    next if i > 0 && nums[i] == nums[i - 1]
    left = i + 1
    right = nums.length - 1
    while left < right
      sum = nums[i] + nums[left] + nums[right]
      if sum < 0
        left += 1
      elsif sum > 0
        right -= 1
      else
        result << [nums[i], nums[left], nums[right]]
        left += 1 while left < right && nums[left] == nums[left + 1]
        right -= 1 while left < right && nums[right] == nums[right - 1]
        left += 1
        right -= 1
      end
    end
  end
  result
end
`,
  },
  'valid-parentheses': {
    starter: `# Whether s is a valid sequence of matched parentheses.
def is_valid(s)
  # your code
  false
end
`,
    solution: `def is_valid(s)
  close_to_open = { ')' => '(', ']' => '[', '}' => '{' }
  stack = []
  s.each_char do |ch|
    if close_to_open.key?(ch)
      return false if stack.pop != close_to_open[ch]
    else
      stack << ch
    end
  end
  stack.empty?
end
`,
  },
  'longest-substring-without-repeating': {
    starter: `# Length of the longest substring of s with no repeating characters.
def length_of_longest_substring(s)
  # your code
  0
end
`,
    solution: `def length_of_longest_substring(s)
  last_seen = {}
  left = 0
  best = 0
  s.each_char.with_index do |ch, right|
    prev = last_seen[ch]
    left = prev + 1 if prev && prev >= left
    last_seen[ch] = right
    best = [best, right - left + 1].max
  end
  best
end
`,
  },
  'sliding-window-maximum': {
    starter: `# Maximum of each sliding window of size k.
def max_sliding_window(nums, k)
  # your code
  []
end
`,
    solution: `def max_sliding_window(nums, k)
  deque = [] # indices, values strictly decreasing
  result = []
  nums.each_with_index do |n, right|
    deque.pop while !deque.empty? && nums[deque.last] <= n
    deque << right
    deque.shift if deque.first <= right - k
    result << nums[deque.first] if right >= k - 1
  end
  result
end
`,
  },
  'merge-intervals': {
    starter: `# Merge all overlapping intervals.
def merge(intervals)
  # your code
  []
end
`,
    solution: `def merge(intervals)
  merged = []
  intervals.sort_by(&:first).each do |start, finish|
    last = merged.last
    if last && start <= last[1]
      last[1] = [last[1], finish].max
    else
      merged << [start, finish]
    end
  end
  merged
end
`,
  },
  'reverse-linked-list': {
    starter: LIST_NODE + `# Reverse a singly linked list and return the new head.
def reverse_list(head)
  # your code
  nil
end
`,
    solution: LIST_NODE + `def reverse_list(head)
  prev = nil
  curr = head
  while curr
    nxt = curr.next
    curr.next = prev
    prev = curr
    curr = nxt
  end
  prev
end
`,
  },
  'linked-list-cycle': {
    starter: LIST_NODE + `# Whether the linked list contains a cycle.
def has_cycle(head)
  # your code
  false
end

# Test driver. Leave as is: builds the list and links the tail to node pos (-1 for none).
def has_cycle_at(vals, pos)
  nodes = vals.map { |v| ListNode.new(v) }
  nodes.each_with_index { |n, i| n.next = nodes[i + 1] }
  nodes.last.next = nodes[pos] if pos >= 0 && !nodes.empty?
  has_cycle(nodes.first)
end
`,
    solution: LIST_NODE + `def has_cycle(head)
  slow = head
  fast = head
  while fast && fast.next
    slow = slow.next
    fast = fast.next.next
    return true if slow.equal?(fast)
  end
  false
end

def has_cycle_at(vals, pos)
  nodes = vals.map { |v| ListNode.new(v) }
  nodes.each_with_index { |n, i| n.next = nodes[i + 1] }
  nodes.last.next = nodes[pos] if pos >= 0 && !nodes.empty?
  has_cycle(nodes.first)
end
`,
  },
  'binary-search': {
    starter: `# Index of target in sorted nums, or -1 if absent. Must be O(log n).
def search(nums, target)
  # your code
  -1
end
`,
    solution: `def search(nums, target)
  lo = 0
  hi = nums.length - 1
  while lo <= hi
    mid = lo + (hi - lo) / 2
    return mid if nums[mid] == target
    if nums[mid] < target
      lo = mid + 1
    else
      hi = mid - 1
    end
  end
  -1
end
`,
  },
  'max-subarray': {
    starter: `# Largest sum of any contiguous subarray of nums.
def max_sub_array(nums)
  # your code
  0
end
`,
    solution: `def max_sub_array(nums)
  best_here = nums[0]
  best = nums[0]
  nums.drop(1).each do |n|
    best_here = [n, best_here + n].max
    best = [best, best_here].max
  end
  best
end
`,
  },
  'longest-common-subsequence': {
    starter: `# Length of the longest common subsequence of text1 and text2.
def longest_common_subsequence(text1, text2)
  # your code
  0
end
`,
    solution: `def longest_common_subsequence(text1, text2)
  m = text1.length
  n = text2.length
  prev = Array.new(n + 1, 0)
  (m - 1).downto(0) do |i|
    curr = Array.new(n + 1, 0)
    (n - 1).downto(0) do |j|
      curr[j] = text1[i] == text2[j] ? 1 + prev[j + 1] : [prev[j], curr[j + 1]].max
    end
    prev = curr
  end
  prev[0]
end
`,
  },
  'number-of-islands': {
    starter: `# Number of 4-directionally-connected land regions in grid.
def num_islands(grid)
  # your code
  0
end
`,
    solution: `def num_islands(grid)
  return 0 if grid.empty?
  rows = grid.length
  cols = grid[0].length
  visit = lambda do |r, c|
    return if r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1'
    grid[r][c] = '0'
    visit.call(r + 1, c)
    visit.call(r - 1, c)
    visit.call(r, c + 1)
    visit.call(r, c - 1)
  end
  count = 0
  rows.times do |r|
    cols.times do |c|
      next unless grid[r][c] == '1'
      count += 1
      visit.call(r, c)
    end
  end
  count
end
`,
  },
  'course-schedule': {
    starter: `# Whether all num_courses can be taken given the prerequisites.
def can_finish(num_courses, prerequisites)
  # your code
  false
end
`,
    solution: `def can_finish(num_courses, prerequisites)
  adj = Array.new(num_courses) { [] }
  indegree = Array.new(num_courses, 0)
  prerequisites.each do |a, b|
    adj[b] << a
    indegree[a] += 1
  end
  queue = (0...num_courses).select { |i| indegree[i].zero? }
  done = 0
  until queue.empty?
    course = queue.shift
    done += 1
    adj[course].each do |nxt|
      indegree[nxt] -= 1
      queue << nxt if indegree[nxt].zero?
    end
  end
  done == num_courses
end
`,
  },
  'permutations': {
    starter: `# All permutations of nums, in any order.
def permute(nums)
  # your code
  []
end
`,
    solution: `def permute(nums)
  result = []
  current = []
  used = Array.new(nums.length, false)
  backtrack = lambda do
    if current.length == nums.length
      result << current.dup
      return
    end
    nums.each_index do |i|
      next if used[i]
      used[i] = true
      current << nums[i]
      backtrack.call
      current.pop
      used[i] = false
    end
  end
  backtrack.call
  result
end
`,
  },
  'top-k-frequent-elements': {
    starter: `# The k most frequent elements of nums, in any order.
def top_k_frequent(nums, k)
  # your code
  []
end
`,
    solution: `def top_k_frequent(nums, k)
  freq = Hash.new(0)
  nums.each { |n| freq[n] += 1 }
  freq.sort_by { |_, count| -count }.first(k).map(&:first)
end
`,
  },
  'daily-temperatures': {
    starter: `# For each day, how many days until a warmer temperature (0 if never).
def daily_temperatures(temperatures)
  # your code
  []
end
`,
    solution: `def daily_temperatures(temperatures)
  answer = Array.new(temperatures.length, 0)
  stack = [] # indices with no warmer day seen yet, temperatures decreasing
  temperatures.each_with_index do |t, i|
    while !stack.empty? && temperatures[stack.last] < t
      j = stack.pop
      answer[j] = i - j
    end
    stack << i
  end
  answer
end
`,
  },
  'subarray-sum-equals-k': {
    starter: `# Count contiguous subarrays that sum to k.
def subarray_sum(nums, k)
  # your code
  0
end
`,
    solution: `def subarray_sum(nums, k)
  seen = Hash.new(0)
  seen[0] = 1
  prefix = 0
  count = 0
  nums.each do |n|
    prefix += n
    count += seen[prefix - k]
    seen[prefix] += 1
  end
  count
end
`,
  },
  'connected-components': {
    starter: `# Count connected components in an undirected graph.
def count_components(n, edges)
  # your code
  0
end
`,
    solution: `def count_components(n, edges)
  parent = (0...n).to_a
  rank = Array.new(n, 0)
  find = lambda do |x|
    while parent[x] != x
      parent[x] = parent[parent[x]] # path halving
      x = parent[x]
    end
    x
  end
  components = n
  edges.each do |a, b|
    ra = find.call(a)
    rb = find.call(b)
    next if ra == rb
    ra, rb = rb, ra if rank[ra] < rank[rb]
    parent[rb] = ra
    rank[ra] += 1 if rank[ra] == rank[rb]
    components -= 1
  end
  components
end
`,
  },
  'implement-trie': {
    starter: `class Trie
  def initialize
    # your fields
  end

  def insert(word)
    # your code
  end

  def search(word)
    # your code
    false
  end

  def starts_with(prefix)
    # your code
    false
  end
end

# Test driver: replays ops against a fresh Trie. Leave as is.
def run_trie(ops, args)
  t = Trie.new
  ops.each_with_index.map do |op, i|
    case op
    when 'insert' then t.insert(args[i]); nil
    when 'search' then t.search(args[i])
    else t.starts_with(args[i])
    end
  end
end
`,
    solution: `class Trie
  Node = Struct.new(:children, :end)

  def initialize
    @root = Node.new({}, false)
  end

  def insert(word)
    node = @root
    word.each_char do |ch|
      node.children[ch] ||= Node.new({}, false)
      node = node.children[ch]
    end
    node.end = true
  end

  def search(word)
    node = walk(word)
    node ? node.end : false
  end

  def starts_with(prefix)
    !walk(prefix).nil?
  end

  private

  def walk(s)
    node = @root
    s.each_char do |ch|
      node = node.children[ch]
      return nil unless node
    end
    node
  end
end

# Test driver: replays ops against a fresh Trie. Leave as is.
def run_trie(ops, args)
  t = Trie.new
  ops.each_with_index.map do |op, i|
    case op
    when 'insert' then t.insert(args[i]); nil
    when 'search' then t.search(args[i])
    else t.starts_with(args[i])
    end
  end
end
`,
  },
  'single-number': {
    starter: `# Return the element that appears once (all others appear twice).
def single_number(nums)
  # your code
  0
end
`,
    solution: `def single_number(nums)
  nums.reduce(0) { |acc, n| acc ^ n }
end
`,
  },
  'jump-game': {
    starter: `# Can you reach the last index?
def can_jump(nums)
  # your code
  false
end
`,
    solution: `def can_jump(nums)
  reach = 0
  nums.each_with_index do |n, i|
    return false if i > reach
    reach = [reach, i + n].max
    return true if reach >= nums.length - 1
  end
  true
end
`,
  },
  'kth-largest-element': {
    starter: `# The kth largest value in nums.
def find_kth_largest(nums, k)
  # your code
  0
end
`,
    solution: `def find_kth_largest(nums, k)
  a = nums.dup
  target = a.length - k # index in ascending order
  lo = 0
  hi = a.length - 1
  while lo < hi
    pivot = a[lo + rand(hi - lo + 1)]
    i = lo
    j = hi
    while i <= j
      i += 1 while a[i] < pivot
      j -= 1 while a[j] > pivot
      if i <= j
        a[i], a[j] = a[j], a[i]
        i += 1
        j -= 1
      end
    end
    if target <= j
      hi = j
    elsif target >= i
      lo = i
    else
      return a[target]
    end
  end
  a[target]
end
`,
  },
  'coin-change': {
    starter: `# Fewest coins to make amount, or -1.
def coin_change(coins, amount)
  # your code
  -1
end
`,
    solution: `def coin_change(coins, amount)
  dp = Array.new(amount + 1, Float::INFINITY)
  dp[0] = 0
  (1..amount).each do |a|
    coins.each do |c|
      dp[a] = dp[a - c] + 1 if c <= a && dp[a - c] + 1 < dp[a]
    end
  end
  dp[amount] == Float::INFINITY ? -1 : dp[amount]
end
`,
  },
  'level-order-traversal': {
    starter: TREE_NODE + `# Values level by level.
def level_order(root)
  # your code
  []
end
`,
    solution: TREE_NODE + `def level_order(root)
  out = []
  return out unless root
  queue = [root]
  until queue.empty?
    out << queue.map(&:val)
    queue = queue.flat_map { |n| [n.left, n.right].compact }
  end
  out
end
`,
  },
  'validate-bst': {
    starter: TREE_NODE + `# Is this a valid binary search tree?
def is_valid_bst(root)
  # your code
  false
end
`,
    solution: TREE_NODE + `def is_valid_bst(root)
  ok = lambda do |n, lo, hi|
    n.nil? || (n.val > lo && n.val < hi && ok.call(n.left, lo, n.val) && ok.call(n.right, n.val, hi))
  end
  ok.call(root, -Float::INFINITY, Float::INFINITY)
end
`,
  },
  'search-rotated-array': {
    starter: `# Index of target in a rotated sorted array, or -1.
def search_rotated(nums, target)
  # your code
  -1
end
`,
    solution: `def search_rotated(nums, target)
  lo = 0
  hi = nums.length - 1
  while lo <= hi
    mid = (lo + hi) / 2
    return mid if nums[mid] == target
    if nums[lo] <= nums[mid]
      # left half sorted
      if nums[lo] <= target && target < nums[mid]
        hi = mid - 1
      else
        lo = mid + 1
      end
    else
      # right half sorted
      if nums[mid] < target && target <= nums[hi]
        lo = mid + 1
      else
        hi = mid - 1
      end
    end
  end
  -1
end
`,
  },
  'min-window-substring': {
    starter: `# Shortest substring of s containing all characters of t.
def min_window(s, t)
  # your code
  ''
end
`,
    solution: `def min_window(s, t)
  return '' if t.length > s.length
  need = Hash.new(0)
  t.each_char { |ch| need[ch] += 1 }
  have = Hash.new(0)
  formed = 0
  best = [0, Float::INFINITY]
  left = 0
  s.each_char.with_index do |ch, right|
    next unless need.key?(ch)
    have[ch] += 1
    formed += 1 if have[ch] == need[ch]
    while formed == need.size
      best = [left, right] if right - left < best[1] - best[0]
      l = s[left]
      if need.key?(l)
        formed -= 1 if have[l] == need[l]
        have[l] -= 1
      end
      left += 1
    end
  end
  best[1] == Float::INFINITY ? '' : s[best[0]..best[1]]
end
`,
  },
  'shortest-path-grid': {
    starter: `# Length of the shortest open path from (0,0) to (rows-1, cols-1), or -1.
def shortest_path(grid)
  # your code
  -1
end
`,
    solution: `def shortest_path(grid)
  rows = grid.length
  cols = rows.zero? ? 0 : grid[0].length
  return -1 if rows.zero? || cols.zero? || grid[0][0] == 1 || grid[rows - 1][cols - 1] == 1
  seen = Array.new(rows) { Array.new(cols, false) }
  frontier = [[0, 0]]
  seen[0][0] = true
  dist = 1
  dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  until frontier.empty?
    nxt = []
    frontier.each do |r, c|
      return dist if r == rows - 1 && c == cols - 1
      dirs.each do |dr, dc|
        nr = r + dr
        nc = c + dc
        next if nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen[nr][nc] || grid[nr][nc] == 1
        seen[nr][nc] = true
        nxt << [nr, nc]
      end
    end
    frontier = nxt
    dist += 1
  end
  -1
end
`,
  },
  'contains-duplicate': {
    starter: `def contains_duplicate(nums)
  # your code
  false
end
`,
    solution: `require 'set'

def contains_duplicate(nums)
  seen = Set.new
  nums.each do |n|
    return true if seen.include?(n)
    seen << n
  end
  false
end
`,
  },
  'valid-anagram': {
    starter: `def is_anagram(s, t)
  # your code
  false
end
`,
    solution: `def is_anagram(s, t)
  return false if s.length != t.length
  counts = Hash.new(0)
  s.each_char { |ch| counts[ch] += 1 }
  t.each_char do |ch|
    counts[ch] -= 1
    return false if counts[ch] < 0
  end
  true
end
`,
  },
  'group-anagrams': {
    starter: `def group_anagrams(strs)
  # your code
  []
end
`,
    solution: `def group_anagrams(strs)
  groups = Hash.new { |h, k| h[k] = [] }
  strs.each do |s|
    counts = Array.new(26, 0)
    s.each_char { |ch| counts[ch.ord - 97] += 1 }
    groups[counts] << s
  end
  groups.values
end
`,
  },
  'product-except-self': {
    starter: `def product_except_self(nums)
  # your code
  []
end
`,
    solution: `def product_except_self(nums)
  out = Array.new(nums.length, 1)
  prefix = 1
  nums.each_with_index do |n, i|
    out[i] = prefix
    prefix *= n
  end
  suffix = 1
  (nums.length - 1).downto(0) do |i|
    out[i] *= suffix
    suffix *= nums[i]
  end
  out
end
`,
  },
  'longest-consecutive-sequence': {
    starter: `def longest_consecutive(nums)
  # your code
  0
end
`,
    solution: `require 'set'

def longest_consecutive(nums)
  set = nums.to_set
  best = 0
  set.each do |n|
    next if set.include?(n - 1)
    len = 1
    len += 1 while set.include?(n + len)
    best = [best, len].max
  end
  best
end
`,
  },
  'valid-palindrome': {
    starter: `def is_palindrome(s)
  # your code
  false
end
`,
    solution: `def is_palindrome(s)
  ok = ->(ch) { ch.match?(/[a-z0-9]/i) }
  i = 0
  j = s.length - 1
  while i < j
    i += 1 while i < j && !ok.call(s[i])
    j -= 1 while i < j && !ok.call(s[j])
    return false if s[i].downcase != s[j].downcase
    i += 1
    j -= 1
  end
  true
end
`,
  },
  'container-most-water': {
    starter: `def max_area(height)
  # your code
  0
end
`,
    solution: `def max_area(height)
  i = 0
  j = height.length - 1
  best = 0
  while i < j
    best = [best, [height[i], height[j]].min * (j - i)].max
    if height[i] < height[j]
      i += 1
    else
      j -= 1
    end
  end
  best
end
`,
  },
  'trapping-rain-water': {
    starter: `def trap(height)
  # your code
  0
end
`,
    solution: `def trap(height)
  l = 0
  r = height.length - 1
  left_max = 0
  right_max = 0
  water = 0
  while l < r
    if height[l] < height[r]
      left_max = [left_max, height[l]].max
      water += left_max - height[l]
      l += 1
    else
      right_max = [right_max, height[r]].max
      water += right_max - height[r]
      r -= 1
    end
  end
  water
end
`,
  },
  'remove-duplicates-sorted': {
    starter: `def remove_duplicates(nums)
  # your code
  nums.length
end

# Test driver. Leave as is.
def run(nums)
  k = remove_duplicates(nums)
  nums.first(k)
end
`,
    solution: `def remove_duplicates(nums)
  return 0 if nums.empty?
  write = 1
  (1...nums.length).each do |read|
    if nums[read] != nums[write - 1]
      nums[write] = nums[read]
      write += 1
    end
  end
  write
end

# Test driver. Leave as is.
def run(nums)
  k = remove_duplicates(nums)
  nums.first(k)
end
`,
  },
  'longest-repeating-replacement': {
    starter: `def character_replacement(s, k)
  # your code
  0
end
`,
    solution: `def character_replacement(s, k)
  counts = Hash.new(0)
  left = 0
  max_freq = 0
  best = 0
  s.each_char.with_index do |ch, right|
    counts[ch] += 1
    max_freq = [max_freq, counts[ch]].max
    while right - left + 1 - max_freq > k
      counts[s[left]] -= 1
      left += 1
    end
    best = [best, right - left + 1].max
  end
  best
end
`,
  },
  'permutation-in-string': {
    starter: `def check_inclusion(s1, s2)
  # your code
  false
end
`,
    solution: `def check_inclusion(s1, s2)
  return false if s1.length > s2.length
  need = Array.new(26, 0)
  have = Array.new(26, 0)
  idx = ->(ch) { ch.ord - 97 }
  s1.length.times do |i|
    need[idx.call(s1[i])] += 1
    have[idx.call(s2[i])] += 1
  end
  matches = (0...26).count { |i| need[i] == have[i] }
  (s1.length...s2.length).each do |right|
    return true if matches == 26
    add = idx.call(s2[right])
    have[add] += 1
    if have[add] == need[add]
      matches += 1
    elsif have[add] == need[add] + 1
      matches -= 1
    end
    drop = idx.call(s2[right - s1.length])
    have[drop] -= 1
    if have[drop] == need[drop]
      matches += 1
    elsif have[drop] == need[drop] - 1
      matches -= 1
    end
  end
  matches == 26
end
`,
  },
  'max-consecutive-ones-iii': {
    starter: `def longest_ones(nums, k)
  # your code
  0
end
`,
    solution: `def longest_ones(nums, k)
  left = 0
  zeros = 0
  best = 0
  nums.each_with_index do |n, right|
    zeros += 1 if n.zero?
    while zeros > k
      zeros -= 1 if nums[left].zero?
      left += 1
    end
    best = [best, right - left + 1].max
  end
  best
end
`,
  },
  'min-stack': {
    starter: `class MinStack
  def initialize
    # your fields
  end

  def push(val)
    # your code
  end

  def pop
    # your code
  end

  def top
    # your code
    0
  end

  def get_min
    # your code
    0
  end
end

# Test driver. Leave as is.
def run_min_stack(ops, args)
  s = MinStack.new
  ops.each_with_index.map do |op, i|
    case op
    when 'push' then s.push(args[i]); nil
    when 'pop' then s.pop; nil
    when 'top' then s.top
    else s.get_min
    end
  end
end
`,
    solution: `class MinStack
  def initialize
    @stack = [] # [value, min so far]
  end

  def push(val)
    min = @stack.empty? ? val : [val, @stack.last[1]].min
    @stack << [val, min]
  end

  def pop
    @stack.pop
  end

  def top
    @stack.last[0]
  end

  def get_min
    @stack.last[1]
  end
end

# Test driver. Leave as is.
def run_min_stack(ops, args)
  s = MinStack.new
  ops.each_with_index.map do |op, i|
    case op
    when 'push' then s.push(args[i]); nil
    when 'pop' then s.pop; nil
    when 'top' then s.top
    else s.get_min
    end
  end
end
`,
  },
  'evaluate-rpn': {
    starter: `def eval_rpn(tokens)
  # your code
  0
end
`,
    solution: `def eval_rpn(tokens)
  stack = []
  tokens.each do |t|
    if %w[+ - * /].include?(t)
      b = stack.pop
      a = stack.pop
      stack << case t
               when '+' then a + b
               when '-' then a - b
               when '*' then a * b
               else a.fdiv(b).truncate # Ruby's / floors; the problem truncates toward zero
               end
    else
      stack << t.to_i
    end
  end
  stack[0]
end
`,
  },
  'largest-rectangle-histogram': {
    starter: `def largest_rectangle_area(heights)
  # your code
  0
end
`,
    solution: `def largest_rectangle_area(heights)
  stack = []
  best = 0
  (0..heights.length).each do |i|
    h = i == heights.length ? 0 : heights[i]
    while !stack.empty? && heights[stack.last] >= h
      height = heights[stack.pop]
      left = stack.empty? ? 0 : stack.last + 1
      best = [best, height * (i - left)].max
    end
    stack << i
  end
  best
end
`,
  },
  'koko-bananas': {
    starter: `def min_eating_speed(piles, h)
  # your code
  0
end
`,
    solution: `def min_eating_speed(piles, h)
  lo = 1
  hi = piles.max
  hours = ->(k) { piles.sum { |p| (p + k - 1) / k } }
  while lo < hi
    mid = (lo + hi) / 2
    if hours.call(mid) <= h
      hi = mid
    else
      lo = mid + 1
    end
  end
  lo
end
`,
  },
  'find-min-rotated': {
    starter: `def find_min(nums)
  # your code
  0
end
`,
    solution: `def find_min(nums)
  lo = 0
  hi = nums.length - 1
  while lo < hi
    mid = (lo + hi) / 2
    if nums[mid] > nums[hi]
      lo = mid + 1
    else
      hi = mid
    end
  end
  nums[lo]
end
`,
  },
  'search-2d-matrix': {
    starter: `def search_matrix(matrix, target)
  # your code
  false
end
`,
    solution: `def search_matrix(matrix, target)
  m = matrix.length
  n = m.zero? ? 0 : matrix[0].length
  lo = 0
  hi = m * n - 1
  while lo <= hi
    mid = (lo + hi) / 2
    v = matrix[mid / n][mid % n]
    return true if v == target
    if v < target
      lo = mid + 1
    else
      hi = mid - 1
    end
  end
  false
end
`,
  },
  'median-two-sorted': {
    starter: `def find_median_sorted_arrays(nums1, nums2)
  # your code
  0
end
`,
    solution: `def find_median_sorted_arrays(nums1, nums2)
  a = nums1
  b = nums2
  a, b = b, a if a.length > b.length
  total = a.length + b.length
  half = (total + 1) / 2
  lo = 0
  hi = a.length
  loop do
    i = (lo + hi) / 2 # elements taken from a
    j = half - i      # elements taken from b
    a_left = i > 0 ? a[i - 1] : -Float::INFINITY
    a_right = i < a.length ? a[i] : Float::INFINITY
    b_left = j > 0 ? b[j - 1] : -Float::INFINITY
    b_right = j < b.length ? b[j] : Float::INFINITY
    if a_left <= b_right && b_left <= a_right
      left_max = [a_left, b_left].max
      return left_max if total.odd?
      return (left_max + [a_right, b_right].min) / 2.0
    end
    if a_left > b_right
      hi = i - 1
    else
      lo = i + 1
    end
  end
end
`,
  },
  'longest-palindromic-substring': {
    starter: `def longest_palindrome(s)
  # your code
  ''
end
`,
    solution: `def longest_palindrome(s)
  best_start = 0
  best_len = 0
  expand = lambda do |l, r|
    while l >= 0 && r < s.length && s[l] == s[r]
      l -= 1
      r += 1
    end
    len = r - l - 1
    if len > best_len
      best_len = len
      best_start = l + 1
    end
  end
  s.length.times do |i|
    expand.call(i, i)
    expand.call(i, i + 1)
  end
  s[best_start, best_len]
end
`,
  },
  'string-compression': {
    starter: `def compress(s)
  # your code
  s
end
`,
    solution: `def compress(s)
  parts = []
  i = 0
  while i < s.length
    j = i
    j += 1 while j < s.length && s[j] == s[i]
    parts << (j - i == 1 ? s[i] : "#{s[i]}#{j - i}")
    i = j
  end
  out = parts.join
  out.length < s.length ? out : s
end
`,
  },
  'merge-two-sorted-lists': {
    starter: LIST_NODE + `def merge_two_lists(l1, l2)
  # your code
  nil
end
`,
    solution: LIST_NODE + `def merge_two_lists(l1, l2)
  dummy = ListNode.new
  tail = dummy
  while l1 && l2
    if l1.val <= l2.val
      tail.next = l1
      l1 = l1.next
    else
      tail.next = l2
      l2 = l2.next
    end
    tail = tail.next
  end
  tail.next = l1 || l2
  dummy.next
end
`,
  },
  'remove-nth-from-end': {
    starter: LIST_NODE + `def remove_nth_from_end(head, n)
  # your code
  head
end
`,
    solution: LIST_NODE + `def remove_nth_from_end(head, n)
  dummy = ListNode.new(0, head)
  lead = dummy
  trail = dummy
  (n + 1).times { lead = lead.next }
  while lead
    lead = lead.next
    trail = trail.next
  end
  trail.next = trail.next.next
  dummy.next
end
`,
  },
  'add-two-numbers': {
    starter: LIST_NODE + `def add_two_numbers(l1, l2)
  # your code
  nil
end
`,
    solution: LIST_NODE + `def add_two_numbers(l1, l2)
  dummy = ListNode.new
  tail = dummy
  carry = 0
  while l1 || l2 || carry > 0
    sum = (l1 ? l1.val : 0) + (l2 ? l2.val : 0) + carry
    carry = sum / 10
    tail.next = ListNode.new(sum % 10)
    tail = tail.next
    l1 = l1&.next
    l2 = l2&.next
  end
  dummy.next
end
`,
  },
  'merge-k-sorted-lists': {
    starter: LIST_NODE + `def merge_k_lists(lists)
  # your code
  nil
end
`,
    solution: LIST_NODE + `# A small binary min-heap of nodes ordered by val (Ruby's standard library has none).
class MinHeap
  def initialize
    @a = []
  end

  def size
    @a.length
  end

  def push(node)
    @a << node
    i = @a.length - 1
    while i > 0
      p = (i - 1) / 2
      break if @a[p].val <= @a[i].val
      @a[p], @a[i] = @a[i], @a[p]
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
        m = l if l < @a.length && @a[l].val < @a[m].val
        m = r if r < @a.length && @a[r].val < @a[m].val
        break if m == i
        @a[m], @a[i] = @a[i], @a[m]
        i = m
      end
    end
    top
  end
end

def merge_k_lists(lists)
  heap = MinHeap.new
  lists.each { |l| heap.push(l) if l }
  dummy = ListNode.new
  tail = dummy
  while heap.size > 0
    n = heap.pop
    tail.next = n
    tail = n
    heap.push(n.next) if n.next
  end
  dummy.next
end
`,
  },
  'max-depth-binary-tree': {
    starter: TREE_NODE + `def max_depth(root)
  # your code
  0
end
`,
    solution: TREE_NODE + `def max_depth(root)
  root ? 1 + [max_depth(root.left), max_depth(root.right)].max : 0
end
`,
  },
  'invert-binary-tree': {
    starter: TREE_NODE + `def invert_tree(root)
  # your code
  root
end
`,
    solution: TREE_NODE + `def invert_tree(root)
  return nil unless root
  left = root.left
  root.left = invert_tree(root.right)
  root.right = invert_tree(left)
  root
end
`,
  },
  'diameter-binary-tree': {
    starter: TREE_NODE + `def diameter_of_binary_tree(root)
  # your code
  0
end
`,
    solution: TREE_NODE + `def diameter_of_binary_tree(root)
  best = 0
  height = lambda do |n|
    return 0 unless n
    l = height.call(n.left)
    r = height.call(n.right)
    best = [best, l + r].max
    1 + [l, r].max
  end
  height.call(root)
  best
end
`,
  },
  'same-tree': {
    starter: TREE_NODE + `def is_same_tree(p, q)
  # your code
  false
end
`,
    solution: TREE_NODE + `def is_same_tree(p, q)
  return p.nil? && q.nil? if p.nil? || q.nil?
  p.val == q.val && is_same_tree(p.left, q.left) && is_same_tree(p.right, q.right)
end
`,
  },
  'lca-bst': {
    starter: TREE_NODE + `# The value of the lowest common ancestor of p and q (values) in the BST, or nil.
def lowest_common_ancestor(root, p, q)
  # your code
  nil
end
`,
    solution: TREE_NODE + `def lowest_common_ancestor(root, p, q)
  n = root
  while n
    if p < n.val && q < n.val
      n = n.left
    elsif p > n.val && q > n.val
      n = n.right
    else
      return n.val
    end
  end
  nil
end
`,
  },
  'kth-smallest-bst': {
    starter: TREE_NODE + `def kth_smallest(root, k)
  # your code
  0
end
`,
    solution: TREE_NODE + `def kth_smallest(root, k)
  stack = []
  n = root
  while n || !stack.empty?
    while n
      stack << n
      n = n.left
    end
    n = stack.pop
    k -= 1
    return n.val if k.zero?
    n = n.right
  end
  -1
end
`,
  },
  'build-tree-preorder-inorder': {
    starter: TREE_NODE + `def build_tree(preorder, inorder)
  # your code
  nil
end
`,
    solution: TREE_NODE + `def build_tree(preorder, inorder)
  at = {}
  inorder.each_with_index { |v, i| at[v] = i }
  pre = 0
  build = lambda do |lo, hi|
    return nil if lo > hi
    val = preorder[pre]
    pre += 1
    mid = at[val]
    TreeNode.new(val, build.call(lo, mid - 1), build.call(mid + 1, hi))
  end
  build.call(0, inorder.length - 1)
end
`,
  },
  'k-closest-points': {
    starter: `def k_closest(points, k)
  # your code
  []
end
`,
    solution: `def k_closest(points, k)
  d = ->(p) { p[0] * p[0] + p[1] * p[1] }
  heap = [] # max-heap by distance
  up = lambda do |i|
    while i > 0
      p = (i - 1) / 2
      break if d.call(heap[p]) >= d.call(heap[i])
      heap[p], heap[i] = heap[i], heap[p]
      i = p
    end
  end
  down = lambda do |i|
    loop do
      l = 2 * i + 1
      r = l + 1
      m = i
      m = l if l < heap.length && d.call(heap[l]) > d.call(heap[m])
      m = r if r < heap.length && d.call(heap[r]) > d.call(heap[m])
      return if m == i
      heap[m], heap[i] = heap[i], heap[m]
      i = m
    end
  end
  points.each do |p|
    if heap.length < k
      heap << p
      up.call(heap.length - 1)
    elsif d.call(p) < d.call(heap[0])
      heap[0] = p
      down.call(0)
    end
  end
  heap
end
`,
  },
  'task-scheduler': {
    starter: `def least_interval(tasks, n)
  # your code
  0
end
`,
    solution: `def least_interval(tasks, n)
  counts = Hash.new(0)
  tasks.each { |t| counts[t] += 1 }
  max = counts.values.max
  tied = counts.values.count(max)
  [tasks.length, (max - 1) * (n + 1) + tied].max
end
`,
  },
  'median-data-stream': {
    starter: `class MedianFinder
  def initialize
    # your fields
  end

  def add_num(num)
    # your code
  end

  def find_median
    # your code
    0
  end
end

# Test driver. Leave as is.
def run_median(ops, args)
  m = MedianFinder.new
  ops.each_with_index.map { |op, i| op == 'add' ? (m.add_num(args[i]); nil) : m.find_median }
end
`,
    solution: `# A binary heap ordered by the block (Ruby's standard library has none).
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
end

class MedianFinder
  def initialize
    @low = Heap.new { |x, y| x > y }  # max-heap
    @high = Heap.new { |x, y| x < y } # min-heap
  end

  def add_num(num)
    if @low.size.zero? || num <= @low.peek
      @low.push(num)
    else
      @high.push(num)
    end
    if @low.size > @high.size + 1
      @high.push(@low.pop)
    elsif @high.size > @low.size
      @low.push(@high.pop)
    end
  end

  def find_median
    return @low.peek if @low.size > @high.size
    (@low.peek + @high.peek) / 2.0
  end
end

# Test driver. Leave as is.
def run_median(ops, args)
  m = MedianFinder.new
  ops.each_with_index.map { |op, i| op == 'add' ? (m.add_num(args[i]); nil) : m.find_median }
end
`,
  },
  'add-search-words': {
    starter: `class WordDictionary
  def initialize
    # your fields
  end

  def add_word(word)
    # your code
  end

  def search(word)
    # your code
    false
  end
end

# Test driver. Leave as is.
def run_dict(ops, args)
  d = WordDictionary.new
  ops.each_with_index.map { |op, i| op == 'add' ? (d.add_word(args[i]); nil) : d.search(args[i]) }
end
`,
    solution: `class WordDictionary
  Node = Struct.new(:children, :end)

  def initialize
    @root = Node.new({}, false)
  end

  def add_word(word)
    n = @root
    word.each_char do |ch|
      n.children[ch] ||= Node.new({}, false)
      n = n.children[ch]
    end
    n.end = true
  end

  def search(word)
    dfs = lambda do |n, i|
      return n.end if i == word.length
      ch = word[i]
      if ch == '.'
        return n.children.values.any? { |child| dfs.call(child, i + 1) }
      end
      nxt = n.children[ch]
      nxt ? dfs.call(nxt, i + 1) : false
    end
    dfs.call(@root, 0)
  end
end

# Test driver. Leave as is.
def run_dict(ops, args)
  d = WordDictionary.new
  ops.each_with_index.map { |op, i| op == 'add' ? (d.add_word(args[i]); nil) : d.search(args[i]) }
end
`,
  },
  'rotting-oranges': {
    starter: `def oranges_rotting(grid)
  # your code
  -1
end
`,
    solution: `def oranges_rotting(grid)
  rows = grid.length
  cols = grid[0].length
  queue = []
  fresh = 0
  rows.times do |r|
    cols.times do |c|
      if grid[r][c] == 2
        queue << [r, c]
      elsif grid[r][c] == 1
        fresh += 1
      end
    end
  end
  minutes = 0
  dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  while !queue.empty? && fresh > 0
    nxt = []
    queue.each do |r, c|
      dirs.each do |dr, dc|
        nr = r + dr
        nc = c + dc
        next if nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] != 1
        grid[nr][nc] = 2
        fresh -= 1
        nxt << [nr, nc]
      end
    end
    queue = nxt
    minutes += 1
  end
  fresh.zero? ? minutes : -1
end
`,
  },
  'pacific-atlantic': {
    starter: `def pacific_atlantic(heights)
  # your code
  []
end
`,
    solution: `def pacific_atlantic(heights)
  rows = heights.length
  cols = heights[0].length
  mark = -> { Array.new(rows) { Array.new(cols, false) } }
  pac = mark.call
  atl = mark.call
  dfs = lambda do |r, c, seen|
    seen[r][c] = true
    [[1, 0], [-1, 0], [0, 1], [0, -1]].each do |dr, dc|
      nr = r + dr
      nc = c + dc
      next if nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen[nr][nc] || heights[nr][nc] < heights[r][c]
      dfs.call(nr, nc, seen)
    end
  end
  rows.times do |r|
    dfs.call(r, 0, pac)
    dfs.call(r, cols - 1, atl)
  end
  cols.times do |c|
    dfs.call(0, c, pac)
    dfs.call(rows - 1, c, atl)
  end
  out = []
  rows.times { |r| cols.times { |c| out << [r, c] if pac[r][c] && atl[r][c] } }
  out
end
`,
  },
  'clone-graph-adjacency': {
    starter: `# graph is a Hash from node id (a String) to the list of neighbour ids. Return a deep copy.
def clone_graph(graph)
  # your code
  graph
end

# Test driver. Leave as is.
def check(graph)
  copy = clone_graph(graph)
  equal = copy == graph
  shared = copy.equal?(graph) || graph.keys.any? { |k| copy[k].equal?(graph[k]) }
  { 'equal' => equal, 'shared' => shared }
end
`,
    solution: `def clone_graph(graph)
  seen = {}
  visit = lambda do |k|
    return seen[k] if seen.key?(k)
    copy = []
    seen[k] = copy
    (graph[k] || []).each do |n|
      copy << n
      visit.call(n.to_s)
    end
    copy
  end
  graph.each_key { |k| visit.call(k) }
  graph.keys.to_h { |k| [k, seen[k]] }
end

# Test driver. Leave as is.
def check(graph)
  copy = clone_graph(graph)
  equal = copy == graph
  shared = copy.equal?(graph) || graph.keys.any? { |k| copy[k].equal?(graph[k]) }
  { 'equal' => equal, 'shared' => shared }
end
`,
  },
  'network-delay-time': {
    starter: `def network_delay_time(times, n, k)
  # your code
  -1
end
`,
    solution: `def network_delay_time(times, n, k)
  adj = Hash.new { |h, key| h[key] = [] }
  times.each { |u, v, w| adj[u] << [v, w] }
  dist = Array.new(n + 1, Float::INFINITY)
  dist[k] = 0
  # A simple O(n^2) selection; with a heap this is O(E log V).
  done = Array.new(n + 1, false)
  n.times do
    u = -1
    (1..n).each { |i| u = i if !done[i] && (u == -1 || dist[i] < dist[u]) }
    break if u == -1 || dist[u] == Float::INFINITY
    done[u] = true
    adj[u].each { |v, w| dist[v] = dist[u] + w if dist[u] + w < dist[v] }
  end
  worst = dist.drop(1).max
  worst == Float::INFINITY ? -1 : worst
end
`,
  },
  'cheapest-flights-k-stops': {
    starter: `def find_cheapest_price(n, flights, src, dst, k)
  # your code
  -1
end
`,
    solution: `def find_cheapest_price(n, flights, src, dst, k)
  dist = Array.new(n, Float::INFINITY)
  dist[src] = 0
  (k + 1).times do
    nxt = dist.dup
    flights.each { |u, v, w| nxt[v] = dist[u] + w if dist[u] + w < nxt[v] }
    dist = nxt
  end
  dist[dst] == Float::INFINITY ? -1 : dist[dst]
end
`,
  },
  'word-ladder': {
    starter: `def ladder_length(begin_word, end_word, word_list)
  # your code
  0
end
`,
    solution: `require 'set'

def ladder_length(begin_word, end_word, word_list)
  words = word_list.to_set
  return 0 unless words.include?(end_word)
  frontier = [begin_word]
  words.delete(begin_word)
  steps = 1
  until frontier.empty?
    nxt = []
    frontier.each do |w|
      return steps if w == end_word
      w.length.times do |i|
        ('a'..'z').each do |c|
          cand = w[0...i] + c + w[i + 1..]
          nxt << cand if words.delete?(cand)
        end
      end
    end
    frontier = nxt
    steps += 1
  end
  0
end
`,
  },
  'climbing-stairs': {
    starter: `def climb_stairs(n)
  # your code
  0
end
`,
    solution: `def climb_stairs(n)
  a = 1
  b = 1
  n.times { a, b = b, a + b }
  a
end
`,
  },
  'house-robber': {
    starter: `def rob(nums)
  # your code
  0
end
`,
    solution: `def rob(nums)
  skip = 0
  take = 0
  nums.each { |n| skip, take = [skip, take].max, skip + n }
  [skip, take].max
end
`,
  },
  'longest-increasing-subsequence': {
    starter: `def length_of_lis(nums)
  # your code
  0
end
`,
    solution: `def length_of_lis(nums)
  tails = []
  nums.each do |n|
    lo = 0
    hi = tails.length
    while lo < hi
      mid = (lo + hi) / 2
      if tails[mid] < n
        lo = mid + 1
      else
        hi = mid
      end
    end
    tails[lo] = n
  end
  tails.length
end
`,
  },
  'word-break': {
    starter: `def word_break(s, word_dict)
  # your code
  false
end
`,
    solution: `require 'set'

def word_break(s, word_dict)
  words = word_dict.to_set
  max_len = word_dict.map(&:length).max || 0
  dp = Array.new(s.length + 1, false)
  dp[0] = true
  (1..s.length).each do |i|
    ([0, i - max_len].max...i).each do |j|
      if dp[j] && words.include?(s[j...i])
        dp[i] = true
        break
      end
    end
  end
  dp[s.length]
end
`,
  },
  'decode-ways': {
    starter: `def num_decodings(s)
  # your code
  0
end
`,
    solution: `def num_decodings(s)
  return 0 if s.empty? || s[0] == '0'
  prev2 = 1 # ways for prefix length i-2
  prev1 = 1 # ways for prefix length i-1
  (1...s.length).each do |i|
    cur = 0
    cur += prev1 if s[i] != '0'
    pair = s[i - 1, 2].to_i
    cur += prev2 if pair >= 10 && pair <= 26
    prev2 = prev1
    prev1 = cur
  end
  prev1
end
`,
  },
  'partition-equal-subset': {
    starter: `def can_partition(nums)
  # your code
  false
end
`,
    solution: `def can_partition(nums)
  total = nums.sum
  return false if total.odd?
  target = total / 2
  can = Array.new(target + 1, false)
  can[0] = true
  nums.each do |n|
    target.downto(n) { |s| can[s] = true if can[s - n] }
    return true if can[target]
  end
  can[target]
end
`,
  },
  'unique-paths': {
    starter: `def unique_paths(m, n)
  # your code
  0
end
`,
    solution: `def unique_paths(m, n)
  row = Array.new(n, 1)
  (1...m).each { (1...n).each { |c| row[c] += row[c - 1] } }
  row[n - 1]
end
`,
  },
  'edit-distance': {
    starter: `def min_distance(word1, word2)
  # your code
  0
end
`,
    solution: `def min_distance(word1, word2)
  m = word1.length
  n = word2.length
  prev = (0..n).to_a
  (1..m).each do |i|
    cur = Array.new(n + 1)
    cur[0] = i
    (1..n).each do |j|
      cur[j] = word1[i - 1] == word2[j - 1] ? prev[j - 1] : 1 + [prev[j - 1], prev[j], cur[j - 1]].min
    end
    prev = cur
  end
  prev[n]
end
`,
  },
  'subsets': {
    starter: `def subsets(nums)
  # your code
  []
end
`,
    solution: `def subsets(nums)
  out = []
  path = []
  go = lambda do |start|
    out << path.dup
    (start...nums.length).each do |i|
      path << nums[i]
      go.call(i + 1)
      path.pop
    end
  end
  go.call(0)
  out
end
`,
  },
  'combination-sum': {
    starter: `def combination_sum(candidates, target)
  # your code
  []
end
`,
    solution: `def combination_sum(candidates, target)
  out = []
  path = []
  go = lambda do |start, remaining|
    if remaining.zero?
      out << path.dup
      return
    end
    (start...candidates.length).each do |i|
      next if candidates[i] > remaining
      path << candidates[i]
      go.call(i, remaining - candidates[i])
      path.pop
    end
  end
  go.call(0, target)
  out
end
`,
  },
  'word-search': {
    starter: `def exist(board, word)
  # your code
  false
end
`,
    solution: `def exist(board, word)
  rows = board.length
  cols = board[0].length
  dfs = lambda do |r, c, i|
    return true if i == word.length
    return false if r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] != word[i]
    saved = board[r][c]
    board[r][c] = '#'
    found = dfs.call(r + 1, c, i + 1) || dfs.call(r - 1, c, i + 1) || dfs.call(r, c + 1, i + 1) || dfs.call(r, c - 1, i + 1)
    board[r][c] = saved
    found
  end
  rows.times { |r| cols.times { |c| return true if dfs.call(r, c, 0) } }
  false
end
`,
  },
  'n-queens': {
    starter: `def total_n_queens(n)
  # your code
  0
end
`,
    solution: `require 'set'

def total_n_queens(n)
  cols = Set.new
  diag = Set.new
  anti = Set.new
  count = 0
  place = lambda do |r|
    if r == n
      count += 1
      return
    end
    n.times do |c|
      next if cols.include?(c) || diag.include?(r - c) || anti.include?(r + c)
      cols << c
      diag << r - c
      anti << r + c
      place.call(r + 1)
      cols.delete(c)
      diag.delete(r - c)
      anti.delete(r + c)
    end
  end
  place.call(0)
  count
end
`,
  },
  'gas-station': {
    starter: `def can_complete_circuit(gas, cost)
  # your code
  -1
end
`,
    solution: `def can_complete_circuit(gas, cost)
  total = 0
  tank = 0
  start = 0
  gas.each_index do |i|
    diff = gas[i] - cost[i]
    total += diff
    tank += diff
    if tank < 0
      start = i + 1
      tank = 0
    end
  end
  total >= 0 ? start : -1
end
`,
  },
  'partition-labels': {
    starter: `def partition_labels(s)
  # your code
  []
end
`,
    solution: `def partition_labels(s)
  last = {}
  s.each_char.with_index { |ch, i| last[ch] = i }
  out = []
  start = 0
  finish = 0
  s.each_char.with_index do |ch, i|
    finish = [finish, last[ch]].max
    if i == finish
      out << finish - start + 1
      start = i + 1
    end
  end
  out
end
`,
  },
  'insert-interval': {
    starter: `def insert(intervals, new_interval)
  # your code
  []
end
`,
    solution: `def insert(intervals, new_interval)
  out = []
  s, e = new_interval
  i = 0
  while i < intervals.length && intervals[i][1] < s
    out << intervals[i]
    i += 1
  end
  while i < intervals.length && intervals[i][0] <= e
    s = [s, intervals[i][0]].min
    e = [e, intervals[i][1]].max
    i += 1
  end
  out << [s, e]
  while i < intervals.length
    out << intervals[i]
    i += 1
  end
  out
end
`,
  },
  'non-overlapping-intervals': {
    starter: `def erase_overlap_intervals(intervals)
  # your code
  0
end
`,
    solution: `def erase_overlap_intervals(intervals)
  removed = 0
  finish = -Float::INFINITY
  intervals.sort_by { |iv| iv[1] }.each do |s, e|
    if s >= finish
      finish = e
    else
      removed += 1
    end
  end
  removed
end
`,
  },
  'meeting-rooms-ii': {
    starter: `def min_meeting_rooms(intervals)
  # your code
  0
end
`,
    solution: `def min_meeting_rooms(intervals)
  starts = intervals.map(&:first).sort
  ends = intervals.map(&:last).sort
  rooms = 0
  best = 0
  e = 0
  starts.each do |s|
    if s < ends[e]
      rooms += 1
    else
      e += 1
    end
    best = [best, rooms].max
  end
  best
end
`,
  },
  'counting-bits': {
    starter: `def count_bits(n)
  # your code
  []
end
`,
    solution: `def count_bits(n)
  out = Array.new(n + 1, 0)
  (1..n).each { |i| out[i] = out[i >> 1] + (i & 1) }
  out
end
`,
  },
  'reverse-bits': {
    starter: `# Reverse the 32 bits of n (an unsigned 32-bit integer).
def reverse_bits(n)
  # your code
  0
end
`,
    solution: `def reverse_bits(n)
  out = 0
  32.times do
    out = (out << 1) | (n & 1)
    n >>= 1
  end
  out
end
`,
  },
  'rotate-image': {
    starter: `# Rotate the matrix 90 degrees clockwise in place, and return it.
def rotate(matrix)
  # your code (in place)
  matrix
end
`,
    solution: `def rotate(matrix)
  n = matrix.length
  n.times do |i|
    ((i + 1)...n).each do |j|
      matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    end
  end
  matrix.each(&:reverse!)
  matrix
end
`,
  },
  'spiral-matrix': {
    starter: `def spiral_order(matrix)
  # your code
  []
end
`,
    solution: `def spiral_order(matrix)
  out = []
  top = 0
  bottom = matrix.length - 1
  left = 0
  right = (matrix[0]&.length || 0) - 1
  while top <= bottom && left <= right
    (left..right).each { |c| out << matrix[top][c] }
    top += 1
    (top..bottom).each { |r| out << matrix[r][right] }
    right -= 1
    if top <= bottom
      right.downto(left) { |c| out << matrix[bottom][c] }
      bottom -= 1
    end
    if left <= right
      bottom.downto(top) { |r| out << matrix[r][left] }
      left += 1
    end
  end
  out
end
`,
  },
  'set-matrix-zeroes': {
    starter: `# Zero every row and column that contains a zero, in place, and return the matrix.
def set_zeroes(matrix)
  # your code (in place)
  matrix
end
`,
    solution: `def set_zeroes(matrix)
  m = matrix.length
  n = matrix[0].length
  first_row = (0...n).any? { |j| matrix[0][j].zero? }
  first_col = (0...m).any? { |i| matrix[i][0].zero? }
  (1...m).each do |i|
    (1...n).each do |j|
      next unless matrix[i][j].zero?
      matrix[i][0] = 0
      matrix[0][j] = 0
    end
  end
  (1...m).each do |i|
    (1...n).each do |j|
      matrix[i][j] = 0 if matrix[i][0].zero? || matrix[0][j].zero?
    end
  end
  n.times { |j| matrix[0][j] = 0 } if first_row
  m.times { |i| matrix[i][0] = 0 } if first_col
  matrix
end
`,
  },
  'pow-x-n': {
    starter: `# x raised to the integer power n, as a Float.
def my_pow(x, n)
  # your code
  0.0
end
`,
    solution: `def my_pow(x, n)
  base = n < 0 ? 1.0 / x : x.to_f
  e = n.abs
  result = 1.0
  while e > 0
    result *= base if e.odd?
    base *= base
    e /= 2
  end
  result
end
`,
  },
}
