import type { Port } from '../types.ts'

/**
 * The Arrays & Hashing, Two Pointers, Sliding Window and Stack & Queue
 * problems in Rust: a starter and a reference solution per problem id,
 * mirroring the TypeScript versions. Each tested function is a free
 * `pub fn` in snake_case (the TypeScript name's snake_case form, which the
 * test runner resolves) taking owned arguments. The Rust code lives in
 * template literals, so a backslash in it is written doubled.
 */
export const RUST_ARRAYS: Record<string, Port> = {
  'two-sum': {
    starter: `use std::collections::HashMap;

/// Return the indices of the two numbers in nums that sum to target.
pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
    // your code
    vec![]
}
`,
    solution: `use std::collections::HashMap;

pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
    let mut seen: HashMap<i32, usize> = HashMap::new(); // value -> index
    for (i, &n) in nums.iter().enumerate() {
        if let Some(&j) = seen.get(&(target - n)) {
            return vec![j as i32, i as i32];
        }
        seen.insert(n, i);
    }
    panic!("no two-sum solution exists");
}
`,
  },
  'max-profit-stock': {
    starter: `/// Maximum profit from at most one buy/sell transaction.
pub fn max_profit(prices: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn max_profit(prices: Vec<i32>) -> i32 {
    let mut min_so_far = i32::MAX;
    let mut best = 0;
    for price in prices {
        min_so_far = min_so_far.min(price);
        best = best.max(price - min_so_far);
    }
    best
}
`,
  },
  'subarray-sum-equals-k': {
    starter: `use std::collections::HashMap;

/// Count contiguous subarrays that sum to k.
pub fn subarray_sum(nums: Vec<i32>, k: i32) -> i32 {
    // your code
    0
}
`,
    solution: `use std::collections::HashMap;

pub fn subarray_sum(nums: Vec<i32>, k: i32) -> i32 {
    let mut seen: HashMap<i32, i32> = HashMap::new(); // prefix sum -> times seen
    seen.insert(0, 1);
    let mut prefix = 0;
    let mut count = 0;
    for n in nums {
        prefix += n;
        count += seen.get(&(prefix - k)).copied().unwrap_or(0);
        *seen.entry(prefix).or_insert(0) += 1;
    }
    count
}
`,
  },
  'contains-duplicate': {
    starter: `use std::collections::HashSet;

/// Whether any value appears at least twice in nums.
pub fn contains_duplicate(nums: Vec<i32>) -> bool {
    // your code
    false
}
`,
    solution: `use std::collections::HashSet;

pub fn contains_duplicate(nums: Vec<i32>) -> bool {
    let mut seen = HashSet::new();
    nums.into_iter().any(|n| !seen.insert(n))
}
`,
  },
  'valid-anagram': {
    starter: `use std::collections::HashMap;

/// Whether t is an anagram of s.
pub fn is_anagram(s: String, t: String) -> bool {
    // your code
    false
}
`,
    solution: `use std::collections::HashMap;

pub fn is_anagram(s: String, t: String) -> bool {
    if s.len() != t.len() {
        return false;
    }
    let mut counts: HashMap<char, i32> = HashMap::new();
    for ch in s.chars() {
        *counts.entry(ch).or_insert(0) += 1;
    }
    for ch in t.chars() {
        let n = counts.entry(ch).or_insert(0);
        *n -= 1;
        if *n < 0 {
            return false;
        }
    }
    true
}
`,
  },
  'group-anagrams': {
    starter: `use std::collections::HashMap;

/// Group the strings that are anagrams of each other (lowercase letters only).
pub fn group_anagrams(strs: Vec<String>) -> Vec<Vec<String>> {
    // your code
    vec![]
}
`,
    solution: `use std::collections::HashMap;

pub fn group_anagrams(strs: Vec<String>) -> Vec<Vec<String>> {
    let mut slot_of: HashMap<[u32; 26], usize> = HashMap::new(); // letter counts -> index in groups
    let mut groups: Vec<Vec<String>> = Vec::new();
    for s in strs {
        let mut counts = [0u32; 26];
        for b in s.bytes() {
            counts[(b - b'a') as usize] += 1;
        }
        let slot = *slot_of.entry(counts).or_insert_with(|| {
            groups.push(Vec::new());
            groups.len() - 1
        });
        groups[slot].push(s);
    }
    groups
}
`,
  },
  'product-except-self': {
    starter: `/// For each index, the product of every other element (no division).
pub fn product_except_self(nums: Vec<i32>) -> Vec<i32> {
    // your code
    vec![]
}
`,
    solution: `pub fn product_except_self(nums: Vec<i32>) -> Vec<i32> {
    let mut out = vec![1; nums.len()];
    let mut prefix = 1;
    for (i, &n) in nums.iter().enumerate() {
        out[i] = prefix;
        prefix *= n;
    }
    let mut suffix = 1;
    for (i, &n) in nums.iter().enumerate().rev() {
        out[i] *= suffix;
        suffix *= n;
    }
    out
}
`,
  },
  'longest-consecutive-sequence': {
    starter: `use std::collections::HashSet;

/// Length of the longest run of consecutive integers present in nums.
pub fn longest_consecutive(nums: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `use std::collections::HashSet;

pub fn longest_consecutive(nums: Vec<i32>) -> i32 {
    let set: HashSet<i32> = nums.into_iter().collect();
    let mut best = 0;
    for &n in &set {
        if set.contains(&(n - 1)) {
            continue; // not the start of a run
        }
        let mut len = 1;
        while set.contains(&(n + len)) {
            len += 1;
        }
        best = best.max(len);
    }
    best
}
`,
  },
  '3sum': {
    starter: `/// All unique triplets in nums that sum to zero.
pub fn three_sum(nums: Vec<i32>) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: `pub fn three_sum(mut nums: Vec<i32>) -> Vec<Vec<i32>> {
    nums.sort_unstable();
    let n = nums.len();
    let mut result = Vec::new();
    for i in 0..n.saturating_sub(2) {
        if i > 0 && nums[i] == nums[i - 1] {
            continue;
        }
        let (mut left, mut right) = (i + 1, n - 1);
        while left < right {
            let sum = nums[i] + nums[left] + nums[right];
            if sum < 0 {
                left += 1;
            } else if sum > 0 {
                right -= 1;
            } else {
                result.push(vec![nums[i], nums[left], nums[right]]);
                while left < right && nums[left] == nums[left + 1] {
                    left += 1;
                }
                while left < right && nums[right] == nums[right - 1] {
                    right -= 1;
                }
                left += 1;
                right -= 1;
            }
        }
    }
    result
}
`,
  },
  'valid-palindrome': {
    starter: `/// Whether s reads the same forwards and backwards, ignoring case and non-alphanumerics.
pub fn is_palindrome(s: String) -> bool {
    // your code
    false
}
`,
    solution: `pub fn is_palindrome(s: String) -> bool {
    let chars: Vec<char> = s.chars().collect();
    if chars.is_empty() {
        return true;
    }
    let (mut i, mut j) = (0, chars.len() - 1);
    while i < j {
        while i < j && !chars[i].is_alphanumeric() {
            i += 1;
        }
        while i < j && !chars[j].is_alphanumeric() {
            j -= 1;
        }
        if chars[i].to_ascii_lowercase() != chars[j].to_ascii_lowercase() {
            return false;
        }
        i += 1;
        j -= 1;
    }
    true
}
`,
  },
  'container-most-water': {
    starter: `/// Most water two of the walls can hold: max of min(height[i], height[j]) * (j - i).
pub fn max_area(height: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn max_area(height: Vec<i32>) -> i32 {
    if height.len() < 2 {
        return 0;
    }
    let (mut i, mut j) = (0, height.len() - 1);
    let mut best = 0;
    while i < j {
        best = best.max(height[i].min(height[j]) * (j - i) as i32);
        if height[i] < height[j] {
            i += 1;
        } else {
            j -= 1;
        }
    }
    best
}
`,
  },
  'trapping-rain-water': {
    starter: `/// Units of water trapped between the bars of the elevation map.
pub fn trap(height: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn trap(height: Vec<i32>) -> i32 {
    if height.len() < 2 {
        return 0;
    }
    let (mut l, mut r) = (0, height.len() - 1);
    let (mut left_max, mut right_max) = (0, 0);
    let mut water = 0;
    while l < r {
        if height[l] < height[r] {
            left_max = left_max.max(height[l]);
            water += left_max - height[l];
            l += 1;
        } else {
            right_max = right_max.max(height[r]);
            water += right_max - height[r];
            r -= 1;
        }
    }
    water
}
`,
  },
  'remove-duplicates-sorted': {
    starter: `/// Remove duplicates in place and return the number of unique values k; the first k slots hold them.
pub fn remove_duplicates(nums: &mut [i32]) -> usize {
    // your code
    nums.len()
}

/// Test driver. Leave as is.
pub fn run(nums: Vec<i32>) -> Vec<i32> {
    let mut nums = nums;
    let k = remove_duplicates(&mut nums);
    nums.truncate(k);
    nums
}
`,
    solution: `pub fn remove_duplicates(nums: &mut [i32]) -> usize {
    if nums.is_empty() {
        return 0;
    }
    let mut write = 1;
    for read in 1..nums.len() {
        if nums[read] != nums[write - 1] {
            nums[write] = nums[read];
            write += 1;
        }
    }
    write
}

/// Test driver. Leave as is.
pub fn run(nums: Vec<i32>) -> Vec<i32> {
    let mut nums = nums;
    let k = remove_duplicates(&mut nums);
    nums.truncate(k);
    nums
}
`,
  },
  'longest-substring-without-repeating': {
    starter: `use std::collections::HashMap;

/// Length of the longest substring of s with no repeating characters.
pub fn length_of_longest_substring(s: String) -> i32 {
    // your code
    0
}
`,
    solution: `use std::collections::HashMap;

pub fn length_of_longest_substring(s: String) -> i32 {
    let mut last_seen: HashMap<char, usize> = HashMap::new();
    let mut left = 0;
    let mut best = 0;
    for (right, ch) in s.chars().enumerate() {
        if let Some(&prev) = last_seen.get(&ch) {
            if prev >= left {
                left = prev + 1;
            }
        }
        last_seen.insert(ch, right);
        best = best.max(right - left + 1);
    }
    best as i32
}
`,
  },
  'sliding-window-maximum': {
    starter: `use std::collections::VecDeque;

/// Maximum of each sliding window of size k.
pub fn max_sliding_window(nums: Vec<i32>, k: i32) -> Vec<i32> {
    // your code
    vec![]
}
`,
    solution: `use std::collections::VecDeque;

pub fn max_sliding_window(nums: Vec<i32>, k: i32) -> Vec<i32> {
    let k = k as usize;
    let mut deque: VecDeque<usize> = VecDeque::new(); // indices, values strictly decreasing
    let mut result = Vec::with_capacity(nums.len() + 1 - k);
    for right in 0..nums.len() {
        while deque.back().is_some_and(|&j| nums[j] <= nums[right]) {
            deque.pop_back();
        }
        deque.push_back(right);
        if deque[0] + k <= right {
            deque.pop_front();
        }
        if right + 1 >= k {
            result.push(nums[deque[0]]);
        }
    }
    result
}
`,
  },
  'min-window-substring': {
    starter: `use std::collections::HashMap;

/// Shortest substring of s containing all characters of t.
pub fn min_window(s: String, t: String) -> String {
    // your code
    String::new()
}
`,
    solution: `use std::collections::HashMap;

pub fn min_window(s: String, t: String) -> String {
    if t.len() > s.len() {
        return String::new();
    }
    let chars: Vec<char> = s.chars().collect();
    let mut need: HashMap<char, i32> = HashMap::new();
    for ch in t.chars() {
        *need.entry(ch).or_insert(0) += 1;
    }
    let mut have: HashMap<char, i32> = HashMap::new();
    let mut formed = 0; // characters whose count in the window matches need
    let mut best: Option<(usize, usize)> = None;
    let mut left = 0;
    for (right, &ch) in chars.iter().enumerate() {
        let Some(&needed) = need.get(&ch) else { continue };
        let count = have.entry(ch).or_insert(0);
        *count += 1;
        if *count == needed {
            formed += 1;
        }
        while formed == need.len() {
            if best.is_none_or(|(bs, be)| right - left < be - bs) {
                best = Some((left, right));
            }
            let l = chars[left];
            if let Some(&needed_l) = need.get(&l) {
                let count = have.get_mut(&l).unwrap();
                if *count == needed_l {
                    formed -= 1;
                }
                *count -= 1;
            }
            left += 1;
        }
    }
    match best {
        Some((bs, be)) => chars[bs..=be].iter().collect(),
        None => String::new(),
    }
}
`,
  },
  'longest-repeating-replacement': {
    starter: `/// Longest substring of equal letters after replacing at most k characters.
pub fn character_replacement(s: String, k: i32) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn character_replacement(s: String, k: i32) -> i32 {
    let bytes = s.as_bytes();
    let mut counts = [0i32; 256];
    let mut left = 0;
    let mut max_freq = 0;
    let mut best = 0;
    for right in 0..bytes.len() {
        counts[bytes[right] as usize] += 1;
        max_freq = max_freq.max(counts[bytes[right] as usize]);
        while (right - left + 1) as i32 - max_freq > k {
            counts[bytes[left] as usize] -= 1;
            left += 1;
        }
        best = best.max(right - left + 1);
    }
    best as i32
}
`,
  },
  'permutation-in-string': {
    starter: `/// Whether s2 contains a permutation of s1 as a substring (lowercase letters only).
pub fn check_inclusion(s1: String, s2: String) -> bool {
    // your code
    false
}
`,
    solution: `pub fn check_inclusion(s1: String, s2: String) -> bool {
    if s1.len() > s2.len() {
        return false;
    }
    let (a, b) = (s1.as_bytes(), s2.as_bytes());
    let idx = |c: u8| (c - b'a') as usize;
    let mut need = [0i32; 26];
    let mut have = [0i32; 26];
    for i in 0..a.len() {
        need[idx(a[i])] += 1;
        have[idx(b[i])] += 1;
    }
    let mut matches = (0..26).filter(|&i| need[i] == have[i]).count();
    for right in a.len()..b.len() {
        if matches == 26 {
            return true;
        }
        let add = idx(b[right]);
        have[add] += 1;
        if have[add] == need[add] {
            matches += 1;
        } else if have[add] == need[add] + 1 {
            matches -= 1;
        }
        let drop = idx(b[right - a.len()]);
        have[drop] -= 1;
        if have[drop] == need[drop] {
            matches += 1;
        } else if have[drop] == need[drop] - 1 {
            matches -= 1;
        }
    }
    matches == 26
}
`,
  },
  'max-consecutive-ones-iii': {
    starter: `/// Longest run of 1s after flipping at most k 0s.
pub fn longest_ones(nums: Vec<i32>, k: i32) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn longest_ones(nums: Vec<i32>, k: i32) -> i32 {
    let mut left = 0;
    let mut zeros = 0;
    let mut best = 0;
    for right in 0..nums.len() {
        if nums[right] == 0 {
            zeros += 1;
        }
        while zeros > k {
            if nums[left] == 0 {
                zeros -= 1;
            }
            left += 1;
        }
        best = best.max(right + 1 - left); // left may sit one past right when k == 0
    }
    best as i32
}
`,
  },
  'valid-parentheses': {
    starter: `/// Whether s is a valid sequence of matched parentheses.
pub fn is_valid(s: String) -> bool {
    // your code
    false
}
`,
    solution: `pub fn is_valid(s: String) -> bool {
    let mut stack: Vec<char> = Vec::new();
    for ch in s.chars() {
        let open = match ch {
            ')' => '(',
            ']' => '[',
            '}' => '{',
            _ => {
                stack.push(ch);
                continue;
            }
        };
        if stack.pop() != Some(open) {
            return false;
        }
    }
    stack.is_empty()
}
`,
  },
  'daily-temperatures': {
    starter: `/// For each day, how many days until a warmer temperature (0 if never).
pub fn daily_temperatures(temperatures: Vec<i32>) -> Vec<i32> {
    // your code
    vec![]
}
`,
    solution: `pub fn daily_temperatures(temperatures: Vec<i32>) -> Vec<i32> {
    let mut answer = vec![0; temperatures.len()];
    let mut stack: Vec<usize> = Vec::new(); // indices with no warmer day seen yet, temperatures decreasing
    for (i, &t) in temperatures.iter().enumerate() {
        while stack.last().is_some_and(|&j| temperatures[j] < t) {
            let j = stack.pop().unwrap();
            answer[j] = (i - j) as i32;
        }
        stack.push(i);
    }
    answer
}
`,
  },
  'min-stack': {
    starter: `/// A stack that also reports its minimum in O(1).
pub struct MinStack {
    // your fields
}

impl MinStack {
    pub fn new() -> Self {
        MinStack {}
    }
    pub fn push(&mut self, val: i32) {
        // your code
    }
    pub fn pop(&mut self) {
        // your code
    }
    pub fn top(&self) -> i32 {
        // your code
        0
    }
    pub fn get_min(&self) -> i32 {
        // your code
        0
    }
}

/// Test driver. Leave as is.
pub fn run_min_stack(ops: Vec<String>, args: Vec<Option<i32>>) -> Vec<Option<i32>> {
    let mut s = MinStack::new();
    ops.iter()
        .zip(args)
        .map(|(op, arg)| match op.as_str() {
            "push" => {
                s.push(arg.unwrap());
                None
            }
            "pop" => {
                s.pop();
                None
            }
            "top" => Some(s.top()),
            _ => Some(s.get_min()),
        })
        .collect()
}
`,
    solution: `pub struct MinStack {
    stack: Vec<(i32, i32)>, // (value, min so far)
}

impl MinStack {
    pub fn new() -> Self {
        MinStack { stack: Vec::new() }
    }
    pub fn push(&mut self, val: i32) {
        let min = self.stack.last().map_or(val, |&(_, m)| m.min(val));
        self.stack.push((val, min));
    }
    pub fn pop(&mut self) {
        self.stack.pop();
    }
    pub fn top(&self) -> i32 {
        self.stack.last().unwrap().0
    }
    pub fn get_min(&self) -> i32 {
        self.stack.last().unwrap().1
    }
}

/// Test driver. Leave as is.
pub fn run_min_stack(ops: Vec<String>, args: Vec<Option<i32>>) -> Vec<Option<i32>> {
    let mut s = MinStack::new();
    ops.iter()
        .zip(args)
        .map(|(op, arg)| match op.as_str() {
            "push" => {
                s.push(arg.unwrap());
                None
            }
            "pop" => {
                s.pop();
                None
            }
            "top" => Some(s.top()),
            _ => Some(s.get_min()),
        })
        .collect()
}
`,
  },
  'evaluate-rpn': {
    starter: `/// Evaluate an expression in Reverse Polish Notation (+ - * / with truncating division).
pub fn eval_rpn(tokens: Vec<String>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn eval_rpn(tokens: Vec<String>) -> i32 {
    let mut stack: Vec<i32> = Vec::new();
    for t in &tokens {
        match t.as_str() {
            "+" | "-" | "*" | "/" => {
                let b = stack.pop().unwrap();
                let a = stack.pop().unwrap();
                stack.push(match t.as_str() {
                    "+" => a + b,
                    "-" => a - b,
                    "*" => a * b,
                    _ => a / b,
                });
            }
            n => stack.push(n.parse().unwrap()),
        }
    }
    stack.pop().unwrap()
}
`,
  },
  'largest-rectangle-histogram': {
    starter: `/// Area of the largest rectangle that fits under the histogram.
pub fn largest_rectangle_area(heights: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn largest_rectangle_area(heights: Vec<i32>) -> i32 {
    let mut stack: Vec<usize> = Vec::new(); // indices, heights increasing
    let mut best = 0;
    for i in 0..=heights.len() {
        let h = if i == heights.len() { 0 } else { heights[i] };
        while let Some(&top) = stack.last() {
            if heights[top] < h {
                break;
            }
            stack.pop();
            let left = stack.last().map_or(0, |&j| j + 1);
            best = best.max(heights[top] * (i - left) as i32);
        }
        stack.push(i);
    }
    best
}
`,
  },
}
