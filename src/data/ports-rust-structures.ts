import type { Port } from '../types.ts'

/**
 * The linked list, binary search, heap, interval, string and matrix
 * problems in Rust: a starter and a reference solution per problem id,
 * mirroring the TypeScript versions. Each tested function is a free
 * `pub fn` in snake_case taking owned values; ListNode is defined at the
 * top of each list problem so the harness can convert it to and from JSON.
 * `scripts/check-ports.ts rust --file <this file>` compiles and runs every
 * solution here against the problem's tests.
 */

const LIST_NODE = `#[derive(Debug, Clone, PartialEq)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}

impl ListNode {
    pub fn new(val: i32) -> Self {
        ListNode { val, next: None }
    }
}

`

// The cycle problem needs a tail that points back into the list, which a
// Box can never do, so its nodes link through shared, mutable pointers.
const SHARED_LIST_NODE = `use std::cell::RefCell;
use std::rc::Rc;

pub type Link = Option<Rc<RefCell<ListNode>>>;

#[derive(Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Link,
}

impl ListNode {
    pub fn new(val: i32) -> Self {
        ListNode { val, next: None }
    }
}

`

const HAS_CYCLE_DRIVER = `
/// Test driver. Leave as is: builds the list and links the tail to node pos (-1 for none).
pub fn has_cycle_at(vals: Vec<i32>, pos: i32) -> bool {
    let nodes: Vec<Rc<RefCell<ListNode>>> = vals.iter().map(|&v| Rc::new(RefCell::new(ListNode::new(v)))).collect();
    for i in 1..nodes.len() {
        nodes[i - 1].borrow_mut().next = Some(Rc::clone(&nodes[i]));
    }
    if pos >= 0 && !nodes.is_empty() {
        nodes[nodes.len() - 1].borrow_mut().next = Some(Rc::clone(&nodes[pos as usize]));
    }
    has_cycle(nodes.first().cloned())
}
`

const MEDIAN_DRIVER = `
/// Test driver. Leave as is.
pub fn run_median(ops: Vec<String>, args: Vec<Option<i32>>) -> Vec<Option<f64>> {
    let mut m = MedianFinder::new();
    ops.iter()
        .zip(args)
        .map(|(op, arg)| {
            if op == "add" {
                m.add_num(arg.unwrap_or(0));
                None
            } else {
                Some(m.find_median())
            }
        })
        .collect()
}
`

export const RUST_STRUCTURES: Record<string, Port> = {
  // ── Linked Lists ────────────────────────────────────────────────────────
  'reverse-linked-list': {
    starter: LIST_NODE + `/// Reverse a singly linked list and return the new head.
pub fn reverse_list(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    // your code
    None
}
`,
    solution: LIST_NODE + `pub fn reverse_list(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    let mut prev = None;
    let mut curr = head;
    while let Some(mut node) = curr {
        curr = node.next.take();
        node.next = prev;
        prev = Some(node);
    }
    prev
}
`,
  },
  'linked-list-cycle': {
    starter: SHARED_LIST_NODE + `/// Whether the linked list starting at head contains a cycle.
pub fn has_cycle(head: Link) -> bool {
    // your code
    false
}
` + HAS_CYCLE_DRIVER,
    solution: SHARED_LIST_NODE + `pub fn has_cycle(head: Link) -> bool {
    fn step(n: &Link) -> Link {
        n.as_ref().and_then(|node| node.borrow().next.clone())
    }
    let mut slow = head.clone();
    let mut fast = head;
    loop {
        fast = step(&step(&fast));
        slow = step(&slow);
        match (&slow, &fast) {
            (_, None) => return false,
            (Some(s), Some(f)) if Rc::ptr_eq(s, f) => return true,
            _ => {}
        }
    }
}
` + HAS_CYCLE_DRIVER,
  },
  'merge-two-sorted-lists': {
    starter: LIST_NODE + `/// Merge two sorted lists into one sorted list and return its head.
pub fn merge_two_lists(l1: Option<Box<ListNode>>, l2: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    // your code
    None
}
`,
    solution: LIST_NODE + `pub fn merge_two_lists(l1: Option<Box<ListNode>>, l2: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    let mut l1 = l1;
    let mut l2 = l2;
    let mut dummy = Box::new(ListNode::new(0));
    let mut tail = &mut dummy;
    while l1.is_some() && l2.is_some() {
        let src = if l1.as_ref().unwrap().val <= l2.as_ref().unwrap().val { &mut l1 } else { &mut l2 };
        let mut node = src.take().unwrap();
        *src = node.next.take();
        tail.next = Some(node);
        tail = tail.next.as_mut().unwrap();
    }
    tail.next = l1.or(l2);
    dummy.next
}
`,
  },
  'remove-nth-from-end': {
    starter: LIST_NODE + `/// Remove the nth node from the end of the list and return the head.
pub fn remove_nth_from_end(head: Option<Box<ListNode>>, n: i32) -> Option<Box<ListNode>> {
    // your code
    head
}
`,
    solution: LIST_NODE + `pub fn remove_nth_from_end(head: Option<Box<ListNode>>, n: i32) -> Option<Box<ListNode>> {
    let mut dummy = Box::new(ListNode { val: 0, next: head });
    // Two pointers would need two live borrows into the list, so count first.
    let mut len = 0;
    let mut p = &dummy.next;
    while let Some(node) = p {
        len += 1;
        p = &node.next;
    }
    let mut trail = &mut dummy;
    for _ in 0..(len - n) {
        trail = trail.next.as_mut().unwrap();
    }
    let removed = trail.next.take();
    trail.next = removed.and_then(|mut node| node.next.take());
    dummy.next
}
`,
  },
  'add-two-numbers': {
    starter: LIST_NODE + `/// Add two numbers whose digits are stored in reverse order; return the sum as a list.
pub fn add_two_numbers(l1: Option<Box<ListNode>>, l2: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    // your code
    None
}
`,
    solution: LIST_NODE + `pub fn add_two_numbers(l1: Option<Box<ListNode>>, l2: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    let mut l1 = l1;
    let mut l2 = l2;
    let mut dummy = Box::new(ListNode::new(0));
    let mut tail = &mut dummy;
    let mut carry = 0;
    while l1.is_some() || l2.is_some() || carry > 0 {
        let mut sum = carry;
        if let Some(mut node) = l1.take() {
            sum += node.val;
            l1 = node.next.take();
        }
        if let Some(mut node) = l2.take() {
            sum += node.val;
            l2 = node.next.take();
        }
        carry = sum / 10;
        tail.next = Some(Box::new(ListNode::new(sum % 10)));
        tail = tail.next.as_mut().unwrap();
    }
    dummy.next
}
`,
  },

  // ── Binary Search ───────────────────────────────────────────────────────
  'binary-search': {
    starter: `/// Index of target in sorted nums, or -1 if absent. Must be O(log n).
pub fn search(nums: Vec<i32>, target: i32) -> i32 {
    // your code
    -1
}
`,
    solution: `pub fn search(nums: Vec<i32>, target: i32) -> i32 {
    let mut lo = 0i32;
    let mut hi = nums.len() as i32 - 1;
    while lo <= hi {
        let mid = lo + (hi - lo) / 2;
        let v = nums[mid as usize];
        if v == target {
            return mid;
        }
        if v < target {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    -1
}
`,
  },
  'search-rotated-array': {
    starter: `/// Index of target in a rotated sorted array, or -1.
pub fn search_rotated(nums: Vec<i32>, target: i32) -> i32 {
    // your code
    -1
}
`,
    solution: `pub fn search_rotated(nums: Vec<i32>, target: i32) -> i32 {
    let mut lo = 0i32;
    let mut hi = nums.len() as i32 - 1;
    while lo <= hi {
        let mid = lo + (hi - lo) / 2;
        let (l, m, h) = (nums[lo as usize], nums[mid as usize], nums[hi as usize]);
        if m == target {
            return mid;
        }
        if l <= m {
            // left half sorted
            if l <= target && target < m {
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        } else {
            // right half sorted
            if m < target && target <= h {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
    }
    -1
}
`,
  },
  'koko-bananas': {
    starter: `/// The least eating speed (bananas per hour) that finishes every pile within h hours.
pub fn min_eating_speed(piles: Vec<i32>, h: i32) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn min_eating_speed(piles: Vec<i32>, h: i32) -> i32 {
    let hours = |k: i32| -> i64 { piles.iter().map(|&p| ((p + k - 1) / k) as i64).sum() };
    let mut lo = 1;
    let mut hi = piles.iter().copied().max().unwrap_or(1);
    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        if hours(mid) <= h as i64 {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    lo
}
`,
  },
  'find-min-rotated': {
    starter: `/// The minimum of a rotated sorted array of distinct values.
pub fn find_min(nums: Vec<i32>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn find_min(nums: Vec<i32>) -> i32 {
    let mut lo = 0;
    let mut hi = nums.len() - 1;
    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        if nums[mid] > nums[hi] {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    nums[lo]
}
`,
  },
  'search-2d-matrix': {
    starter: `/// Whether target is in a matrix whose rows are sorted and each row starts after the last ends.
pub fn search_matrix(matrix: Vec<Vec<i32>>, target: i32) -> bool {
    // your code
    false
}
`,
    solution: `pub fn search_matrix(matrix: Vec<Vec<i32>>, target: i32) -> bool {
    let m = matrix.len();
    let n = if m == 0 { 0 } else { matrix[0].len() };
    let mut lo = 0i32;
    let mut hi = (m * n) as i32 - 1;
    while lo <= hi {
        let mid = lo + (hi - lo) / 2;
        let v = matrix[mid as usize / n][mid as usize % n];
        if v == target {
            return true;
        }
        if v < target {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    false
}
`,
  },
  'median-two-sorted': {
    starter: `/// The median of the two sorted arrays taken together. Aim for O(log(m + n)).
pub fn find_median_sorted_arrays(nums1: Vec<i32>, nums2: Vec<i32>) -> f64 {
    // your code
    0.0
}
`,
    solution: `pub fn find_median_sorted_arrays(nums1: Vec<i32>, nums2: Vec<i32>) -> f64 {
    // binary-search the partition of the shorter array
    let (a, b) = if nums1.len() <= nums2.len() { (&nums1, &nums2) } else { (&nums2, &nums1) };
    let total = a.len() + b.len();
    let half = (total + 1) / 2;
    let mut lo = 0usize;
    let mut hi = a.len();
    loop {
        let i = (lo + hi) / 2; // elements taken from a
        let j = half - i; // elements taken from b
        let a_left = if i > 0 { a[i - 1] as i64 } else { i64::MIN };
        let a_right = if i < a.len() { a[i] as i64 } else { i64::MAX };
        let b_left = if j > 0 { b[j - 1] as i64 } else { i64::MIN };
        let b_right = if j < b.len() { b[j] as i64 } else { i64::MAX };
        if a_left <= b_right && b_left <= a_right {
            let left_max = a_left.max(b_left);
            if total % 2 == 1 {
                return left_max as f64;
            }
            return (left_max + a_right.min(b_right)) as f64 / 2.0;
        }
        if a_left > b_right {
            hi = i - 1;
        } else {
            lo = i + 1;
        }
    }
}
`,
  },

  // ── Heaps & Priority Queues ─────────────────────────────────────────────
  'top-k-frequent-elements': {
    starter: `use std::collections::HashMap;

/// The k most frequent elements of nums, in any order.
pub fn top_k_frequent(nums: Vec<i32>, k: i32) -> Vec<i32> {
    // your code
    vec![]
}
`,
    solution: `use std::cmp::Reverse;
use std::collections::HashMap;

pub fn top_k_frequent(nums: Vec<i32>, k: i32) -> Vec<i32> {
    let mut freq: HashMap<i32, i32> = HashMap::new();
    for &n in &nums {
        *freq.entry(n).or_insert(0) += 1;
    }
    let mut entries: Vec<(i32, i32)> = freq.into_iter().collect();
    entries.sort_unstable_by_key(|&(_, count)| Reverse(count));
    entries.into_iter().take(k as usize).map(|(value, _)| value).collect()
}
`,
  },
  'kth-largest-element': {
    starter: `/// The kth largest value in nums.
pub fn find_kth_largest(nums: Vec<i32>, k: i32) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn find_kth_largest(nums: Vec<i32>, k: i32) -> i32 {
    // quickselect: partition around a pivot until the target index settles
    let mut a = nums;
    let target = a.len() - k as usize; // index in ascending order
    let mut lo = 0usize;
    let mut hi = a.len() - 1;
    while lo < hi {
        let pivot = a[lo + (hi - lo) / 2];
        let mut i = lo as isize;
        let mut j = hi as isize;
        while i <= j {
            while a[i as usize] < pivot {
                i += 1;
            }
            while a[j as usize] > pivot {
                j -= 1;
            }
            if i <= j {
                a.swap(i as usize, j as usize);
                i += 1;
                j -= 1;
            }
        }
        let t = target as isize;
        if t <= j {
            hi = j as usize;
        } else if t >= i {
            lo = i as usize;
        } else {
            return a[target];
        }
    }
    a[target]
}
`,
  },
  'merge-k-sorted-lists': {
    starter: LIST_NODE + `use std::cmp::Reverse;
use std::collections::BinaryHeap;

/// Merge k sorted lists into one sorted list and return its head.
pub fn merge_k_lists(lists: Vec<Option<Box<ListNode>>>) -> Option<Box<ListNode>> {
    // your code
    None
}
`,
    solution: LIST_NODE + `use std::cmp::Reverse;
use std::collections::BinaryHeap;

pub fn merge_k_lists(lists: Vec<Option<Box<ListNode>>>) -> Option<Box<ListNode>> {
    let mut lists = lists;
    // min-heap of (head value, which list), one entry per non-empty list
    let mut heap: BinaryHeap<Reverse<(i32, usize)>> = BinaryHeap::new();
    for (i, list) in lists.iter().enumerate() {
        if let Some(node) = list {
            heap.push(Reverse((node.val, i)));
        }
    }
    let mut dummy = Box::new(ListNode::new(0));
    let mut tail = &mut dummy;
    while let Some(Reverse((_, i))) = heap.pop() {
        let mut node = lists[i].take().unwrap();
        lists[i] = node.next.take();
        if let Some(next) = &lists[i] {
            heap.push(Reverse((next.val, i)));
        }
        tail.next = Some(node);
        tail = tail.next.as_mut().unwrap();
    }
    dummy.next
}
`,
  },
  'k-closest-points': {
    starter: `use std::collections::BinaryHeap;

/// The k points closest to the origin, in any order.
pub fn k_closest(points: Vec<Vec<i32>>, k: i32) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: `use std::collections::BinaryHeap;

pub fn k_closest(points: Vec<Vec<i32>>, k: i32) -> Vec<Vec<i32>> {
    let dist = |p: &[i32]| p[0] * p[0] + p[1] * p[1];
    // max-heap by distance, kept at size k
    let mut heap: BinaryHeap<(i32, Vec<i32>)> = BinaryHeap::new();
    for p in points {
        let d = dist(&p);
        if heap.len() < k as usize {
            heap.push((d, p));
        } else if d < heap.peek().unwrap().0 {
            heap.pop();
            heap.push((d, p));
        }
    }
    heap.into_iter().map(|(_, p)| p).collect()
}
`,
  },
  'task-scheduler': {
    starter: `/// The least number of CPU intervals to run every task, with n idle slots between two of the same kind.
pub fn least_interval(tasks: Vec<char>, n: i32) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn least_interval(tasks: Vec<char>, n: i32) -> i32 {
    let mut counts = [0i32; 26];
    for &t in &tasks {
        counts[(t as u8 - b'A') as usize] += 1;
    }
    let max = counts.iter().copied().max().unwrap_or(0);
    let tied = counts.iter().filter(|&&c| c == max).count() as i32;
    (tasks.len() as i32).max((max - 1) * (n + 1) + tied)
}
`,
  },
  'median-data-stream': {
    starter: `use std::cmp::Reverse;
use std::collections::BinaryHeap;

pub struct MedianFinder {
    // your fields
}

impl MedianFinder {
    pub fn new() -> Self {
        MedianFinder {}
    }

    /// Add a number to the stream.
    pub fn add_num(&mut self, num: i32) {
        // your code
    }

    /// The median of every number added so far.
    pub fn find_median(&self) -> f64 {
        // your code
        0.0
    }
}
` + MEDIAN_DRIVER,
    solution: `use std::cmp::Reverse;
use std::collections::BinaryHeap;

pub struct MedianFinder {
    low: BinaryHeap<i32>,           // max-heap: the smaller half
    high: BinaryHeap<Reverse<i32>>, // min-heap: the larger half
}

impl MedianFinder {
    pub fn new() -> Self {
        MedianFinder { low: BinaryHeap::new(), high: BinaryHeap::new() }
    }

    pub fn add_num(&mut self, num: i32) {
        if self.low.peek().map_or(true, |&top| num <= top) {
            self.low.push(num);
        } else {
            self.high.push(Reverse(num));
        }
        if self.low.len() > self.high.len() + 1 {
            self.high.push(Reverse(self.low.pop().unwrap()));
        } else if self.high.len() > self.low.len() {
            self.low.push(self.high.pop().unwrap().0);
        }
    }

    pub fn find_median(&self) -> f64 {
        let low = *self.low.peek().unwrap();
        if self.low.len() > self.high.len() {
            return low as f64;
        }
        (low + self.high.peek().unwrap().0) as f64 / 2.0
    }
}
` + MEDIAN_DRIVER,
  },

  // ── Sorting & Sweeping ──────────────────────────────────────────────────
  'merge-intervals': {
    starter: `/// Merge all overlapping intervals.
pub fn merge(intervals: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: `pub fn merge(intervals: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    let mut sorted = intervals;
    sorted.sort_unstable_by_key(|iv| iv[0]);
    let mut merged: Vec<Vec<i32>> = Vec::new();
    for iv in sorted {
        match merged.last_mut() {
            Some(last) if iv[0] <= last[1] => last[1] = last[1].max(iv[1]),
            _ => merged.push(vec![iv[0], iv[1]]),
        }
    }
    merged
}
`,
  },
  'insert-interval': {
    starter: `/// Insert new_interval into the sorted, non-overlapping intervals, merging where needed.
pub fn insert(intervals: Vec<Vec<i32>>, new_interval: Vec<i32>) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: `pub fn insert(intervals: Vec<Vec<i32>>, new_interval: Vec<i32>) -> Vec<Vec<i32>> {
    let mut out: Vec<Vec<i32>> = Vec::new();
    let mut s = new_interval[0];
    let mut e = new_interval[1];
    let mut rest = intervals.into_iter().peekable();
    // everything that ends before the new interval starts
    while let Some(iv) = rest.next_if(|iv| iv[1] < s) {
        out.push(iv);
    }
    // everything that overlaps it is folded in
    while let Some(iv) = rest.next_if(|iv| iv[0] <= e) {
        s = s.min(iv[0]);
        e = e.max(iv[1]);
    }
    out.push(vec![s, e]);
    out.extend(rest);
    out
}
`,
  },
  'non-overlapping-intervals': {
    starter: `/// The least number of intervals to remove so that none overlap.
pub fn erase_overlap_intervals(intervals: Vec<Vec<i32>>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn erase_overlap_intervals(intervals: Vec<Vec<i32>>) -> i32 {
    let mut sorted = intervals;
    sorted.sort_unstable_by_key(|iv| iv[1]);
    let mut removed = 0;
    let mut end = i64::MIN;
    for iv in &sorted {
        if iv[0] as i64 >= end {
            end = iv[1] as i64;
        } else {
            removed += 1;
        }
    }
    removed
}
`,
  },
  'meeting-rooms-ii': {
    starter: `/// The least number of rooms needed to hold every meeting [start, end).
pub fn min_meeting_rooms(intervals: Vec<Vec<i32>>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn min_meeting_rooms(intervals: Vec<Vec<i32>>) -> i32 {
    let mut starts: Vec<i32> = intervals.iter().map(|iv| iv[0]).collect();
    let mut ends: Vec<i32> = intervals.iter().map(|iv| iv[1]).collect();
    starts.sort_unstable();
    ends.sort_unstable();
    let mut rooms = 0;
    let mut best = 0;
    let mut e = 0;
    for s in starts {
        if s < ends[e] {
            rooms += 1;
        } else {
            e += 1;
        }
        best = best.max(rooms);
    }
    best
}
`,
  },

  // ── Strings ─────────────────────────────────────────────────────────────
  'longest-palindromic-substring': {
    starter: `/// The longest palindromic substring of s (the first one found, on ties).
pub fn longest_palindrome(s: String) -> String {
    // your code
    String::new()
}
`,
    solution: `pub fn longest_palindrome(s: String) -> String {
    let chars: Vec<char> = s.chars().collect();
    let mut best_start = 0usize;
    let mut best_len = 0usize;
    let mut expand = |l: usize, r: usize| {
        let mut l = l as isize;
        let mut r = r as isize;
        while l >= 0 && (r as usize) < chars.len() && chars[l as usize] == chars[r as usize] {
            l -= 1;
            r += 1;
        }
        let len = (r - l - 1) as usize;
        if len > best_len {
            best_len = len;
            best_start = (l + 1) as usize;
        }
    };
    for i in 0..chars.len() {
        expand(i, i);
        expand(i, i + 1);
    }
    chars[best_start..best_start + best_len].iter().collect()
}
`,
  },
  'string-compression': {
    starter: `/// Run-length encode s ("aabcccccaaa" -> "a2bc5a3"); return s itself if that is not shorter.
pub fn compress(s: String) -> String {
    // your code
    s
}
`,
    solution: `pub fn compress(s: String) -> String {
    let chars: Vec<char> = s.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < chars.len() {
        let mut j = i;
        while j < chars.len() && chars[j] == chars[i] {
            j += 1;
        }
        out.push(chars[i]);
        if j - i > 1 {
            out.push_str(&(j - i).to_string());
        }
        i = j;
    }
    if out.chars().count() < chars.len() { out } else { s }
}
`,
  },

  // ── Matrix ──────────────────────────────────────────────────────────────
  'rotate-image': {
    starter: `/// Rotate the matrix 90 degrees clockwise in place, and return it.
pub fn rotate(mut matrix: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    // your code (in place)
    matrix
}
`,
    solution: `pub fn rotate(mut matrix: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    let n = matrix.len();
    // transpose, then reverse each row
    for i in 0..n {
        for j in i + 1..n {
            let t = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = t;
        }
    }
    for row in matrix.iter_mut() {
        row.reverse();
    }
    matrix
}
`,
  },
  'spiral-matrix': {
    starter: `/// The elements of the matrix in clockwise spiral order.
pub fn spiral_order(matrix: Vec<Vec<i32>>) -> Vec<i32> {
    // your code
    vec![]
}
`,
    solution: `pub fn spiral_order(matrix: Vec<Vec<i32>>) -> Vec<i32> {
    let mut out = Vec::new();
    if matrix.is_empty() {
        return out;
    }
    let mut top = 0isize;
    let mut bottom = matrix.len() as isize - 1;
    let mut left = 0isize;
    let mut right = matrix[0].len() as isize - 1;
    while top <= bottom && left <= right {
        for c in left..=right {
            out.push(matrix[top as usize][c as usize]);
        }
        top += 1;
        for r in top..=bottom {
            out.push(matrix[r as usize][right as usize]);
        }
        right -= 1;
        if top <= bottom {
            for c in (left..=right).rev() {
                out.push(matrix[bottom as usize][c as usize]);
            }
            bottom -= 1;
        }
        if left <= right {
            for r in (top..=bottom).rev() {
                out.push(matrix[r as usize][left as usize]);
            }
            left += 1;
        }
    }
    out
}
`,
  },
  'set-matrix-zeroes': {
    starter: `/// Zero every row and column that contains a zero, in place, and return the matrix.
pub fn set_zeroes(mut matrix: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    // your code (in place)
    matrix
}
`,
    solution: `pub fn set_zeroes(mut matrix: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    let m = matrix.len();
    let n = matrix[0].len();
    // the first row and column record which rows/columns to clear; two flags cover them
    let first_col = (0..m).any(|i| matrix[i][0] == 0);
    let first_row = (0..n).any(|j| matrix[0][j] == 0);
    for i in 1..m {
        for j in 1..n {
            if matrix[i][j] == 0 {
                matrix[i][0] = 0;
                matrix[0][j] = 0;
            }
        }
    }
    for i in 1..m {
        for j in 1..n {
            if matrix[i][0] == 0 || matrix[0][j] == 0 {
                matrix[i][j] = 0;
            }
        }
    }
    if first_row {
        for j in 0..n {
            matrix[0][j] = 0;
        }
    }
    if first_col {
        for i in 0..m {
            matrix[i][0] = 0;
        }
    }
    matrix
}
`,
  },
}
