import type { Port } from '../types.ts'

/**
 * The dynamic programming, bit manipulation, greedy and math problems in
 * Rust: a starter and a reference solution per problem id, mirroring the
 * TypeScript versions. Each file is a set of free `pub fn`s named after
 * the TypeScript export in snake_case (`coinChange` → `coin_change`), with
 * owned parameter types the harness can build from the test's JSON.
 */
export const RUST_DP_MISC: Record<string, Port> = {
  'max-subarray': {
    starter: `/// Largest sum of any contiguous subarray of nums (nums is non-empty).
pub fn max_sub_array(nums: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn max_sub_array(nums: Vec<i32>) -> i32 {
    let mut best_here = nums[0];
    let mut best = nums[0];
    for &n in &nums[1..] {
        best_here = n.max(best_here + n);
        best = best.max(best_here);
    }
    best
}
`,
  },

  'longest-common-subsequence': {
    starter: `/// Length of the longest common subsequence of text1 and text2.
pub fn longest_common_subsequence(text1: String, text2: String) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn longest_common_subsequence(text1: String, text2: String) -> i32 {
    let a = text1.as_bytes();
    let b = text2.as_bytes();
    let n = b.len();
    let mut prev = vec![0i32; n + 1];
    for i in (0..a.len()).rev() {
        let mut curr = vec![0i32; n + 1];
        for j in (0..n).rev() {
            curr[j] = if a[i] == b[j] { 1 + prev[j + 1] } else { prev[j].max(curr[j + 1]) };
        }
        prev = curr;
    }
    prev[0]
}
`,
  },

  'coin-change': {
    starter: `/// Fewest coins (each denomination reusable) that sum to amount, or -1 if impossible.
pub fn coin_change(coins: Vec<i32>, amount: i32) -> i32 {
    // your code
    -1
}
`,
    solution: `pub fn coin_change(coins: Vec<i32>, amount: i32) -> i32 {
    let amount = amount as usize;
    let inf = amount as i32 + 1;
    let mut dp = vec![inf; amount + 1];
    dp[0] = 0;
    for a in 1..=amount {
        for &c in &coins {
            let c = c as usize;
            if c <= a && dp[a - c] + 1 < dp[a] {
                dp[a] = dp[a - c] + 1;
            }
        }
    }
    if dp[amount] == inf { -1 } else { dp[amount] }
}
`,
  },

  'climbing-stairs': {
    starter: `/// Number of distinct ways to climb n steps taking 1 or 2 at a time.
pub fn climb_stairs(n: i32) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn climb_stairs(n: i32) -> i32 {
    let mut a = 1;
    let mut b = 1;
    for _ in 0..n {
        let t = a + b;
        a = b;
        b = t;
    }
    a
}
`,
  },

  'house-robber': {
    starter: `/// Maximum sum of non-adjacent elements of nums (0 for an empty row).
pub fn rob(nums: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn rob(nums: Vec<i32>) -> i32 {
    let mut skip = 0;
    let mut take = 0;
    for n in nums {
        let new_skip = skip.max(take);
        take = skip + n;
        skip = new_skip;
    }
    skip.max(take)
}
`,
  },

  'longest-increasing-subsequence': {
    starter: `/// Length of the longest strictly increasing subsequence of nums.
pub fn length_of_lis(nums: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn length_of_lis(nums: Vec<i32>) -> i32 {
    let mut tails: Vec<i32> = Vec::new();
    for n in nums {
        let mut lo = 0;
        let mut hi = tails.len();
        while lo < hi {
            let mid = (lo + hi) / 2;
            if tails[mid] < n { lo = mid + 1 } else { hi = mid }
        }
        if lo == tails.len() { tails.push(n) } else { tails[lo] = n }
    }
    tails.len() as i32
}
`,
  },

  'word-break': {
    starter: `use std::collections::HashSet;

/// Can s be segmented into a sequence of words from word_dict (reuse allowed)?
pub fn word_break(s: String, word_dict: Vec<String>) -> bool {
    // your code
    false
}
`,
    solution: `use std::collections::HashSet;

pub fn word_break(s: String, word_dict: Vec<String>) -> bool {
    let words: HashSet<&str> = word_dict.iter().map(|w| w.as_str()).collect();
    let max_len = word_dict.iter().map(|w| w.len()).max().unwrap_or(0);
    let n = s.len();
    let mut dp = vec![false; n + 1];
    dp[0] = true;
    for i in 1..=n {
        for j in i.saturating_sub(max_len)..i {
            if dp[j] && words.contains(&s[j..i]) {
                dp[i] = true;
                break;
            }
        }
    }
    dp[n]
}
`,
  },

  'decode-ways': {
    starter: `/// Number of ways to decode the digit string s, where "1".."26" map to A..Z.
pub fn num_decodings(s: String) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn num_decodings(s: String) -> i32 {
    let d = s.as_bytes();
    if d.is_empty() || d[0] == b'0' {
        return 0;
    }
    let mut prev2 = 1; // ways for prefix length i-2
    let mut prev1 = 1; // ways for prefix length i-1
    for i in 1..d.len() {
        let mut cur = 0;
        if d[i] != b'0' {
            cur += prev1;
        }
        let pair = (d[i - 1] - b'0') as i32 * 10 + (d[i] - b'0') as i32;
        if (10..=26).contains(&pair) {
            cur += prev2;
        }
        prev2 = prev1;
        prev1 = cur;
    }
    prev1
}
`,
  },

  'partition-equal-subset': {
    starter: `/// Can nums be split into two subsets with equal sums?
pub fn can_partition(nums: Vec<i32>) -> bool {
    // your code
    false
}
`,
    solution: `pub fn can_partition(nums: Vec<i32>) -> bool {
    let total: i32 = nums.iter().sum();
    if total % 2 != 0 {
        return false;
    }
    let target = (total / 2) as usize;
    let mut can = vec![false; target + 1];
    can[0] = true;
    for n in nums {
        let n = n as usize;
        for s in (n..=target).rev() {
            if can[s - n] {
                can[s] = true;
            }
        }
        if can[target] {
            return true;
        }
    }
    can[target]
}
`,
  },

  'unique-paths': {
    starter: `/// Number of monotone (right/down) paths from the top-left to the bottom-right of an m x n grid.
pub fn unique_paths(m: i32, n: i32) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn unique_paths(m: i32, n: i32) -> i32 {
    let n = n as usize;
    let mut row = vec![1i32; n];
    for _ in 1..m {
        for c in 1..n {
            row[c] += row[c - 1];
        }
    }
    row[n - 1]
}
`,
  },

  'edit-distance': {
    starter: `/// Minimum number of single-character inserts, deletes and replaces turning word1 into word2.
pub fn min_distance(word1: String, word2: String) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn min_distance(word1: String, word2: String) -> i32 {
    let a = word1.as_bytes();
    let b = word2.as_bytes();
    let n = b.len();
    let mut prev: Vec<i32> = (0..=n as i32).collect();
    for i in 1..=a.len() {
        let mut cur = vec![0i32; n + 1];
        cur[0] = i as i32;
        for j in 1..=n {
            cur[j] = if a[i - 1] == b[j - 1] {
                prev[j - 1]
            } else {
                1 + prev[j - 1].min(prev[j]).min(cur[j - 1])
            };
        }
        prev = cur;
    }
    prev[n]
}
`,
  },

  'single-number': {
    starter: `/// Return the element that appears once (all others appear twice).
pub fn single_number(nums: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn single_number(nums: Vec<i32>) -> i32 {
    nums.iter().fold(0, |acc, &n| acc ^ n)
}
`,
  },

  'counting-bits': {
    starter: `/// For every i in 0..=n, the number of 1 bits in i, as a vector of n + 1 counts.
pub fn count_bits(n: i32) -> Vec<i32> {
    // your code
    vec![]
}
`,
    solution: `pub fn count_bits(n: i32) -> Vec<i32> {
    let n = n as usize;
    let mut out = vec![0i32; n + 1];
    for i in 1..=n {
        out[i] = out[i >> 1] + (i & 1) as i32;
    }
    out
}
`,
  },

  'reverse-bits': {
    starter: `/// Reverse the 32 bits of n, read as an unsigned 32-bit integer.
pub fn reverse_bits(n: u32) -> u32 {
    // your code
    0
}
`,
    solution: `pub fn reverse_bits(mut n: u32) -> u32 {
    let mut out: u32 = 0;
    for _ in 0..32 {
        out = (out << 1) | (n & 1);
        n >>= 1;
    }
    out
}
`,
  },

  'jump-game': {
    starter: `/// Can you reach the last index, where nums[i] is the furthest you may jump from i?
pub fn can_jump(nums: Vec<i32>) -> bool {
    // your code
    false
}
`,
    solution: `pub fn can_jump(nums: Vec<i32>) -> bool {
    let last = nums.len() - 1;
    let mut reach = 0usize;
    for (i, &n) in nums.iter().enumerate() {
        if i > reach {
            return false;
        }
        reach = reach.max(i + n as usize);
        if reach >= last {
            return true;
        }
    }
    true
}
`,
  },

  'gas-station': {
    starter: `/// Index of the station from which the whole circuit can be driven, or -1 if none.
pub fn can_complete_circuit(gas: Vec<i32>, cost: Vec<i32>) -> i32 {
    // your code
    -1
}
`,
    solution: `pub fn can_complete_circuit(gas: Vec<i32>, cost: Vec<i32>) -> i32 {
    let mut total: i64 = 0;
    let mut tank: i64 = 0;
    let mut start = 0;
    for i in 0..gas.len() {
        let diff = (gas[i] - cost[i]) as i64;
        total += diff;
        tank += diff;
        if tank < 0 {
            start = i as i32 + 1;
            tank = 0;
        }
    }
    if total >= 0 { start } else { -1 }
}
`,
  },

  'partition-labels': {
    starter: `/// Sizes of the fewest parts of s such that each letter appears in at most one part.
pub fn partition_labels(s: String) -> Vec<i32> {
    // your code
    vec![]
}
`,
    solution: `pub fn partition_labels(s: String) -> Vec<i32> {
    let bytes = s.as_bytes();
    let mut last = [0usize; 128];
    for (i, &b) in bytes.iter().enumerate() {
        last[b as usize] = i;
    }
    let mut out = Vec::new();
    let mut start = 0;
    let mut end = 0;
    for (i, &b) in bytes.iter().enumerate() {
        end = end.max(last[b as usize]);
        if i == end {
            out.push((end - start + 1) as i32);
            start = i + 1;
        }
    }
    out
}
`,
  },

  'pow-x-n': {
    starter: `/// x raised to the integer power n (n may be negative), by squaring.
pub fn my_pow(x: f64, n: i32) -> f64 {
    // your code
    0.0
}
`,
    solution: `pub fn my_pow(x: f64, n: i32) -> f64 {
    let mut base = if n < 0 { 1.0 / x } else { x };
    let mut e = (n as i64).abs();
    let mut result = 1.0;
    while e > 0 {
        if e % 2 == 1 {
            result *= base;
        }
        base *= base;
        e /= 2;
    }
    result
}
`,
  },
}
