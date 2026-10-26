import type { Port } from '../types.ts'

/**
 * The graph, tree and backtracking problems in Rust: a starter and a
 * reference solution per problem id, mirroring the TypeScript versions.
 * Each file holds free `pub fn`s named in snake_case after the TypeScript
 * exports (the test runner resolves `maxDepth` to `max_depth`), with
 * TreeNode as a plain owned struct where needed. Parameters are owned
 * values the harness can build from JSON; helpers take references.
 * `server/content.test.ts` compiles and runs every solution here against
 * the problem's tests.
 */

const TREE_NODE = `#[derive(Debug, Clone, PartialEq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

impl TreeNode {
    pub fn new(val: i32) -> Self {
        TreeNode { val, left: None, right: None }
    }
}

`

const TRIE_DRIVER = `/// Test driver: replays ops against a fresh Trie. Leave as is.
pub fn run_trie(ops: Vec<String>, args: Vec<String>) -> Vec<Option<bool>> {
    let mut t = Trie::new();
    let mut out = Vec::with_capacity(ops.len());
    for (op, arg) in ops.iter().zip(args.iter()) {
        match op.as_str() {
            "insert" => { t.insert(arg); out.push(None); }
            "search" => out.push(Some(t.search(arg))),
            _ => out.push(Some(t.starts_with(arg))),
        }
    }
    out
}
`

const DICT_DRIVER = `/// Test driver. Leave as is.
pub fn run_dict(ops: Vec<String>, args: Vec<String>) -> Vec<Option<bool>> {
    let mut d = WordDictionary::new();
    let mut out = Vec::with_capacity(ops.len());
    for (op, arg) in ops.iter().zip(args.iter()) {
        if op == "add" { d.add_word(arg); out.push(None); }
        else { out.push(Some(d.search(arg))); }
    }
    out
}
`

const CLONE_GRAPH_DRIVER = `/// Test driver. Leave as is.
pub fn check(graph: HashMap<i32, Vec<i32>>) -> HashMap<String, bool> {
    let copy = clone_graph(graph.clone());
    let equal = copy == graph;
    // Owned values cannot alias: a Rust copy never shares memory with the original.
    let shared = false;
    let mut out = HashMap::new();
    out.insert("equal".to_string(), equal);
    out.insert("shared".to_string(), shared);
    out
}
`

export const RUST_GRAPHS: Record<string, Port> = {
  'number-of-islands': {
    starter: `/// Number of 4-directionally-connected land regions in grid ('1' is land, '0' is water).
pub fn num_islands(grid: Vec<Vec<char>>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn num_islands(grid: Vec<Vec<char>>) -> i32 {
    let mut grid = grid;
    let mut count = 0;
    for r in 0..grid.len() {
        for c in 0..grid[0].len() {
            if grid[r][c] == '1' {
                count += 1;
                visit(&mut grid, r as i32, c as i32);
            }
        }
    }
    count
}

fn visit(grid: &mut Vec<Vec<char>>, r: i32, c: i32) {
    if r < 0 || c < 0 || r as usize >= grid.len() || c as usize >= grid[0].len() { return; }
    let (ru, cu) = (r as usize, c as usize);
    if grid[ru][cu] != '1' { return; }
    grid[ru][cu] = '0';
    visit(grid, r + 1, c);
    visit(grid, r - 1, c);
    visit(grid, r, c + 1);
    visit(grid, r, c - 1);
}
`,
  },
  'course-schedule': {
    starter: `use std::collections::VecDeque;

/// Whether all num_courses can be taken given the prerequisites ([course, prerequisite] pairs).
pub fn can_finish(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> bool {
    // your code
    false
}
`,
    solution: `use std::collections::VecDeque;

pub fn can_finish(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> bool {
    let n = num_courses as usize;
    let mut adj: Vec<Vec<usize>> = vec![Vec::new(); n];
    let mut indegree = vec![0usize; n];
    for p in &prerequisites {
        adj[p[1] as usize].push(p[0] as usize);
        indegree[p[0] as usize] += 1;
    }
    let mut queue: VecDeque<usize> = (0..n).filter(|&i| indegree[i] == 0).collect();
    let mut done = 0;
    while let Some(course) = queue.pop_front() {
        done += 1;
        for &next in &adj[course] {
            indegree[next] -= 1;
            if indegree[next] == 0 { queue.push_back(next); }
        }
    }
    done == n
}
`,
  },
  'connected-components': {
    starter: `/// Count connected components in an undirected graph with n nodes and the given edges.
pub fn count_components(n: i32, edges: Vec<Vec<i32>>) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn count_components(n: i32, edges: Vec<Vec<i32>>) -> i32 {
    let n = n as usize;
    let mut parent: Vec<usize> = (0..n).collect();
    let mut rank = vec![0usize; n];
    let mut components = n as i32;
    for e in &edges {
        let mut ra = find(&mut parent, e[0] as usize);
        let mut rb = find(&mut parent, e[1] as usize);
        if ra == rb { continue; }
        if rank[ra] < rank[rb] { std::mem::swap(&mut ra, &mut rb); }
        parent[rb] = ra;
        if rank[ra] == rank[rb] { rank[ra] += 1; }
        components -= 1;
    }
    components
}

fn find(parent: &mut [usize], mut x: usize) -> usize {
    while parent[x] != x {
        parent[x] = parent[parent[x]]; // path halving
        x = parent[x];
    }
    x
}
`,
  },
  'implement-trie': {
    starter: `use std::collections::HashMap;

pub struct Trie {
    // your fields
}

impl Trie {
    pub fn new() -> Self {
        // your code
        Trie {}
    }

    pub fn insert(&mut self, word: &str) {
        // your code
    }

    pub fn search(&self, word: &str) -> bool {
        // your code
        false
    }

    pub fn starts_with(&self, prefix: &str) -> bool {
        // your code
        false
    }
}

` + TRIE_DRIVER,
    solution: `use std::collections::HashMap;

#[derive(Default)]
struct Node {
    children: HashMap<char, Node>,
    end: bool,
}

pub struct Trie {
    root: Node,
}

impl Trie {
    pub fn new() -> Self {
        Trie { root: Node::default() }
    }

    pub fn insert(&mut self, word: &str) {
        let mut node = &mut self.root;
        for ch in word.chars() {
            node = node.children.entry(ch).or_default();
        }
        node.end = true;
    }

    fn walk(&self, s: &str) -> Option<&Node> {
        let mut node = &self.root;
        for ch in s.chars() {
            node = node.children.get(&ch)?;
        }
        Some(node)
    }

    pub fn search(&self, word: &str) -> bool {
        self.walk(word).map_or(false, |n| n.end)
    }

    pub fn starts_with(&self, prefix: &str) -> bool {
        self.walk(prefix).is_some()
    }
}

` + TRIE_DRIVER,
  },
  'level-order-traversal': {
    starter: TREE_NODE + `use std::collections::VecDeque;

/// Values level by level.
pub fn level_order(root: Option<Box<TreeNode>>) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: TREE_NODE + `use std::collections::VecDeque;

pub fn level_order(root: Option<Box<TreeNode>>) -> Vec<Vec<i32>> {
    let mut out = Vec::new();
    let mut queue: VecDeque<&TreeNode> = VecDeque::new();
    if let Some(r) = root.as_deref() { queue.push_back(r); }
    while !queue.is_empty() {
        let mut level = Vec::with_capacity(queue.len());
        for _ in 0..queue.len() {
            let n = queue.pop_front().unwrap();
            level.push(n.val);
            if let Some(l) = n.left.as_deref() { queue.push_back(l); }
            if let Some(r) = n.right.as_deref() { queue.push_back(r); }
        }
        out.push(level);
    }
    out
}
`,
  },
  'validate-bst': {
    starter: TREE_NODE + `/// Is this a valid binary search tree?
pub fn is_valid_bst(root: Option<Box<TreeNode>>) -> bool {
    // your code
    false
}
`,
    solution: TREE_NODE + `pub fn is_valid_bst(root: Option<Box<TreeNode>>) -> bool {
    ok(root.as_deref(), None, None)
}

fn ok(n: Option<&TreeNode>, lo: Option<i32>, hi: Option<i32>) -> bool {
    match n {
        None => true,
        Some(n) => {
            if lo.map_or(false, |lo| n.val <= lo) { return false; }
            if hi.map_or(false, |hi| n.val >= hi) { return false; }
            ok(n.left.as_deref(), lo, Some(n.val)) && ok(n.right.as_deref(), Some(n.val), hi)
        }
    }
}
`,
  },
  'shortest-path-grid': {
    starter: `use std::collections::VecDeque;

/// Length of the shortest open path (cells counted) from (0,0) to (rows-1, cols-1), or -1. 0 is open, 1 is blocked.
pub fn shortest_path(grid: Vec<Vec<i32>>) -> i32 {
    // your code
    -1
}
`,
    solution: `use std::collections::VecDeque;

pub fn shortest_path(grid: Vec<Vec<i32>>) -> i32 {
    let rows = grid.len();
    let cols = if rows == 0 { 0 } else { grid[0].len() };
    if rows == 0 || cols == 0 || grid[0][0] == 1 || grid[rows - 1][cols - 1] == 1 { return -1; }
    let mut seen = vec![vec![false; cols]; rows];
    let mut queue = VecDeque::new();
    queue.push_back((0usize, 0usize, 1i32));
    seen[0][0] = true;
    let dirs = [(1i32, 0i32), (-1, 0), (0, 1), (0, -1)];
    while let Some((r, c, dist)) = queue.pop_front() {
        if r == rows - 1 && c == cols - 1 { return dist; }
        for (dr, dc) in dirs {
            let nr = r as i32 + dr;
            let nc = c as i32 + dc;
            if nr < 0 || nc < 0 || nr >= rows as i32 || nc >= cols as i32 { continue; }
            let (nr, nc) = (nr as usize, nc as usize);
            if seen[nr][nc] || grid[nr][nc] == 1 { continue; }
            seen[nr][nc] = true;
            queue.push_back((nr, nc, dist + 1));
        }
    }
    -1
}
`,
  },
  'max-depth-binary-tree': {
    starter: TREE_NODE + `/// Number of nodes on the longest root-to-leaf path (0 for an empty tree).
pub fn max_depth(root: Option<Box<TreeNode>>) -> i32 {
    // your code
    0
}
`,
    solution: TREE_NODE + `pub fn max_depth(root: Option<Box<TreeNode>>) -> i32 {
    match root {
        None => 0,
        Some(node) => 1 + max_depth(node.left).max(max_depth(node.right)),
    }
}
`,
  },
  'invert-binary-tree': {
    starter: TREE_NODE + `/// Mirror the tree: swap the left and right children of every node, and return the root.
pub fn invert_tree(root: Option<Box<TreeNode>>) -> Option<Box<TreeNode>> {
    // your code
    None
}
`,
    solution: TREE_NODE + `pub fn invert_tree(root: Option<Box<TreeNode>>) -> Option<Box<TreeNode>> {
    let mut node = root?;
    let left = node.left.take();
    node.left = invert_tree(node.right.take());
    node.right = invert_tree(left);
    Some(node)
}
`,
  },
  'diameter-binary-tree': {
    starter: TREE_NODE + `/// Number of edges on the longest path between any two nodes.
pub fn diameter_of_binary_tree(root: Option<Box<TreeNode>>) -> i32 {
    // your code
    0
}
`,
    solution: TREE_NODE + `pub fn diameter_of_binary_tree(root: Option<Box<TreeNode>>) -> i32 {
    let mut best = 0;
    height(root.as_deref(), &mut best);
    best
}

fn height(n: Option<&TreeNode>, best: &mut i32) -> i32 {
    match n {
        None => 0,
        Some(n) => {
            let l = height(n.left.as_deref(), best);
            let r = height(n.right.as_deref(), best);
            *best = (*best).max(l + r);
            1 + l.max(r)
        }
    }
}
`,
  },
  'same-tree': {
    starter: TREE_NODE + `/// Are the two trees structurally identical with equal values?
pub fn is_same_tree(p: Option<Box<TreeNode>>, q: Option<Box<TreeNode>>) -> bool {
    // your code
    false
}
`,
    solution: TREE_NODE + `pub fn is_same_tree(p: Option<Box<TreeNode>>, q: Option<Box<TreeNode>>) -> bool {
    match (p, q) {
        (None, None) => true,
        (Some(a), Some(b)) => a.val == b.val && is_same_tree(a.left, b.left) && is_same_tree(a.right, b.right),
        _ => false,
    }
}
`,
  },
  'lca-bst': {
    starter: TREE_NODE + `/// The value of the lowest common ancestor of p and q (values) in the BST, or None.
pub fn lowest_common_ancestor(root: Option<Box<TreeNode>>, p: i32, q: i32) -> Option<i32> {
    // your code
    None
}
`,
    solution: TREE_NODE + `pub fn lowest_common_ancestor(root: Option<Box<TreeNode>>, p: i32, q: i32) -> Option<i32> {
    let mut n = root.as_deref();
    while let Some(node) = n {
        if p < node.val && q < node.val { n = node.left.as_deref(); }
        else if p > node.val && q > node.val { n = node.right.as_deref(); }
        else { return Some(node.val); }
    }
    None
}
`,
  },
  'kth-smallest-bst': {
    starter: TREE_NODE + `/// The k-th smallest value (1-indexed) in the BST.
pub fn kth_smallest(root: Option<Box<TreeNode>>, k: i32) -> i32 {
    // your code
    0
}
`,
    solution: TREE_NODE + `pub fn kth_smallest(root: Option<Box<TreeNode>>, k: i32) -> i32 {
    let mut stack: Vec<&TreeNode> = Vec::new();
    let mut n = root.as_deref();
    let mut k = k;
    loop {
        while let Some(node) = n {
            stack.push(node);
            n = node.left.as_deref();
        }
        let node = match stack.pop() {
            Some(node) => node,
            None => return -1,
        };
        k -= 1;
        if k == 0 { return node.val; }
        n = node.right.as_deref();
    }
}
`,
  },
  'build-tree-preorder-inorder': {
    starter: TREE_NODE + `use std::collections::HashMap;

/// Rebuild the binary tree (distinct values) from its preorder and inorder traversals.
pub fn build_tree(preorder: Vec<i32>, inorder: Vec<i32>) -> Option<Box<TreeNode>> {
    // your code
    None
}
`,
    solution: TREE_NODE + `use std::collections::HashMap;

pub fn build_tree(preorder: Vec<i32>, inorder: Vec<i32>) -> Option<Box<TreeNode>> {
    let at: HashMap<i32, i32> = inorder.iter().enumerate().map(|(i, &v)| (v, i as i32)).collect();
    let mut pre = 0;
    build(&preorder, &at, &mut pre, 0, inorder.len() as i32 - 1)
}

fn build(preorder: &[i32], at: &HashMap<i32, i32>, pre: &mut usize, lo: i32, hi: i32) -> Option<Box<TreeNode>> {
    if lo > hi { return None; }
    let val = preorder[*pre];
    *pre += 1;
    let mid = at[&val];
    let left = build(preorder, at, pre, lo, mid - 1);
    let right = build(preorder, at, pre, mid + 1, hi);
    Some(Box::new(TreeNode { val, left, right }))
}
`,
  },
  'add-search-words': {
    starter: `use std::collections::HashMap;

pub struct WordDictionary {
    // your fields
}

impl WordDictionary {
    pub fn new() -> Self {
        // your code
        WordDictionary {}
    }

    pub fn add_word(&mut self, word: &str) {
        // your code
    }

    /// Does any added word match? '.' in word matches any single letter.
    pub fn search(&self, word: &str) -> bool {
        // your code
        false
    }
}

` + DICT_DRIVER,
    solution: `use std::collections::HashMap;

#[derive(Default)]
struct Node {
    children: HashMap<char, Node>,
    end: bool,
}

impl Node {
    fn matches(&self, word: &[char], i: usize) -> bool {
        if i == word.len() { return self.end; }
        if word[i] == '.' {
            return self.children.values().any(|child| child.matches(word, i + 1));
        }
        self.children.get(&word[i]).map_or(false, |next| next.matches(word, i + 1))
    }
}

pub struct WordDictionary {
    root: Node,
}

impl WordDictionary {
    pub fn new() -> Self {
        WordDictionary { root: Node::default() }
    }

    pub fn add_word(&mut self, word: &str) {
        let mut node = &mut self.root;
        for ch in word.chars() {
            node = node.children.entry(ch).or_default();
        }
        node.end = true;
    }

    pub fn search(&self, word: &str) -> bool {
        let chars: Vec<char> = word.chars().collect();
        self.root.matches(&chars, 0)
    }
}

` + DICT_DRIVER,
  },
  'rotting-oranges': {
    starter: `use std::collections::VecDeque;

/// Minutes until no fresh orange (1) remains, rot (2) spreading 4-directionally each minute; -1 if impossible.
pub fn oranges_rotting(grid: Vec<Vec<i32>>) -> i32 {
    // your code
    -1
}
`,
    solution: `use std::collections::VecDeque;

pub fn oranges_rotting(grid: Vec<Vec<i32>>) -> i32 {
    let mut grid = grid;
    let rows = grid.len();
    let cols = grid[0].len();
    let mut queue = VecDeque::new();
    let mut fresh = 0;
    for r in 0..rows {
        for c in 0..cols {
            if grid[r][c] == 2 { queue.push_back((r, c)); }
            else if grid[r][c] == 1 { fresh += 1; }
        }
    }
    let mut minutes = 0;
    let dirs = [(1i32, 0i32), (-1, 0), (0, 1), (0, -1)];
    while !queue.is_empty() && fresh > 0 {
        for _ in 0..queue.len() {
            let (r, c) = queue.pop_front().unwrap();
            for (dr, dc) in dirs {
                let nr = r as i32 + dr;
                let nc = c as i32 + dc;
                if nr < 0 || nc < 0 || nr >= rows as i32 || nc >= cols as i32 { continue; }
                let (nr, nc) = (nr as usize, nc as usize);
                if grid[nr][nc] != 1 { continue; }
                grid[nr][nc] = 2;
                fresh -= 1;
                queue.push_back((nr, nc));
            }
        }
        minutes += 1;
    }
    if fresh == 0 { minutes } else { -1 }
}
`,
  },
  'pacific-atlantic': {
    starter: `/// Cells [r, c] from which water can flow (to equal or lower neighbours) to both the top/left and bottom/right edges, in any order.
pub fn pacific_atlantic(heights: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: `pub fn pacific_atlantic(heights: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    let rows = heights.len();
    if rows == 0 { return vec![]; }
    let cols = heights[0].len();
    let mut pac = vec![vec![false; cols]; rows];
    let mut atl = vec![vec![false; cols]; rows];
    for r in 0..rows {
        dfs(&heights, r, 0, &mut pac);
        dfs(&heights, r, cols - 1, &mut atl);
    }
    for c in 0..cols {
        dfs(&heights, 0, c, &mut pac);
        dfs(&heights, rows - 1, c, &mut atl);
    }
    let mut out = Vec::new();
    for r in 0..rows {
        for c in 0..cols {
            if pac[r][c] && atl[r][c] { out.push(vec![r as i32, c as i32]); }
        }
    }
    out
}

/// Walk uphill from an ocean cell, marking every cell whose water reaches it.
fn dfs(heights: &[Vec<i32>], r: usize, c: usize, seen: &mut Vec<Vec<bool>>) {
    seen[r][c] = true;
    let (rows, cols) = (heights.len() as i32, heights[0].len() as i32);
    for (dr, dc) in [(1i32, 0i32), (-1, 0), (0, 1), (0, -1)] {
        let nr = r as i32 + dr;
        let nc = c as i32 + dc;
        if nr < 0 || nc < 0 || nr >= rows || nc >= cols { continue; }
        let (nr, nc) = (nr as usize, nc as usize);
        if seen[nr][nc] || heights[nr][nc] < heights[r][c] { continue; }
        dfs(heights, nr, nc, seen);
    }
}
`,
  },
  'clone-graph-adjacency': {
    starter: `use std::collections::HashMap;

/// graph maps a node id to the list of its neighbour ids. Return a deep copy.
pub fn clone_graph(graph: HashMap<i32, Vec<i32>>) -> HashMap<i32, Vec<i32>> {
    // your code
    HashMap::new()
}

` + CLONE_GRAPH_DRIVER,
    solution: `use std::collections::HashMap;

pub fn clone_graph(graph: HashMap<i32, Vec<i32>>) -> HashMap<i32, Vec<i32>> {
    let mut seen: HashMap<i32, Vec<i32>> = HashMap::new();
    for &k in graph.keys() { visit(&graph, k, &mut seen); }
    let mut out = HashMap::new();
    for &k in graph.keys() {
        if let Some(copy) = seen.remove(&k) { out.insert(k, copy); }
    }
    out
}

/// Copy node k's adjacency list, then its neighbours', each node once.
fn visit(graph: &HashMap<i32, Vec<i32>>, k: i32, seen: &mut HashMap<i32, Vec<i32>>) {
    if seen.contains_key(&k) { return; }
    let copy: Vec<i32> = graph.get(&k).map_or_else(Vec::new, |ns| ns.clone());
    seen.insert(k, copy.clone());
    for n in copy { visit(graph, n, seen); }
}

` + CLONE_GRAPH_DRIVER,
  },
  'network-delay-time': {
    starter: `use std::cmp::Reverse;
use std::collections::BinaryHeap;

/// times are directed edges [from, to, delay] between nodes 1..=n. Time for a signal from k to reach every node, or -1.
pub fn network_delay_time(times: Vec<Vec<i32>>, n: i32, k: i32) -> i32 {
    // your code
    -1
}
`,
    solution: `use std::cmp::Reverse;
use std::collections::BinaryHeap;

pub fn network_delay_time(times: Vec<Vec<i32>>, n: i32, k: i32) -> i32 {
    let n = n as usize;
    let mut adj: Vec<Vec<(usize, i32)>> = vec![Vec::new(); n + 1];
    for t in &times { adj[t[0] as usize].push((t[1] as usize, t[2])); }
    let mut dist = vec![i32::MAX; n + 1];
    dist[k as usize] = 0;
    // Dijkstra: the heap is a max-heap, so Reverse makes it pop the smallest distance first.
    let mut heap = BinaryHeap::new();
    heap.push(Reverse((0, k as usize)));
    while let Some(Reverse((d, u))) = heap.pop() {
        if d > dist[u] { continue; } // a stale entry, already improved on
        for &(v, w) in &adj[u] {
            let nd = d + w;
            if nd < dist[v] {
                dist[v] = nd;
                heap.push(Reverse((nd, v)));
            }
        }
    }
    let worst = *dist[1..].iter().max().unwrap_or(&0);
    if worst == i32::MAX { -1 } else { worst }
}
`,
  },
  'cheapest-flights-k-stops': {
    starter: `/// Cheapest price from src to dst using flights [from, to, price] with at most k stops, or -1.
pub fn find_cheapest_price(n: i32, flights: Vec<Vec<i32>>, src: i32, dst: i32, k: i32) -> i32 {
    // your code
    -1
}
`,
    solution: `pub fn find_cheapest_price(n: i32, flights: Vec<Vec<i32>>, src: i32, dst: i32, k: i32) -> i32 {
    let inf = i32::MAX;
    let mut dist = vec![inf; n as usize];
    dist[src as usize] = 0;
    // Bellman-Ford for k + 1 rounds, relaxing from a copy so each round adds exactly one edge.
    for _ in 0..=k {
        let mut next = dist.clone();
        for f in &flights {
            let (from, to, price) = (f[0] as usize, f[1] as usize, f[2]);
            if dist[from] != inf && dist[from] + price < next[to] { next[to] = dist[from] + price; }
        }
        dist = next;
    }
    if dist[dst as usize] == inf { -1 } else { dist[dst as usize] }
}
`,
  },
  'word-ladder': {
    starter: `use std::collections::{HashSet, VecDeque};

/// Number of words in the shortest one-letter-change sequence from begin_word to end_word through word_list (both ends counted), or 0.
pub fn ladder_length(begin_word: String, end_word: String, word_list: Vec<String>) -> i32 {
    // your code
    0
}
`,
    solution: `use std::collections::{HashSet, VecDeque};

pub fn ladder_length(begin_word: String, end_word: String, word_list: Vec<String>) -> i32 {
    let mut words: HashSet<String> = word_list.into_iter().collect();
    if !words.contains(&end_word) { return 0; }
    words.remove(&begin_word);
    let mut queue = VecDeque::new();
    queue.push_back((begin_word, 1));
    while let Some((w, steps)) = queue.pop_front() {
        if w == end_word { return steps; }
        let mut chars: Vec<char> = w.chars().collect();
        for i in 0..chars.len() {
            let original = chars[i];
            for c in 'a'..='z' {
                chars[i] = c;
                let cand: String = chars.iter().collect();
                // Removing on enqueue doubles as the visited set.
                if words.remove(&cand) { queue.push_back((cand, steps + 1)); }
            }
            chars[i] = original;
        }
    }
    0
}
`,
  },
  'permutations': {
    starter: `/// All permutations of nums, in any order.
pub fn permute(nums: Vec<i32>) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: `pub fn permute(nums: Vec<i32>) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut used = vec![false; nums.len()];
    backtrack(&nums, &mut used, &mut Vec::new(), &mut result);
    result
}

fn backtrack(nums: &[i32], used: &mut [bool], current: &mut Vec<i32>, result: &mut Vec<Vec<i32>>) {
    if current.len() == nums.len() {
        result.push(current.clone());
        return;
    }
    for i in 0..nums.len() {
        if used[i] { continue; }
        used[i] = true;
        current.push(nums[i]);
        backtrack(nums, used, current, result);
        current.pop();
        used[i] = false;
    }
}
`,
  },
  'subsets': {
    starter: `/// All subsets (the power set) of the distinct nums, in any order.
pub fn subsets(nums: Vec<i32>) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: `pub fn subsets(nums: Vec<i32>) -> Vec<Vec<i32>> {
    let mut out = Vec::new();
    go(&nums, 0, &mut Vec::new(), &mut out);
    out
}

fn go(nums: &[i32], start: usize, path: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
    out.push(path.clone());
    for i in start..nums.len() {
        path.push(nums[i]);
        go(nums, i + 1, path, out);
        path.pop();
    }
}
`,
  },
  'combination-sum': {
    starter: `/// All unique combinations of candidates (each reusable any number of times) that sum to target, in any order.
pub fn combination_sum(candidates: Vec<i32>, target: i32) -> Vec<Vec<i32>> {
    // your code
    vec![]
}
`,
    solution: `pub fn combination_sum(candidates: Vec<i32>, target: i32) -> Vec<Vec<i32>> {
    let mut out = Vec::new();
    go(&candidates, 0, target, &mut Vec::new(), &mut out);
    out
}

fn go(candidates: &[i32], start: usize, remaining: i32, path: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
    if remaining == 0 {
        out.push(path.clone());
        return;
    }
    for i in start..candidates.len() {
        if candidates[i] > remaining { continue; }
        path.push(candidates[i]);
        go(candidates, i, remaining - candidates[i], path, out); // i, not i + 1: reuse allowed
        path.pop();
    }
}
`,
  },
  'word-search': {
    starter: `/// Can word be traced on the board through 4-directionally adjacent cells, each used at most once?
pub fn exist(board: Vec<Vec<char>>, word: String) -> bool {
    // your code
    false
}
`,
    solution: `pub fn exist(board: Vec<Vec<char>>, word: String) -> bool {
    let mut board = board;
    let word: Vec<char> = word.chars().collect();
    for r in 0..board.len() {
        for c in 0..board[0].len() {
            if dfs(&mut board, &word, r as i32, c as i32, 0) { return true; }
        }
    }
    false
}

fn dfs(board: &mut Vec<Vec<char>>, word: &[char], r: i32, c: i32, i: usize) -> bool {
    if i == word.len() { return true; }
    if r < 0 || c < 0 || r as usize >= board.len() || c as usize >= board[0].len() { return false; }
    let (ru, cu) = (r as usize, c as usize);
    if board[ru][cu] != word[i] { return false; }
    let saved = board[ru][cu];
    board[ru][cu] = '#'; // mark the cell as in use on this path
    let found = dfs(board, word, r + 1, c, i + 1)
        || dfs(board, word, r - 1, c, i + 1)
        || dfs(board, word, r, c + 1, i + 1)
        || dfs(board, word, r, c - 1, i + 1);
    board[ru][cu] = saved;
    found
}
`,
  },
  'n-queens': {
    starter: `/// Number of distinct ways to place n queens on an n x n board so none attack each other.
pub fn total_n_queens(n: i32) -> i32 {
    // your code
    0
}
`,
    solution: `pub fn total_n_queens(n: i32) -> i32 {
    let n = n as usize;
    let mut cols = vec![false; n];
    let mut diag = vec![false; 2 * n];
    let mut anti = vec![false; 2 * n];
    place(n, 0, &mut cols, &mut diag, &mut anti)
}

fn place(n: usize, r: usize, cols: &mut [bool], diag: &mut [bool], anti: &mut [bool]) -> i32 {
    if r == n { return 1; }
    let mut count = 0;
    for c in 0..n {
        let d = r + n - c; // r - c, shifted by n to stay non-negative
        let a = r + c;
        if cols[c] || diag[d] || anti[a] { continue; }
        cols[c] = true;
        diag[d] = true;
        anti[a] = true;
        count += place(n, r + 1, cols, diag, anti);
        cols[c] = false;
        diag[d] = false;
        anti[a] = false;
    }
    count
}
`,
  },
}
