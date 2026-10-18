import type { Port } from '../types.ts'

/**
 * The coding problems in Java: a starter and a reference solution per
 * problem id, mirroring the TypeScript versions. Each file holds a
 * non-public `class Solution` with the tested method (the same camelCase
 * name as the TypeScript export), plus ListNode / TreeNode as top-level
 * classes where needed. `server/content.test.ts` compiles and runs every
 * solution here against the problem's tests.
 */

const IMPORTS = `import java.util.*;

`

const LIST_NODE = `class ListNode {
  int val;
  ListNode next;
  ListNode() {}
  ListNode(int val) { this.val = val; }
  ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

`

const TREE_NODE = `class TreeNode {
  int val;
  TreeNode left;
  TreeNode right;
  TreeNode() {}
  TreeNode(int val) { this.val = val; }
  TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

`

export const JAVA_PORTS: Record<string, Port> = {
  'two-sum': {
    starter: IMPORTS + `class Solution {
  /** Return the indices of the two numbers in nums that sum to target. */
  public int[] twoSum(int[] nums, int target) {
    // your code
    return new int[0];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
      int complement = target - nums[i];
      if (seen.containsKey(complement)) return new int[] { seen.get(complement), i };
      seen.put(nums[i], i);
    }
    throw new IllegalArgumentException("no two-sum solution exists");
  }
}
`,
  },
  'max-profit-stock': {
    starter: IMPORTS + `class Solution {
  /** Maximum profit from at most one buy/sell transaction. */
  public int maxProfit(int[] prices) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int maxProfit(int[] prices) {
    int minSoFar = Integer.MAX_VALUE;
    int best = 0;
    for (int price : prices) {
      minSoFar = Math.min(minSoFar, price);
      best = Math.max(best, price - minSoFar);
    }
    return best;
  }
}
`,
  },
  '3sum': {
    starter: IMPORTS + `class Solution {
  /** All unique triplets in nums that sum to zero. */
  public List<List<Integer>> threeSum(int[] nums) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + `class Solution {
  public List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> result = new ArrayList<>();
    for (int i = 0; i < nums.length - 2; i++) {
      if (i > 0 && nums[i] == nums[i - 1]) continue;
      int left = i + 1;
      int right = nums.length - 1;
      while (left < right) {
        int sum = nums[i] + nums[left] + nums[right];
        if (sum < 0) left++;
        else if (sum > 0) right--;
        else {
          result.add(Arrays.asList(nums[i], nums[left], nums[right]));
          while (left < right && nums[left] == nums[left + 1]) left++;
          while (left < right && nums[right] == nums[right - 1]) right--;
          left++;
          right--;
        }
      }
    }
    return result;
  }
}
`,
  },
  'valid-parentheses': {
    starter: IMPORTS + `class Solution {
  /** Whether s is a valid sequence of matched parentheses. */
  public boolean isValid(String s) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean isValid(String s) {
    Map<Character, Character> closeToOpen = Map.of(')', '(', ']', '[', '}', '{');
    Deque<Character> stack = new ArrayDeque<>();
    for (char ch : s.toCharArray()) {
      if (closeToOpen.containsKey(ch)) {
        if (stack.isEmpty() || stack.pop() != closeToOpen.get(ch)) return false;
      } else {
        stack.push(ch);
      }
    }
    return stack.isEmpty();
  }
}
`,
  },
  'longest-substring-without-repeating': {
    starter: IMPORTS + `class Solution {
  /** Length of the longest substring of s with no repeating characters. */
  public int lengthOfLongestSubstring(String s) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastSeen = new HashMap<>();
    int left = 0;
    int best = 0;
    for (int right = 0; right < s.length(); right++) {
      char ch = s.charAt(right);
      Integer prev = lastSeen.get(ch);
      if (prev != null && prev >= left) left = prev + 1;
      lastSeen.put(ch, right);
      best = Math.max(best, right - left + 1);
    }
    return best;
  }
}
`,
  },
  'sliding-window-maximum': {
    starter: IMPORTS + `class Solution {
  /** Maximum of each sliding window of size k. */
  public int[] maxSlidingWindow(int[] nums, int k) {
    // your code
    return new int[0];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[] maxSlidingWindow(int[] nums, int k) {
    Deque<Integer> deque = new ArrayDeque<>(); // indices, values strictly decreasing
    int[] result = new int[nums.length - k + 1];
    for (int right = 0; right < nums.length; right++) {
      while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[right]) deque.pollLast();
      deque.addLast(right);
      if (deque.peekFirst() <= right - k) deque.pollFirst();
      if (right >= k - 1) result[right - k + 1] = nums[deque.peekFirst()];
    }
    return result;
  }
}
`,
  },
  'merge-intervals': {
    starter: IMPORTS + `class Solution {
  /** Merge all overlapping intervals. */
  public int[][] merge(int[][] intervals) {
    // your code
    return new int[0][];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> merged = new ArrayList<>();
    for (int[] interval : intervals) {
      int[] last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
      if (last != null && interval[0] <= last[1]) {
        last[1] = Math.max(last[1], interval[1]);
      } else {
        merged.add(new int[] { interval[0], interval[1] });
      }
    }
    return merged.toArray(new int[0][]);
  }
}
`,
  },
  'reverse-linked-list': {
    starter: IMPORTS + LIST_NODE + `class Solution {
  /** Reverse a singly linked list and return the new head. */
  public ListNode reverseList(ListNode head) {
    // your code
    return null;
  }
}
`,
    solution: IMPORTS + LIST_NODE + `class Solution {
  public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    while (curr != null) {
      ListNode next = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    return prev;
  }
}
`,
  },
  'linked-list-cycle': {
    starter: IMPORTS + LIST_NODE + `class Solution {
  /** Whether the linked list contains a cycle. */
  public boolean hasCycle(ListNode head) {
    // your code
    return false;
  }

  /** Test driver. Leave as is: builds the list and links the tail to node pos (-1 for none). */
  public boolean hasCycleAt(int[] vals, int pos) {
    ListNode[] nodes = new ListNode[vals.length];
    for (int i = 0; i < vals.length; i++) nodes[i] = new ListNode(vals[i]);
    for (int i = 0; i + 1 < vals.length; i++) nodes[i].next = nodes[i + 1];
    if (pos >= 0 && vals.length > 0) nodes[vals.length - 1].next = nodes[pos];
    return hasCycle(vals.length > 0 ? nodes[0] : null);
  }
}
`,
    solution: IMPORTS + LIST_NODE + `class Solution {
  public boolean hasCycle(ListNode head) {
    ListNode slow = head;
    ListNode fast = head;
    while (fast != null && fast.next != null) {
      slow = slow.next;
      fast = fast.next.next;
      if (slow == fast) return true;
    }
    return false;
  }

  /** Test driver. Leave as is: builds the list and links the tail to node pos (-1 for none). */
  public boolean hasCycleAt(int[] vals, int pos) {
    ListNode[] nodes = new ListNode[vals.length];
    for (int i = 0; i < vals.length; i++) nodes[i] = new ListNode(vals[i]);
    for (int i = 0; i + 1 < vals.length; i++) nodes[i].next = nodes[i + 1];
    if (pos >= 0 && vals.length > 0) nodes[vals.length - 1].next = nodes[pos];
    return hasCycle(vals.length > 0 ? nodes[0] : null);
  }
}
`,
  },
  'binary-search': {
    starter: IMPORTS + `class Solution {
  /** Index of target in sorted nums, or -1 if absent. Must be O(log n). */
  public int search(int[] nums, int target) {
    // your code
    return -1;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int search(int[] nums, int target) {
    int lo = 0;
    int hi = nums.length - 1;
    while (lo <= hi) {
      int mid = lo + ((hi - lo) >> 1);
      if (nums[mid] == target) return mid;
      if (nums[mid] < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }
}
`,
  },
  'max-subarray': {
    starter: IMPORTS + `class Solution {
  /** Largest sum of any contiguous subarray of nums. */
  public int maxSubArray(int[] nums) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int maxSubArray(int[] nums) {
    int bestHere = nums[0];
    int best = nums[0];
    for (int i = 1; i < nums.length; i++) {
      bestHere = Math.max(nums[i], bestHere + nums[i]);
      best = Math.max(best, bestHere);
    }
    return best;
  }
}
`,
  },
  'longest-common-subsequence': {
    starter: IMPORTS + `class Solution {
  /** Length of the longest common subsequence of text1 and text2. */
  public int longestCommonSubsequence(String text1, String text2) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int longestCommonSubsequence(String text1, String text2) {
    int m = text1.length();
    int n = text2.length();
    int[] prev = new int[n + 1];
    for (int i = m - 1; i >= 0; i--) {
      int[] curr = new int[n + 1];
      for (int j = n - 1; j >= 0; j--) {
        if (text1.charAt(i) == text2.charAt(j)) curr[j] = 1 + prev[j + 1];
        else curr[j] = Math.max(prev[j], curr[j + 1]);
      }
      prev = curr;
    }
    return prev[0];
  }
}
`,
  },
  'number-of-islands': {
    starter: IMPORTS + `class Solution {
  /** Number of 4-directionally-connected land regions in grid ('1' is land, '0' is water). */
  public int numIslands(char[][] grid) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int numIslands(char[][] grid) {
    if (grid.length == 0) return 0;
    int count = 0;
    for (int r = 0; r < grid.length; r++) {
      for (int c = 0; c < grid[0].length; c++) {
        if (grid[r][c] == '1') {
          count++;
          visit(grid, r, c);
        }
      }
    }
    return count;
  }

  private void visit(char[][] grid, int r, int c) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') return;
    grid[r][c] = '0';
    visit(grid, r + 1, c);
    visit(grid, r - 1, c);
    visit(grid, r, c + 1);
    visit(grid, r, c - 1);
  }
}
`,
  },
  'course-schedule': {
    starter: IMPORTS + `class Solution {
  /** Whether all numCourses can be taken given the prerequisites. */
  public boolean canFinish(int numCourses, int[][] prerequisites) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean canFinish(int numCourses, int[][] prerequisites) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
    int[] indegree = new int[numCourses];
    for (int[] p : prerequisites) {
      adj.get(p[1]).add(p[0]);
      indegree[p[0]]++;
    }
    Deque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) queue.add(i);
    int done = 0;
    while (!queue.isEmpty()) {
      int course = queue.poll();
      done++;
      for (int next : adj.get(course)) {
        if (--indegree[next] == 0) queue.add(next);
      }
    }
    return done == numCourses;
  }
}
`,
  },
  'permutations': {
    starter: IMPORTS + `class Solution {
  /** All permutations of nums, in any order. */
  public List<List<Integer>> permute(int[] nums) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + `class Solution {
  public List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, new boolean[nums.length], new ArrayList<>(), result);
    return result;
  }

  private void backtrack(int[] nums, boolean[] used, List<Integer> current, List<List<Integer>> result) {
    if (current.size() == nums.length) {
      result.add(new ArrayList<>(current));
      return;
    }
    for (int i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.add(nums[i]);
      backtrack(nums, used, current, result);
      current.remove(current.size() - 1);
      used[i] = false;
    }
  }
}
`,
  },
  'top-k-frequent-elements': {
    starter: IMPORTS + `class Solution {
  /** The k most frequent elements of nums, in any order. */
  public int[] topKFrequent(int[] nums, int k) {
    // your code
    return new int[0];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int n : nums) freq.merge(n, 1, Integer::sum);
    List<Map.Entry<Integer, Integer>> entries = new ArrayList<>(freq.entrySet());
    entries.sort((a, b) -> b.getValue() - a.getValue());
    int[] out = new int[k];
    for (int i = 0; i < k; i++) out[i] = entries.get(i).getKey();
    return out;
  }
}
`,
  },
  'daily-temperatures': {
    starter: IMPORTS + `class Solution {
  /** For each day, how many days until a warmer temperature (0 if never). */
  public int[] dailyTemperatures(int[] temperatures) {
    // your code
    return new int[0];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[] dailyTemperatures(int[] temperatures) {
    int[] answer = new int[temperatures.length];
    Deque<Integer> stack = new ArrayDeque<>(); // indices with no warmer day seen yet, temperatures decreasing
    for (int i = 0; i < temperatures.length; i++) {
      while (!stack.isEmpty() && temperatures[stack.peek()] < temperatures[i]) {
        int j = stack.pop();
        answer[j] = i - j;
      }
      stack.push(i);
    }
    return answer;
  }
}
`,
  },
  'subarray-sum-equals-k': {
    starter: IMPORTS + `class Solution {
  /** Count contiguous subarrays that sum to k. */
  public int subarraySum(int[] nums, int k) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> seen = new HashMap<>();
    seen.put(0, 1);
    int prefix = 0;
    int count = 0;
    for (int n : nums) {
      prefix += n;
      count += seen.getOrDefault(prefix - k, 0);
      seen.merge(prefix, 1, Integer::sum);
    }
    return count;
  }
}
`,
  },
  'connected-components': {
    starter: IMPORTS + `class Solution {
  /** Count connected components in an undirected graph. */
  public int countComponents(int n, int[][] edges) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  private int[] parent;

  public int countComponents(int n, int[][] edges) {
    parent = new int[n];
    int[] rank = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    int components = n;
    for (int[] e : edges) {
      int ra = find(e[0]);
      int rb = find(e[1]);
      if (ra == rb) continue;
      if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
      parent[rb] = ra;
      if (rank[ra] == rank[rb]) rank[ra]++;
      components--;
    }
    return components;
  }

  private int find(int x) {
    while (parent[x] != x) {
      parent[x] = parent[parent[x]]; // path halving
      x = parent[x];
    }
    return x;
  }
}
`,
  },
  'implement-trie': {
    starter: IMPORTS + `class Trie {
  // your fields

  public void insert(String word) {
    // your code
  }

  public boolean search(String word) {
    // your code
    return false;
  }

  public boolean startsWith(String prefix) {
    // your code
    return false;
  }
}

class Solution {
  /** Test driver: replays ops against a fresh Trie. Leave as is. */
  public Boolean[] runTrie(String[] ops, String[] args) {
    Trie t = new Trie();
    Boolean[] out = new Boolean[ops.length];
    for (int i = 0; i < ops.length; i++) {
      if (ops[i].equals("insert")) { t.insert(args[i]); out[i] = null; }
      else if (ops[i].equals("search")) out[i] = t.search(args[i]);
      else out[i] = t.startsWith(args[i]);
    }
    return out;
  }
}
`,
    solution: IMPORTS + `class Trie {
  private static class Node {
    final Map<Character, Node> children = new HashMap<>();
    boolean end;
  }

  private final Node root = new Node();

  public void insert(String word) {
    Node node = root;
    for (char ch : word.toCharArray()) node = node.children.computeIfAbsent(ch, k -> new Node());
    node.end = true;
  }

  private Node walk(String s) {
    Node node = root;
    for (char ch : s.toCharArray()) {
      node = node.children.get(ch);
      if (node == null) return null;
    }
    return node;
  }

  public boolean search(String word) {
    Node n = walk(word);
    return n != null && n.end;
  }

  public boolean startsWith(String prefix) {
    return walk(prefix) != null;
  }
}

class Solution {
  /** Test driver: replays ops against a fresh Trie. Leave as is. */
  public Boolean[] runTrie(String[] ops, String[] args) {
    Trie t = new Trie();
    Boolean[] out = new Boolean[ops.length];
    for (int i = 0; i < ops.length; i++) {
      if (ops[i].equals("insert")) { t.insert(args[i]); out[i] = null; }
      else if (ops[i].equals("search")) out[i] = t.search(args[i]);
      else out[i] = t.startsWith(args[i]);
    }
    return out;
  }
}
`,
  },
  'single-number': {
    starter: IMPORTS + `class Solution {
  /** Return the element that appears once (all others appear twice). */
  public int singleNumber(int[] nums) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int singleNumber(int[] nums) {
    int acc = 0;
    for (int n : nums) acc ^= n;
    return acc;
  }
}
`,
  },
  'jump-game': {
    starter: IMPORTS + `class Solution {
  /** Can you reach the last index? */
  public boolean canJump(int[] nums) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean canJump(int[] nums) {
    int reach = 0;
    for (int i = 0; i < nums.length; i++) {
      if (i > reach) return false;
      reach = Math.max(reach, i + nums[i]);
      if (reach >= nums.length - 1) return true;
    }
    return true;
  }
}
`,
  },
  'kth-largest-element': {
    starter: IMPORTS + `class Solution {
  /** The kth largest value in nums. */
  public int findKthLargest(int[] nums, int k) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int findKthLargest(int[] nums, int k) {
    int[] a = nums.clone();
    int target = a.length - k; // index in ascending order
    int lo = 0;
    int hi = a.length - 1;
    Random rnd = new Random();
    while (lo < hi) {
      int pivot = a[lo + rnd.nextInt(hi - lo + 1)];
      int i = lo;
      int j = hi;
      while (i <= j) {
        while (a[i] < pivot) i++;
        while (a[j] > pivot) j--;
        if (i <= j) {
          int t = a[i]; a[i] = a[j]; a[j] = t;
          i++;
          j--;
        }
      }
      if (target <= j) hi = j;
      else if (target >= i) lo = i;
      else return a[target];
    }
    return a[target];
  }
}
`,
  },
  'coin-change': {
    starter: IMPORTS + `class Solution {
  /** Fewest coins to make amount, or -1. */
  public int coinChange(int[] coins, int amount) {
    // your code
    return -1;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int coinChange(int[] coins, int amount) {
    int inf = amount + 1;
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, inf);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
      for (int c : coins) {
        if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
      }
    }
    return dp[amount] == inf ? -1 : dp[amount];
  }
}
`,
  },
  'level-order-traversal': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  /** Values level by level. */
  public List<List<Integer>> levelOrder(TreeNode root) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> out = new ArrayList<>();
    if (root == null) return out;
    List<TreeNode> queue = new ArrayList<>(List.of(root));
    while (!queue.isEmpty()) {
      List<Integer> level = new ArrayList<>();
      List<TreeNode> next = new ArrayList<>();
      for (TreeNode n : queue) {
        level.add(n.val);
        if (n.left != null) next.add(n.left);
        if (n.right != null) next.add(n.right);
      }
      out.add(level);
      queue = next;
    }
    return out;
  }
}
`,
  },
  'validate-bst': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  /** Is this a valid binary search tree? */
  public boolean isValidBST(TreeNode root) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  public boolean isValidBST(TreeNode root) {
    return ok(root, null, null);
  }

  private boolean ok(TreeNode n, Integer lo, Integer hi) {
    if (n == null) return true;
    if (lo != null && n.val <= lo) return false;
    if (hi != null && n.val >= hi) return false;
    return ok(n.left, lo, n.val) && ok(n.right, n.val, hi);
  }
}
`,
  },
  'search-rotated-array': {
    starter: IMPORTS + `class Solution {
  /** Index of target in a rotated sorted array, or -1. */
  public int searchRotated(int[] nums, int target) {
    // your code
    return -1;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int searchRotated(int[] nums, int target) {
    int lo = 0;
    int hi = nums.length - 1;
    while (lo <= hi) {
      int mid = (lo + hi) >>> 1;
      if (nums[mid] == target) return mid;
      if (nums[lo] <= nums[mid]) {
        // left half sorted
        if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
        else lo = mid + 1;
      } else {
        // right half sorted
        if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
        else hi = mid - 1;
      }
    }
    return -1;
  }
}
`,
  },
  'min-window-substring': {
    starter: IMPORTS + `class Solution {
  /** Shortest substring of s containing all characters of t. */
  public String minWindow(String s, String t) {
    // your code
    return "";
  }
}
`,
    solution: IMPORTS + `class Solution {
  public String minWindow(String s, String t) {
    if (t.length() > s.length()) return "";
    Map<Character, Integer> need = new HashMap<>();
    for (char ch : t.toCharArray()) need.merge(ch, 1, Integer::sum);
    Map<Character, Integer> have = new HashMap<>();
    int formed = 0;
    int bestStart = 0;
    int bestEnd = Integer.MAX_VALUE;
    int left = 0;
    for (int right = 0; right < s.length(); right++) {
      char ch = s.charAt(right);
      if (!need.containsKey(ch)) continue;
      have.merge(ch, 1, Integer::sum);
      if (have.get(ch).intValue() == need.get(ch).intValue()) formed++;
      while (formed == need.size()) {
        if (right - left < bestEnd - bestStart) { bestStart = left; bestEnd = right; }
        char l = s.charAt(left);
        if (need.containsKey(l)) {
          if (have.get(l).intValue() == need.get(l).intValue()) formed--;
          have.put(l, have.get(l) - 1);
        }
        left++;
      }
    }
    return bestEnd == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestEnd + 1);
  }
}
`,
  },
  'shortest-path-grid': {
    starter: IMPORTS + `class Solution {
  /** Length of the shortest open path from (0,0) to (rows-1, cols-1), or -1. */
  public int shortestPath(int[][] grid) {
    // your code
    return -1;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int shortestPath(int[][] grid) {
    int rows = grid.length;
    int cols = rows == 0 ? 0 : grid[0].length;
    if (rows == 0 || cols == 0 || grid[0][0] == 1 || grid[rows - 1][cols - 1] == 1) return -1;
    boolean[][] seen = new boolean[rows][cols];
    List<int[]> frontier = new ArrayList<>();
    frontier.add(new int[] { 0, 0 });
    seen[0][0] = true;
    int dist = 1;
    int[][] dirs = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
    while (!frontier.isEmpty()) {
      List<int[]> next = new ArrayList<>();
      for (int[] cell : frontier) {
        if (cell[0] == rows - 1 && cell[1] == cols - 1) return dist;
        for (int[] d : dirs) {
          int nr = cell[0] + d[0];
          int nc = cell[1] + d[1];
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen[nr][nc] || grid[nr][nc] == 1) continue;
          seen[nr][nc] = true;
          next.add(new int[] { nr, nc });
        }
      }
      frontier = next;
      dist++;
    }
    return -1;
  }
}
`,
  },
  'contains-duplicate': {
    starter: IMPORTS + `class Solution {
  public boolean containsDuplicate(int[] nums) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean containsDuplicate(int[] nums) {
    Set<Integer> seen = new HashSet<>();
    for (int n : nums) {
      if (!seen.add(n)) return true;
    }
    return false;
  }
}
`,
  },
  'valid-anagram': {
    starter: IMPORTS + `class Solution {
  public boolean isAnagram(String s, String t) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    Map<Character, Integer> counts = new HashMap<>();
    for (char ch : s.toCharArray()) counts.merge(ch, 1, Integer::sum);
    for (char ch : t.toCharArray()) {
      int n = counts.getOrDefault(ch, 0) - 1;
      if (n < 0) return false;
      counts.put(ch, n);
    }
    return true;
  }
}
`,
  },
  'group-anagrams': {
    starter: IMPORTS + `class Solution {
  public List<List<String>> groupAnagrams(String[] strs) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + `class Solution {
  public List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new LinkedHashMap<>();
    for (String s : strs) {
      int[] counts = new int[26];
      for (char ch : s.toCharArray()) counts[ch - 'a']++;
      String key = Arrays.toString(counts);
      groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(groups.values());
  }
}
`,
  },
  'product-except-self': {
    starter: IMPORTS + `class Solution {
  public int[] productExceptSelf(int[] nums) {
    // your code
    return new int[0];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[] productExceptSelf(int[] nums) {
    int[] out = new int[nums.length];
    int prefix = 1;
    for (int i = 0; i < nums.length; i++) {
      out[i] = prefix;
      prefix *= nums[i];
    }
    int suffix = 1;
    for (int i = nums.length - 1; i >= 0; i--) {
      out[i] *= suffix;
      suffix *= nums[i];
    }
    return out;
  }
}
`,
  },
  'longest-consecutive-sequence': {
    starter: IMPORTS + `class Solution {
  public int longestConsecutive(int[] nums) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int longestConsecutive(int[] nums) {
    Set<Integer> set = new HashSet<>();
    for (int n : nums) set.add(n);
    int best = 0;
    for (int n : set) {
      if (set.contains(n - 1)) continue;
      int len = 1;
      while (set.contains(n + len)) len++;
      best = Math.max(best, len);
    }
    return best;
  }
}
`,
  },
  'valid-palindrome': {
    starter: IMPORTS + `class Solution {
  public boolean isPalindrome(String s) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean isPalindrome(String s) {
    int i = 0;
    int j = s.length() - 1;
    while (i < j) {
      while (i < j && !Character.isLetterOrDigit(s.charAt(i))) i++;
      while (i < j && !Character.isLetterOrDigit(s.charAt(j))) j--;
      if (Character.toLowerCase(s.charAt(i)) != Character.toLowerCase(s.charAt(j))) return false;
      i++;
      j--;
    }
    return true;
  }
}
`,
  },
  'container-most-water': {
    starter: IMPORTS + `class Solution {
  public int maxArea(int[] height) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int maxArea(int[] height) {
    int i = 0;
    int j = height.length - 1;
    int best = 0;
    while (i < j) {
      best = Math.max(best, Math.min(height[i], height[j]) * (j - i));
      if (height[i] < height[j]) i++;
      else j--;
    }
    return best;
  }
}
`,
  },
  'trapping-rain-water': {
    starter: IMPORTS + `class Solution {
  public int trap(int[] height) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int trap(int[] height) {
    int l = 0;
    int r = height.length - 1;
    int leftMax = 0;
    int rightMax = 0;
    int water = 0;
    while (l < r) {
      if (height[l] < height[r]) {
        leftMax = Math.max(leftMax, height[l]);
        water += leftMax - height[l];
        l++;
      } else {
        rightMax = Math.max(rightMax, height[r]);
        water += rightMax - height[r];
        r--;
      }
    }
    return water;
  }
}
`,
  },
  'remove-duplicates-sorted': {
    starter: IMPORTS + `class Solution {
  /** Remove duplicates in place and return the number of unique values k; the first k slots hold them. */
  public int removeDuplicates(int[] nums) {
    // your code
    return nums.length;
  }

  /** Test driver. Leave as is. */
  public int[] run(int[] nums) {
    int k = removeDuplicates(nums);
    return Arrays.copyOf(nums, k);
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int removeDuplicates(int[] nums) {
    if (nums.length == 0) return 0;
    int write = 1;
    for (int read = 1; read < nums.length; read++) {
      if (nums[read] != nums[write - 1]) nums[write++] = nums[read];
    }
    return write;
  }

  /** Test driver. Leave as is. */
  public int[] run(int[] nums) {
    int k = removeDuplicates(nums);
    return Arrays.copyOf(nums, k);
  }
}
`,
  },
  'longest-repeating-replacement': {
    starter: IMPORTS + `class Solution {
  public int characterReplacement(String s, int k) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int characterReplacement(String s, int k) {
    int[] counts = new int[128];
    int left = 0;
    int maxFreq = 0;
    int best = 0;
    for (int right = 0; right < s.length(); right++) {
      int c = ++counts[s.charAt(right)];
      maxFreq = Math.max(maxFreq, c);
      while (right - left + 1 - maxFreq > k) {
        counts[s.charAt(left)]--;
        left++;
      }
      best = Math.max(best, right - left + 1);
    }
    return best;
  }
}
`,
  },
  'permutation-in-string': {
    starter: IMPORTS + `class Solution {
  public boolean checkInclusion(String s1, String s2) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean checkInclusion(String s1, String s2) {
    if (s1.length() > s2.length()) return false;
    int[] need = new int[26];
    int[] have = new int[26];
    for (int i = 0; i < s1.length(); i++) {
      need[s1.charAt(i) - 'a']++;
      have[s2.charAt(i) - 'a']++;
    }
    int matches = 0;
    for (int i = 0; i < 26; i++) if (need[i] == have[i]) matches++;
    for (int right = s1.length(); right < s2.length(); right++) {
      if (matches == 26) return true;
      int add = s2.charAt(right) - 'a';
      have[add]++;
      if (have[add] == need[add]) matches++;
      else if (have[add] == need[add] + 1) matches--;
      int drop = s2.charAt(right - s1.length()) - 'a';
      have[drop]--;
      if (have[drop] == need[drop]) matches++;
      else if (have[drop] == need[drop] - 1) matches--;
    }
    return matches == 26;
  }
}
`,
  },
  'max-consecutive-ones-iii': {
    starter: IMPORTS + `class Solution {
  public int longestOnes(int[] nums, int k) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int longestOnes(int[] nums, int k) {
    int left = 0;
    int zeros = 0;
    int best = 0;
    for (int right = 0; right < nums.length; right++) {
      if (nums[right] == 0) zeros++;
      while (zeros > k) {
        if (nums[left] == 0) zeros--;
        left++;
      }
      best = Math.max(best, right - left + 1);
    }
    return best;
  }
}
`,
  },
  'min-stack': {
    starter: IMPORTS + `class MinStack {
  public void push(int val) {
    // your code
  }
  public void pop() {
    // your code
  }
  public int top() {
    // your code
    return 0;
  }
  public int getMin() {
    // your code
    return 0;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Integer[] runMinStack(String[] ops, Integer[] args) {
    MinStack s = new MinStack();
    Integer[] out = new Integer[ops.length];
    for (int i = 0; i < ops.length; i++) {
      switch (ops[i]) {
        case "push": s.push(args[i]); out[i] = null; break;
        case "pop": s.pop(); out[i] = null; break;
        case "top": out[i] = s.top(); break;
        default: out[i] = s.getMin();
      }
    }
    return out;
  }
}
`,
    solution: IMPORTS + `class MinStack {
  private final Deque<int[]> stack = new ArrayDeque<>(); // {value, min so far}
  public void push(int val) {
    int min = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
    stack.push(new int[] { val, min });
  }
  public void pop() {
    stack.pop();
  }
  public int top() {
    return stack.peek()[0];
  }
  public int getMin() {
    return stack.peek()[1];
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Integer[] runMinStack(String[] ops, Integer[] args) {
    MinStack s = new MinStack();
    Integer[] out = new Integer[ops.length];
    for (int i = 0; i < ops.length; i++) {
      switch (ops[i]) {
        case "push": s.push(args[i]); out[i] = null; break;
        case "pop": s.pop(); out[i] = null; break;
        case "top": out[i] = s.top(); break;
        default: out[i] = s.getMin();
      }
    }
    return out;
  }
}
`,
  },
  'evaluate-rpn': {
    starter: IMPORTS + `class Solution {
  public int evalRPN(String[] tokens) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int evalRPN(String[] tokens) {
    Deque<Integer> stack = new ArrayDeque<>();
    for (String t : tokens) {
      switch (t) {
        case "+": { int b = stack.pop(), a = stack.pop(); stack.push(a + b); break; }
        case "-": { int b = stack.pop(), a = stack.pop(); stack.push(a - b); break; }
        case "*": { int b = stack.pop(), a = stack.pop(); stack.push(a * b); break; }
        case "/": { int b = stack.pop(), a = stack.pop(); stack.push(a / b); break; }
        default: stack.push(Integer.parseInt(t));
      }
    }
    return stack.pop();
  }
}
`,
  },
  'largest-rectangle-histogram': {
    starter: IMPORTS + `class Solution {
  public int largestRectangleArea(int[] heights) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int largestRectangleArea(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();
    int best = 0;
    for (int i = 0; i <= heights.length; i++) {
      int h = i == heights.length ? 0 : heights[i];
      while (!stack.isEmpty() && heights[stack.peek()] >= h) {
        int height = heights[stack.pop()];
        int left = stack.isEmpty() ? 0 : stack.peek() + 1;
        best = Math.max(best, height * (i - left));
      }
      stack.push(i);
    }
    return best;
  }
}
`,
  },
  'koko-bananas': {
    starter: IMPORTS + `class Solution {
  public int minEatingSpeed(int[] piles, int h) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int minEatingSpeed(int[] piles, int h) {
    int lo = 1;
    int hi = Arrays.stream(piles).max().getAsInt();
    while (lo < hi) {
      int mid = (lo + hi) >>> 1;
      if (hours(piles, mid) <= h) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  private long hours(int[] piles, int k) {
    long total = 0;
    for (int p : piles) total += (p + k - 1) / k;
    return total;
  }
}
`,
  },
  'find-min-rotated': {
    starter: IMPORTS + `class Solution {
  public int findMin(int[] nums) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int findMin(int[] nums) {
    int lo = 0;
    int hi = nums.length - 1;
    while (lo < hi) {
      int mid = (lo + hi) >>> 1;
      if (nums[mid] > nums[hi]) lo = mid + 1;
      else hi = mid;
    }
    return nums[lo];
  }
}
`,
  },
  'search-2d-matrix': {
    starter: IMPORTS + `class Solution {
  public boolean searchMatrix(int[][] matrix, int target) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean searchMatrix(int[][] matrix, int target) {
    int m = matrix.length;
    int n = m == 0 ? 0 : matrix[0].length;
    int lo = 0;
    int hi = m * n - 1;
    while (lo <= hi) {
      int mid = (lo + hi) >>> 1;
      int v = matrix[mid / n][mid % n];
      if (v == target) return true;
      if (v < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }
}
`,
  },
  'median-two-sorted': {
    starter: IMPORTS + `class Solution {
  public double findMedianSortedArrays(int[] nums1, int[] nums2) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public double findMedianSortedArrays(int[] nums1, int[] nums2) {
    int[] a = nums1;
    int[] b = nums2;
    if (a.length > b.length) { int[] t = a; a = b; b = t; }
    int total = a.length + b.length;
    int half = (total + 1) / 2;
    int lo = 0;
    int hi = a.length;
    for (;;) {
      int i = (lo + hi) >>> 1; // elements taken from a
      int j = half - i;        // elements taken from b
      long aLeft = i > 0 ? a[i - 1] : Long.MIN_VALUE;
      long aRight = i < a.length ? a[i] : Long.MAX_VALUE;
      long bLeft = j > 0 ? b[j - 1] : Long.MIN_VALUE;
      long bRight = j < b.length ? b[j] : Long.MAX_VALUE;
      if (aLeft <= bRight && bLeft <= aRight) {
        long leftMax = Math.max(aLeft, bLeft);
        if (total % 2 == 1) return leftMax;
        return (leftMax + Math.min(aRight, bRight)) / 2.0;
      }
      if (aLeft > bRight) hi = i - 1;
      else lo = i + 1;
    }
  }
}
`,
  },
  'longest-palindromic-substring': {
    starter: IMPORTS + `class Solution {
  public String longestPalindrome(String s) {
    // your code
    return "";
  }
}
`,
    solution: IMPORTS + `class Solution {
  private int bestStart = 0;
  private int bestLen = 0;

  public String longestPalindrome(String s) {
    bestStart = 0;
    bestLen = 0;
    for (int i = 0; i < s.length(); i++) {
      expand(s, i, i);
      expand(s, i, i + 1);
    }
    return s.substring(bestStart, bestStart + bestLen);
  }

  private void expand(String s, int l, int r) {
    while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {
      l--;
      r++;
    }
    int len = r - l - 1;
    if (len > bestLen) {
      bestLen = len;
      bestStart = l + 1;
    }
  }
}
`,
  },
  'string-compression': {
    starter: IMPORTS + `class Solution {
  public String compress(String s) {
    // your code
    return s;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public String compress(String s) {
    StringBuilder out = new StringBuilder();
    int i = 0;
    while (i < s.length()) {
      int j = i;
      while (j < s.length() && s.charAt(j) == s.charAt(i)) j++;
      out.append(s.charAt(i));
      if (j - i > 1) out.append(j - i);
      i = j;
    }
    return out.length() < s.length() ? out.toString() : s;
  }
}
`,
  },
  'merge-two-sorted-lists': {
    starter: IMPORTS + LIST_NODE + `class Solution {
  public ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    // your code
    return null;
  }
}
`,
    solution: IMPORTS + LIST_NODE + `class Solution {
  public ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode();
    ListNode tail = dummy;
    while (l1 != null && l2 != null) {
      if (l1.val <= l2.val) {
        tail.next = l1;
        l1 = l1.next;
      } else {
        tail.next = l2;
        l2 = l2.next;
      }
      tail = tail.next;
    }
    tail.next = l1 != null ? l1 : l2;
    return dummy.next;
  }
}
`,
  },
  'remove-nth-from-end': {
    starter: IMPORTS + LIST_NODE + `class Solution {
  public ListNode removeNthFromEnd(ListNode head, int n) {
    // your code
    return head;
  }
}
`,
    solution: IMPORTS + LIST_NODE + `class Solution {
  public ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head);
    ListNode lead = dummy;
    ListNode trail = dummy;
    for (int i = 0; i <= n; i++) lead = lead.next;
    while (lead != null) {
      lead = lead.next;
      trail = trail.next;
    }
    trail.next = trail.next.next;
    return dummy.next;
  }
}
`,
  },
  'add-two-numbers': {
    starter: IMPORTS + LIST_NODE + `class Solution {
  public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
    // your code
    return null;
  }
}
`,
    solution: IMPORTS + LIST_NODE + `class Solution {
  public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode();
    ListNode tail = dummy;
    int carry = 0;
    while (l1 != null || l2 != null || carry > 0) {
      int sum = (l1 != null ? l1.val : 0) + (l2 != null ? l2.val : 0) + carry;
      carry = sum / 10;
      tail.next = new ListNode(sum % 10);
      tail = tail.next;
      if (l1 != null) l1 = l1.next;
      if (l2 != null) l2 = l2.next;
    }
    return dummy.next;
  }
}
`,
  },
  'merge-k-sorted-lists': {
    starter: IMPORTS + LIST_NODE + `class Solution {
  public ListNode mergeKLists(ListNode[] lists) {
    // your code
    return null;
  }
}
`,
    solution: IMPORTS + LIST_NODE + `class Solution {
  public ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> heap = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
    for (ListNode l : lists) if (l != null) heap.add(l);
    ListNode dummy = new ListNode();
    ListNode tail = dummy;
    while (!heap.isEmpty()) {
      ListNode n = heap.poll();
      tail.next = n;
      tail = n;
      if (n.next != null) heap.add(n.next);
    }
    return dummy.next;
  }
}
`,
  },
  'max-depth-binary-tree': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  public int maxDepth(TreeNode root) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  public int maxDepth(TreeNode root) {
    return root == null ? 0 : 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
  }
}
`,
  },
  'invert-binary-tree': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  public TreeNode invertTree(TreeNode root) {
    // your code
    return root;
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  public TreeNode invertTree(TreeNode root) {
    if (root == null) return null;
    TreeNode left = root.left;
    root.left = invertTree(root.right);
    root.right = invertTree(left);
    return root;
  }
}
`,
  },
  'diameter-binary-tree': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  public int diameterOfBinaryTree(TreeNode root) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  private int best = 0;

  public int diameterOfBinaryTree(TreeNode root) {
    best = 0;
    height(root);
    return best;
  }

  private int height(TreeNode n) {
    if (n == null) return 0;
    int l = height(n.left);
    int r = height(n.right);
    best = Math.max(best, l + r);
    return 1 + Math.max(l, r);
  }
}
`,
  },
  'same-tree': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  public boolean isSameTree(TreeNode p, TreeNode q) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  public boolean isSameTree(TreeNode p, TreeNode q) {
    if (p == null || q == null) return p == q;
    return p.val == q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
  }
}
`,
  },
  'lca-bst': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  /** The value of the lowest common ancestor of p and q (values) in the BST, or null. */
  public Integer lowestCommonAncestor(TreeNode root, int p, int q) {
    // your code
    return null;
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  public Integer lowestCommonAncestor(TreeNode root, int p, int q) {
    TreeNode n = root;
    while (n != null) {
      if (p < n.val && q < n.val) n = n.left;
      else if (p > n.val && q > n.val) n = n.right;
      else return n.val;
    }
    return null;
  }
}
`,
  },
  'kth-smallest-bst': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  public int kthSmallest(TreeNode root, int k) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  public int kthSmallest(TreeNode root, int k) {
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode n = root;
    while (n != null || !stack.isEmpty()) {
      while (n != null) {
        stack.push(n);
        n = n.left;
      }
      n = stack.pop();
      if (--k == 0) return n.val;
      n = n.right;
    }
    return -1;
  }
}
`,
  },
  'build-tree-preorder-inorder': {
    starter: IMPORTS + TREE_NODE + `class Solution {
  public TreeNode buildTree(int[] preorder, int[] inorder) {
    // your code
    return null;
  }
}
`,
    solution: IMPORTS + TREE_NODE + `class Solution {
  private int pre = 0;
  private final Map<Integer, Integer> at = new HashMap<>();

  public TreeNode buildTree(int[] preorder, int[] inorder) {
    pre = 0;
    at.clear();
    for (int i = 0; i < inorder.length; i++) at.put(inorder[i], i);
    return build(preorder, 0, inorder.length - 1);
  }

  private TreeNode build(int[] preorder, int lo, int hi) {
    if (lo > hi) return null;
    int val = preorder[pre++];
    int mid = at.get(val);
    return new TreeNode(val, build(preorder, lo, mid - 1), build(preorder, mid + 1, hi));
  }
}
`,
  },
  'k-closest-points': {
    starter: IMPORTS + `class Solution {
  public int[][] kClosest(int[][] points, int k) {
    // your code
    return new int[0][];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[][] kClosest(int[][] points, int k) {
    // max-heap by distance, kept at size k
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(dist(b), dist(a)));
    for (int[] p : points) {
      if (heap.size() < k) heap.add(p);
      else if (dist(p) < dist(heap.peek())) {
        heap.poll();
        heap.add(p);
      }
    }
    return heap.toArray(new int[0][]);
  }

  private int dist(int[] p) {
    return p[0] * p[0] + p[1] * p[1];
  }
}
`,
  },
  'task-scheduler': {
    starter: IMPORTS + `class Solution {
  public int leastInterval(char[] tasks, int n) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int leastInterval(char[] tasks, int n) {
    int[] counts = new int[26];
    for (char t : tasks) counts[t - 'A']++;
    int max = 0;
    for (int c : counts) max = Math.max(max, c);
    int tied = 0;
    for (int c : counts) if (c == max) tied++;
    return Math.max(tasks.length, (max - 1) * (n + 1) + tied);
  }
}
`,
  },
  'median-data-stream': {
    starter: IMPORTS + `class MedianFinder {
  public void addNum(int num) {
    // your code
  }
  public double findMedian() {
    // your code
    return 0;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Double[] runMedian(String[] ops, Integer[] args) {
    MedianFinder m = new MedianFinder();
    Double[] out = new Double[ops.length];
    for (int i = 0; i < ops.length; i++) {
      if (ops[i].equals("add")) { m.addNum(args[i]); out[i] = null; }
      else out[i] = m.findMedian();
    }
    return out;
  }
}
`,
    solution: IMPORTS + `class MedianFinder {
  private final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
  private final PriorityQueue<Integer> high = new PriorityQueue<>();                           // min-heap

  public void addNum(int num) {
    if (low.isEmpty() || num <= low.peek()) low.add(num);
    else high.add(num);
    if (low.size() > high.size() + 1) high.add(low.poll());
    else if (high.size() > low.size()) low.add(high.poll());
  }

  public double findMedian() {
    if (low.size() > high.size()) return low.peek();
    return (low.peek() + high.peek()) / 2.0;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Double[] runMedian(String[] ops, Integer[] args) {
    MedianFinder m = new MedianFinder();
    Double[] out = new Double[ops.length];
    for (int i = 0; i < ops.length; i++) {
      if (ops[i].equals("add")) { m.addNum(args[i]); out[i] = null; }
      else out[i] = m.findMedian();
    }
    return out;
  }
}
`,
  },
  'add-search-words': {
    starter: IMPORTS + `class WordDictionary {
  public void addWord(String word) {
    // your code
  }
  public boolean search(String word) {
    // your code
    return false;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Boolean[] runDict(String[] ops, String[] args) {
    WordDictionary d = new WordDictionary();
    Boolean[] out = new Boolean[ops.length];
    for (int i = 0; i < ops.length; i++) {
      if (ops[i].equals("add")) { d.addWord(args[i]); out[i] = null; }
      else out[i] = d.search(args[i]);
    }
    return out;
  }
}
`,
    solution: IMPORTS + `class WordDictionary {
  private static class Node {
    final Map<Character, Node> children = new HashMap<>();
    boolean end;
  }

  private final Node root = new Node();

  public void addWord(String word) {
    Node n = root;
    for (char ch : word.toCharArray()) n = n.children.computeIfAbsent(ch, k -> new Node());
    n.end = true;
  }

  public boolean search(String word) {
    return dfs(root, word, 0);
  }

  private boolean dfs(Node n, String word, int i) {
    if (i == word.length()) return n.end;
    char ch = word.charAt(i);
    if (ch == '.') {
      for (Node child : n.children.values()) if (dfs(child, word, i + 1)) return true;
      return false;
    }
    Node next = n.children.get(ch);
    return next != null && dfs(next, word, i + 1);
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Boolean[] runDict(String[] ops, String[] args) {
    WordDictionary d = new WordDictionary();
    Boolean[] out = new Boolean[ops.length];
    for (int i = 0; i < ops.length; i++) {
      if (ops[i].equals("add")) { d.addWord(args[i]); out[i] = null; }
      else out[i] = d.search(args[i]);
    }
    return out;
  }
}
`,
  },
  'rotting-oranges': {
    starter: IMPORTS + `class Solution {
  public int orangesRotting(int[][] grid) {
    // your code
    return -1;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int orangesRotting(int[][] grid) {
    int rows = grid.length;
    int cols = grid[0].length;
    List<int[]> queue = new ArrayList<>();
    int fresh = 0;
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
      if (grid[r][c] == 2) queue.add(new int[] { r, c });
      else if (grid[r][c] == 1) fresh++;
    }
    int minutes = 0;
    int[][] dirs = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
    while (!queue.isEmpty() && fresh > 0) {
      List<int[]> next = new ArrayList<>();
      for (int[] cell : queue) for (int[] d : dirs) {
        int nr = cell[0] + d[0];
        int nc = cell[1] + d[1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] != 1) continue;
        grid[nr][nc] = 2;
        fresh--;
        next.add(new int[] { nr, nc });
      }
      queue = next;
      minutes++;
    }
    return fresh == 0 ? minutes : -1;
  }
}
`,
  },
  'pacific-atlantic': {
    starter: IMPORTS + `class Solution {
  public List<List<Integer>> pacificAtlantic(int[][] heights) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + `class Solution {
  private int rows;
  private int cols;

  public List<List<Integer>> pacificAtlantic(int[][] heights) {
    rows = heights.length;
    cols = heights[0].length;
    boolean[][] pac = new boolean[rows][cols];
    boolean[][] atl = new boolean[rows][cols];
    for (int r = 0; r < rows; r++) {
      dfs(heights, r, 0, pac);
      dfs(heights, r, cols - 1, atl);
    }
    for (int c = 0; c < cols; c++) {
      dfs(heights, 0, c, pac);
      dfs(heights, rows - 1, c, atl);
    }
    List<List<Integer>> out = new ArrayList<>();
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (pac[r][c] && atl[r][c]) out.add(Arrays.asList(r, c));
    return out;
  }

  private void dfs(int[][] heights, int r, int c, boolean[][] seen) {
    seen[r][c] = true;
    int[][] dirs = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
    for (int[] d : dirs) {
      int nr = r + d[0];
      int nc = c + d[1];
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen[nr][nc] || heights[nr][nc] < heights[r][c]) continue;
      dfs(heights, nr, nc, seen);
    }
  }
}
`,
  },
  'clone-graph-adjacency': {
    starter: IMPORTS + `class Solution {
  /** graph maps a node id to the list of its neighbour ids. Return a deep copy. */
  public Map<Integer, List<Integer>> cloneGraph(Map<Integer, List<Integer>> graph) {
    // your code
    return graph;
  }

  /** Test driver. Leave as is. */
  public Map<String, Object> check(Map<Integer, List<Integer>> graph) {
    Map<Integer, List<Integer>> copy = cloneGraph(graph);
    boolean equal = copy.equals(graph);
    boolean shared = copy == graph;
    for (Integer k : graph.keySet()) if (copy.get(k) == graph.get(k)) shared = true;
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("equal", equal);
    out.put("shared", shared);
    return out;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public Map<Integer, List<Integer>> cloneGraph(Map<Integer, List<Integer>> graph) {
    Map<Integer, List<Integer>> seen = new HashMap<>();
    for (Integer k : graph.keySet()) visit(graph, k, seen);
    Map<Integer, List<Integer>> out = new LinkedHashMap<>();
    for (Integer k : graph.keySet()) out.put(k, seen.get(k));
    return out;
  }

  private List<Integer> visit(Map<Integer, List<Integer>> graph, Integer k, Map<Integer, List<Integer>> seen) {
    List<Integer> hit = seen.get(k);
    if (hit != null) return hit;
    List<Integer> copy = new ArrayList<>();
    seen.put(k, copy);
    for (Integer n : graph.getOrDefault(k, List.of())) {
      copy.add(n);
      visit(graph, n, seen);
    }
    return copy;
  }

  /** Test driver. Leave as is. */
  public Map<String, Object> check(Map<Integer, List<Integer>> graph) {
    Map<Integer, List<Integer>> copy = cloneGraph(graph);
    boolean equal = copy.equals(graph);
    boolean shared = copy == graph;
    for (Integer k : graph.keySet()) if (copy.get(k) == graph.get(k)) shared = true;
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("equal", equal);
    out.put("shared", shared);
    return out;
  }
}
`,
  },
  'network-delay-time': {
    starter: IMPORTS + `class Solution {
  public int networkDelayTime(int[][] times, int n, int k) {
    // your code
    return -1;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int networkDelayTime(int[][] times, int n, int k) {
    Map<Integer, List<int[]>> adj = new HashMap<>();
    for (int[] t : times) adj.computeIfAbsent(t[0], x -> new ArrayList<>()).add(new int[] { t[1], t[2] });
    int inf = Integer.MAX_VALUE;
    int[] dist = new int[n + 1];
    Arrays.fill(dist, inf);
    dist[k] = 0;
    // A simple O(n^2) selection; with a heap this is O(E log V).
    boolean[] done = new boolean[n + 1];
    for (int round = 0; round < n; round++) {
      int u = -1;
      for (int i = 1; i <= n; i++) if (!done[i] && (u == -1 || dist[i] < dist[u])) u = i;
      if (u == -1 || dist[u] == inf) break;
      done[u] = true;
      for (int[] e : adj.getOrDefault(u, List.of())) if (dist[u] + e[1] < dist[e[0]]) dist[e[0]] = dist[u] + e[1];
    }
    int worst = 0;
    for (int i = 1; i <= n; i++) worst = Math.max(worst, dist[i]);
    return worst == inf ? -1 : worst;
  }
}
`,
  },
  'cheapest-flights-k-stops': {
    starter: IMPORTS + `class Solution {
  public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    // your code
    return -1;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    int inf = Integer.MAX_VALUE;
    int[] dist = new int[n];
    Arrays.fill(dist, inf);
    dist[src] = 0;
    for (int round = 0; round <= k; round++) {
      int[] next = dist.clone();
      for (int[] f : flights) if (dist[f[0]] != inf && dist[f[0]] + f[2] < next[f[1]]) next[f[1]] = dist[f[0]] + f[2];
      dist = next;
    }
    return dist[dst] == inf ? -1 : dist[dst];
  }
}
`,
  },
  'word-ladder': {
    starter: IMPORTS + `class Solution {
  public int ladderLength(String beginWord, String endWord, List<String> wordList) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int ladderLength(String beginWord, String endWord, List<String> wordList) {
    Set<String> words = new HashSet<>(wordList);
    if (!words.contains(endWord)) return 0;
    List<String> frontier = new ArrayList<>(List.of(beginWord));
    words.remove(beginWord);
    int steps = 1;
    while (!frontier.isEmpty()) {
      List<String> next = new ArrayList<>();
      for (String w : frontier) {
        if (w.equals(endWord)) return steps;
        char[] chars = w.toCharArray();
        for (int i = 0; i < chars.length; i++) {
          char original = chars[i];
          for (char c = 'a'; c <= 'z'; c++) {
            chars[i] = c;
            String cand = new String(chars);
            if (words.remove(cand)) next.add(cand);
          }
          chars[i] = original;
        }
      }
      frontier = next;
      steps++;
    }
    return 0;
  }
}
`,
  },
  'climbing-stairs': {
    starter: IMPORTS + `class Solution {
  public int climbStairs(int n) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int climbStairs(int n) {
    int a = 1;
    int b = 1;
    for (int i = 0; i < n; i++) {
      int t = a + b;
      a = b;
      b = t;
    }
    return a;
  }
}
`,
  },
  'house-robber': {
    starter: IMPORTS + `class Solution {
  public int rob(int[] nums) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int rob(int[] nums) {
    int skip = 0;
    int take = 0;
    for (int n : nums) {
      int newSkip = Math.max(skip, take);
      take = skip + n;
      skip = newSkip;
    }
    return Math.max(skip, take);
  }
}
`,
  },
  'longest-increasing-subsequence': {
    starter: IMPORTS + `class Solution {
  public int lengthOfLIS(int[] nums) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int lengthOfLIS(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    for (int n : nums) {
      int lo = 0;
      int hi = tails.size();
      while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (tails.get(mid) < n) lo = mid + 1;
        else hi = mid;
      }
      if (lo == tails.size()) tails.add(n);
      else tails.set(lo, n);
    }
    return tails.size();
  }
}
`,
  },
  'word-break': {
    starter: IMPORTS + `class Solution {
  public boolean wordBreak(String s, List<String> wordDict) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean wordBreak(String s, List<String> wordDict) {
    Set<String> words = new HashSet<>(wordDict);
    int maxLen = 0;
    for (String w : wordDict) maxLen = Math.max(maxLen, w.length());
    boolean[] dp = new boolean[s.length() + 1];
    dp[0] = true;
    for (int i = 1; i <= s.length(); i++) {
      for (int j = Math.max(0, i - maxLen); j < i; j++) {
        if (dp[j] && words.contains(s.substring(j, i))) {
          dp[i] = true;
          break;
        }
      }
    }
    return dp[s.length()];
  }
}
`,
  },
  'decode-ways': {
    starter: IMPORTS + `class Solution {
  public int numDecodings(String s) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int numDecodings(String s) {
    if (s.isEmpty() || s.charAt(0) == '0') return 0;
    int prev2 = 1; // ways for prefix length i-2
    int prev1 = 1; // ways for prefix length i-1
    for (int i = 1; i < s.length(); i++) {
      int cur = 0;
      if (s.charAt(i) != '0') cur += prev1;
      int pair = Integer.parseInt(s.substring(i - 1, i + 1));
      if (pair >= 10 && pair <= 26) cur += prev2;
      prev2 = prev1;
      prev1 = cur;
    }
    return prev1;
  }
}
`,
  },
  'partition-equal-subset': {
    starter: IMPORTS + `class Solution {
  public boolean canPartition(int[] nums) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean canPartition(int[] nums) {
    int total = 0;
    for (int n : nums) total += n;
    if (total % 2 != 0) return false;
    int target = total / 2;
    boolean[] can = new boolean[target + 1];
    can[0] = true;
    for (int n : nums) {
      for (int s = target; s >= n; s--) if (can[s - n]) can[s] = true;
      if (can[target]) return true;
    }
    return can[target];
  }
}
`,
  },
  'unique-paths': {
    starter: IMPORTS + `class Solution {
  public int uniquePaths(int m, int n) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int uniquePaths(int m, int n) {
    int[] row = new int[n];
    Arrays.fill(row, 1);
    for (int r = 1; r < m; r++) for (int c = 1; c < n; c++) row[c] += row[c - 1];
    return row[n - 1];
  }
}
`,
  },
  'edit-distance': {
    starter: IMPORTS + `class Solution {
  public int minDistance(String word1, String word2) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int minDistance(String word1, String word2) {
    int m = word1.length();
    int n = word2.length();
    int[] prev = new int[n + 1];
    for (int j = 0; j <= n; j++) prev[j] = j;
    for (int i = 1; i <= m; i++) {
      int[] cur = new int[n + 1];
      cur[0] = i;
      for (int j = 1; j <= n; j++) {
        cur[j] = word1.charAt(i - 1) == word2.charAt(j - 1) ? prev[j - 1] : 1 + Math.min(prev[j - 1], Math.min(prev[j], cur[j - 1]));
      }
      prev = cur;
    }
    return prev[n];
  }
}
`,
  },
  'subsets': {
    starter: IMPORTS + `class Solution {
  public List<List<Integer>> subsets(int[] nums) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + `class Solution {
  public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> out = new ArrayList<>();
    go(nums, 0, new ArrayList<>(), out);
    return out;
  }

  private void go(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
    out.add(new ArrayList<>(path));
    for (int i = start; i < nums.length; i++) {
      path.add(nums[i]);
      go(nums, i + 1, path, out);
      path.remove(path.size() - 1);
    }
  }
}
`,
  },
  'combination-sum': {
    starter: IMPORTS + `class Solution {
  public List<List<Integer>> combinationSum(int[] candidates, int target) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + `class Solution {
  public List<List<Integer>> combinationSum(int[] candidates, int target) {
    List<List<Integer>> out = new ArrayList<>();
    go(candidates, 0, target, new ArrayList<>(), out);
    return out;
  }

  private void go(int[] candidates, int start, int remaining, List<Integer> path, List<List<Integer>> out) {
    if (remaining == 0) {
      out.add(new ArrayList<>(path));
      return;
    }
    for (int i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) continue;
      path.add(candidates[i]);
      go(candidates, i, remaining - candidates[i], path, out);
      path.remove(path.size() - 1);
    }
  }
}
`,
  },
  'word-search': {
    starter: IMPORTS + `class Solution {
  public boolean exist(char[][] board, String word) {
    // your code
    return false;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean exist(char[][] board, String word) {
    for (int r = 0; r < board.length; r++) for (int c = 0; c < board[0].length; c++) if (dfs(board, word, r, c, 0)) return true;
    return false;
  }

  private boolean dfs(char[][] board, String word, int r, int c, int i) {
    if (i == word.length()) return true;
    if (r < 0 || c < 0 || r >= board.length || c >= board[0].length || board[r][c] != word.charAt(i)) return false;
    char saved = board[r][c];
    board[r][c] = '#';
    boolean found = dfs(board, word, r + 1, c, i + 1) || dfs(board, word, r - 1, c, i + 1) || dfs(board, word, r, c + 1, i + 1) || dfs(board, word, r, c - 1, i + 1);
    board[r][c] = saved;
    return found;
  }
}
`,
  },
  'n-queens': {
    starter: IMPORTS + `class Solution {
  public int totalNQueens(int n) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  private int count;
  private boolean[] cols;
  private boolean[] diag;
  private boolean[] anti;

  public int totalNQueens(int n) {
    count = 0;
    cols = new boolean[n];
    diag = new boolean[2 * n];
    anti = new boolean[2 * n];
    place(n, 0);
    return count;
  }

  private void place(int n, int r) {
    if (r == n) {
      count++;
      return;
    }
    for (int c = 0; c < n; c++) {
      int d = r - c + n;
      int a = r + c;
      if (cols[c] || diag[d] || anti[a]) continue;
      cols[c] = diag[d] = anti[a] = true;
      place(n, r + 1);
      cols[c] = diag[d] = anti[a] = false;
    }
  }
}
`,
  },
  'gas-station': {
    starter: IMPORTS + `class Solution {
  public int canCompleteCircuit(int[] gas, int[] cost) {
    // your code
    return -1;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0;
    int tank = 0;
    int start = 0;
    for (int i = 0; i < gas.length; i++) {
      int diff = gas[i] - cost[i];
      total += diff;
      tank += diff;
      if (tank < 0) {
        start = i + 1;
        tank = 0;
      }
    }
    return total >= 0 ? start : -1;
  }
}
`,
  },
  'partition-labels': {
    starter: IMPORTS + `class Solution {
  public List<Integer> partitionLabels(String s) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + `class Solution {
  public List<Integer> partitionLabels(String s) {
    int[] last = new int[128];
    for (int i = 0; i < s.length(); i++) last[s.charAt(i)] = i;
    List<Integer> out = new ArrayList<>();
    int start = 0;
    int end = 0;
    for (int i = 0; i < s.length(); i++) {
      end = Math.max(end, last[s.charAt(i)]);
      if (i == end) {
        out.add(end - start + 1);
        start = i + 1;
      }
    }
    return out;
  }
}
`,
  },
  'insert-interval': {
    starter: IMPORTS + `class Solution {
  public int[][] insert(int[][] intervals, int[] newInterval) {
    // your code
    return new int[0][];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[][] insert(int[][] intervals, int[] newInterval) {
    List<int[]> out = new ArrayList<>();
    int s = newInterval[0];
    int e = newInterval[1];
    int i = 0;
    while (i < intervals.length && intervals[i][1] < s) out.add(intervals[i++]);
    while (i < intervals.length && intervals[i][0] <= e) {
      s = Math.min(s, intervals[i][0]);
      e = Math.max(e, intervals[i][1]);
      i++;
    }
    out.add(new int[] { s, e });
    while (i < intervals.length) out.add(intervals[i++]);
    return out.toArray(new int[0][]);
  }
}
`,
  },
  'non-overlapping-intervals': {
    starter: IMPORTS + `class Solution {
  public int eraseOverlapIntervals(int[][] intervals) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int eraseOverlapIntervals(int[][] intervals) {
    int[][] sorted = intervals.clone();
    Arrays.sort(sorted, (a, b) -> Integer.compare(a[1], b[1]));
    int removed = 0;
    long end = Long.MIN_VALUE;
    for (int[] iv : sorted) {
      if (iv[0] >= end) end = iv[1];
      else removed++;
    }
    return removed;
  }
}
`,
  },
  'meeting-rooms-ii': {
    starter: IMPORTS + `class Solution {
  public int minMeetingRooms(int[][] intervals) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int minMeetingRooms(int[][] intervals) {
    int n = intervals.length;
    int[] starts = new int[n];
    int[] ends = new int[n];
    for (int i = 0; i < n; i++) {
      starts[i] = intervals[i][0];
      ends[i] = intervals[i][1];
    }
    Arrays.sort(starts);
    Arrays.sort(ends);
    int rooms = 0;
    int best = 0;
    int e = 0;
    for (int s : starts) {
      if (s < ends[e]) rooms++;
      else e++;
      best = Math.max(best, rooms);
    }
    return best;
  }
}
`,
  },
  'counting-bits': {
    starter: IMPORTS + `class Solution {
  public int[] countBits(int n) {
    // your code
    return new int[0];
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[] countBits(int n) {
    int[] out = new int[n + 1];
    for (int i = 1; i <= n; i++) out[i] = out[i >> 1] + (i & 1);
    return out;
  }
}
`,
  },
  'reverse-bits': {
    starter: IMPORTS + `class Solution {
  /** Reverse the 32 bits of n, read as an unsigned 32-bit integer; the result is returned as a long so it never goes negative. */
  public long reverseBits(int n) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public long reverseBits(int n) {
    long out = 0;
    for (int i = 0; i < 32; i++) {
      out = (out << 1) | (n & 1);
      n >>>= 1;
    }
    return out;
  }
}
`,
  },
  'rotate-image': {
    starter: IMPORTS + `class Solution {
  /** Rotate the matrix 90 degrees clockwise in place, and return it. */
  public int[][] rotate(int[][] matrix) {
    // your code (in place)
    return matrix;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[][] rotate(int[][] matrix) {
    int n = matrix.length;
    for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) {
      int t = matrix[i][j];
      matrix[i][j] = matrix[j][i];
      matrix[j][i] = t;
    }
    for (int[] row : matrix) {
      for (int l = 0, r = n - 1; l < r; l++, r--) {
        int t = row[l];
        row[l] = row[r];
        row[r] = t;
      }
    }
    return matrix;
  }
}
`,
  },
  'spiral-matrix': {
    starter: IMPORTS + `class Solution {
  public List<Integer> spiralOrder(int[][] matrix) {
    // your code
    return new ArrayList<>();
  }
}
`,
    solution: IMPORTS + `class Solution {
  public List<Integer> spiralOrder(int[][] matrix) {
    List<Integer> out = new ArrayList<>();
    int top = 0;
    int bottom = matrix.length - 1;
    int left = 0;
    int right = (matrix.length == 0 ? 0 : matrix[0].length) - 1;
    while (top <= bottom && left <= right) {
      for (int c = left; c <= right; c++) out.add(matrix[top][c]);
      top++;
      for (int r = top; r <= bottom; r++) out.add(matrix[r][right]);
      right--;
      if (top <= bottom) {
        for (int c = right; c >= left; c--) out.add(matrix[bottom][c]);
        bottom--;
      }
      if (left <= right) {
        for (int r = bottom; r >= top; r--) out.add(matrix[r][left]);
        left++;
      }
    }
    return out;
  }
}
`,
  },
  'set-matrix-zeroes': {
    starter: IMPORTS + `class Solution {
  /** Zero every row and column that contains a zero, in place, and return the matrix. */
  public int[][] setZeroes(int[][] matrix) {
    // your code (in place)
    return matrix;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int[][] setZeroes(int[][] matrix) {
    int m = matrix.length;
    int n = matrix[0].length;
    boolean firstRow = false;
    boolean firstCol = false;
    for (int i = 0; i < m; i++) if (matrix[i][0] == 0) firstCol = true;
    for (int j = 0; j < n; j++) if (matrix[0][j] == 0) firstRow = true;
    for (int i = 1; i < m; i++) for (int j = 1; j < n; j++) if (matrix[i][j] == 0) {
      matrix[i][0] = 0;
      matrix[0][j] = 0;
    }
    for (int i = 1; i < m; i++) for (int j = 1; j < n; j++) if (matrix[i][0] == 0 || matrix[0][j] == 0) matrix[i][j] = 0;
    if (firstRow) for (int j = 0; j < n; j++) matrix[0][j] = 0;
    if (firstCol) for (int i = 0; i < m; i++) matrix[i][0] = 0;
    return matrix;
  }
}
`,
  },
  'pow-x-n': {
    starter: IMPORTS + `class Solution {
  public double myPow(double x, int n) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public double myPow(double x, int n) {
    double base = n < 0 ? 1 / x : x;
    long e = Math.abs((long) n);
    double result = 1;
    while (e > 0) {
      if (e % 2 == 1) result *= base;
      base *= base;
      e /= 2;
    }
    return result;
  }
}
`,
  },
}
