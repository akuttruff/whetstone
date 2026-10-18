import { G, list } from './frames.ts'
import type { Cell, Frame, Tone, Viz } from './frames.ts'

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

/** Number of islands: flood fill with DFS, marking visited cells. */
export function floodFill(): Viz {
  const grid = ['11000', '11010', '00100', '00011'].map((r) => [...r])
  const R = grid.length
  const C = grid[0]!.length
  const seen = grid.map((r) => r.map(() => false))
  let islands = 0
  const f: Frame[] = []
  const cells = (hot?: [number, number], island = 0): Cell[][] => grid.map((row, i) => row.map((v, j) => ({ v: v === '1' ? (seen[i]![j] ? String(islandOf[i]![j]) : '▮') : '', tone: hot && hot[0] === i && hot[1] === j ? 'active' : seen[i]![j] ? (islandOf[i]![j] === island ? 'match' : 'done') : v === '1' ? 'window' : 'dim' })))
  const islandOf = grid.map((r) => r.map(() => 0))
  f.push(G({ cells: cells(), caption: 'Scan every cell. When you hit unvisited land, that is a new island: flood outwards (DFS) marking every connected land cell so it is never counted again.' }))
  const stack: [number, number][] = []
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      if (grid[i]![j] !== '1' || seen[i]![j]) continue
      islands++
      stack.push([i, j])
      seen[i]![j] = true
      islandOf[i]![j] = islands
      f.push(G({ cells: cells([i, j], islands), vars: { islands }, caption: `(${i}, ${j}) is unvisited land: island ${islands}. Flood from here.` }))
      while (stack.length) {
        const [r, c] = stack.pop()!
        for (const [dr, dc] of DIRS) {
          const nr = r + dr
          const nc = c + dc
          if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr]![nc] !== '1' || seen[nr]![nc]) continue
          seen[nr]![nc] = true
          islandOf[nr]![nc] = islands
          stack.push([nr, nc])
          f.push(G({ cells: cells([nr, nc], islands), aux: [list('to visit', stack.map(([a, b]) => `${a},${b}`))], vars: { islands }, caption: `Neighbour (${nr}, ${nc}) is land: mark it as island ${islands} and keep flooding.` }))
        }
      }
    }
  }
  f.push(G({ cells: cells(), vars: { islands }, caption: `${islands} islands. Every cell is visited once: O(rows × cols).` }))
  return { title: `${R} × ${C} grid`, frames: f }
}

/** Shortest path on a grid with BFS: distances grow in rings. */
export function bfsGrid(): Viz {
  const grid = ['....', '.##.', '...#', '#...'].map((r) => [...r])
  const R = grid.length
  const C = grid[0]!.length
  const dist = grid.map((r) => r.map(() => -1))
  const f: Frame[] = []
  const cells = (frontier: [number, number][] = [], hot?: [number, number]): Cell[][] => grid.map((row, i) => row.map((v, j) => ({ v: v === '#' ? '▮' : dist[i]![j] >= 0 ? dist[i]![j] : '', tone: hot && hot[0] === i && hot[1] === j ? 'active' : frontier.some(([a, b]) => a === i && b === j) ? 'match' : v === '#' ? 'dim' : dist[i]![j] >= 0 ? 'done' : undefined })))
  f.push(G({ cells: cells(), caption: 'Every step costs 1, so breadth-first search finds the shortest path: it visits all cells at distance 1, then 2, then 3. The first time a cell is reached is the shortest way to it.' }))
  let queue: [number, number][] = [[0, 0]]
  dist[0]![0] = 0
  f.push(G({ cells: cells(queue), aux: [list('queue', queue.map(([a, b]) => `${a},${b}`))], caption: 'Start at (0, 0) with distance 0.' }))
  while (queue.length) {
    const [r, c] = queue.shift()!
    const d = dist[r]![c]!
    const added: [number, number][] = []
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr]![nc] === '#' || dist[nr]![nc]! >= 0) continue
      dist[nr]![nc] = d + 1
      queue.push([nr, nc])
      added.push([nr, nc])
    }
    if (added.length) f.push(G({ cells: cells(queue, [r, c]), aux: [list('queue', queue.map(([a, b]) => `${a},${b}`))], caption: `Pop (${r}, ${c}) at distance ${d}; its unvisited open neighbours get distance ${d + 1}: ${added.map(([a, b]) => `(${a}, ${b})`).join(', ')}.` }))
    if (r === R - 1 && c === C - 1) break
  }
  f.push(G({ cells: cells(), vars: { 'distance to corner': dist[R - 1]![C - 1]! }, caption: `Bottom-right is ${dist[R - 1]![C - 1]} steps away. Each cell enters the queue at most once: O(rows × cols).` }))
  return { title: `${R} × ${C} grid, ▮ = wall`, frames: f }
}

/** Rotting oranges: BFS from every rotten orange at once. */
export function multiSourceBfs(): Viz {
  const grid = [[2, 1, 1], [1, 1, 0], [0, 1, 1]]
  const R = grid.length
  const C = grid[0]!.length
  const g = grid.map((r) => [...r])
  const minute: number[][] = g.map((r) => r.map((v) => (v === 2 ? 0 : -1)))
  const f: Frame[] = []
  const cells = (frontier: [number, number][] = []): Cell[][] => g.map((row, i) => row.map((v, j) => ({ v: v === 0 ? '' : v === 2 ? `${minute[i]![j]}` : '🍊', tone: frontier.some(([a, b]) => a === i && b === j) ? 'match' : v === 2 ? 'done' : v === 1 ? 'window' : 'dim' })))
  let queue: [number, number][] = []
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (g[i]![j] === 2) queue.push([i, j])
  f.push(G({ cells: cells(queue), caption: 'Rot spreads one step per minute from every rotten orange at the same time. Seed the BFS queue with all of them, then expand in rounds: each round is one minute.' }))
  let t = 0
  while (queue.length) {
    const next: [number, number][] = []
    for (const [r, c] of queue) {
      for (const [dr, dc] of DIRS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr]![nc] !== 1) continue
        g[nr]![nc] = 2
        minute[nr]![nc] = t + 1
        next.push([nr, nc])
      }
    }
    if (next.length === 0) break
    t++
    f.push(G({ cells: cells(next), vars: { minute: t }, caption: `Minute ${t}: ${next.length} fresh orange${next.length === 1 ? '' : 's'} next to the rot turn.` }))
    queue = next
  }
  const fresh = g.flat().filter((v) => v === 1).length
  f.push(G({ cells: cells(), vars: { minutes: fresh ? -1 : t }, caption: fresh ? `${fresh} orange(s) are unreachable: answer −1.` : `Everything rotted after ${t} minutes. One BFS, O(rows × cols).` }))
  return { title: `${R} × ${C} grid, 0 = empty, 🍊 fresh, number = minute it rotted`, frames: f }
}

/** Word search: DFS from each start, marking a cell on the way in and restoring it on the way out. */
export function gridBacktracking(): Viz {
  const board = ['ABCE', 'SFCS', 'ADEE'].map((r) => [...r])
  const word = 'SEE'
  const R = board.length
  const C = board[0]!.length
  const path: [number, number][] = []
  const f: Frame[] = []
  const cells = (hot?: [number, number], tone: Tone = 'active'): Cell[][] => board.map((row, i) => row.map((v, j) => ({ v, tone: hot && hot[0] === i && hot[1] === j ? tone : path.some(([a, b]) => a === i && b === j) ? 'match' : undefined })))
  f.push(G({ cells: cells(), aux: [list('word', [...word])], caption: `Find "${word}" along a path of neighbouring cells, no cell twice. Try each cell as a start; DFS forwards letter by letter. Mark a cell when stepping on it, unmark when stepping back, so other branches may use it.` }))
  let found = false
  const dfs = (r: number, c: number, k: number): boolean => {
    if (board[r]![c] !== word[k]) {
      f.push(G({ cells: cells([r, c], 'bad'), aux: [list('word', [...word], (x) => (x < k ? 'match' : x === k ? 'active' : undefined))], caption: `(${r}, ${c}) is '${board[r]![c]}', need '${word[k]}': dead end, back up.` }))
      return false
    }
    path.push([r, c])
    if (k === word.length - 1) {
      f.push(G({ cells: cells(), aux: [list('word', [...word], () => 'done')], caption: `'${word[k]}' matched and the word is complete: found.` }))
      return true
    }
    f.push(G({ cells: cells([r, c], 'match'), aux: [list('word', [...word], (x) => (x <= k ? 'match' : undefined))], caption: `(${r}, ${c}) = '${word[k]}' matches letter ${k}. Mark it and try the neighbours for '${word[k + 1]}'.` }))
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || path.some(([a, b]) => a === nr && b === nc)) continue
      if (dfs(nr, nc, k + 1)) return true
    }
    path.pop()
    f.push(G({ cells: cells([r, c], 'bad'), aux: [list('word', [...word], (x) => (x < k ? 'match' : undefined))], caption: `No neighbour of (${r}, ${c}) continues the word. Unmark it and back up.` }))
    return false
  }
  outer: for (let i = 0; i < R && !found; i++) {
    for (let j = 0; j < C; j++) {
      if (board[i]![j] !== word[0]) continue
      f.push(G({ cells: cells([i, j]), aux: [list('word', [...word])], caption: `Start at (${i}, ${j}), which holds '${word[0]}'.` }))
      if (dfs(i, j, 0)) {
        found = true
        break outer
      }
    }
  }
  f.push(G({ cells: cells(), vars: { found }, caption: found ? `Path: ${path.map(([a, b]) => `(${a}, ${b})`).join(' → ')}. Worst case O(cells × 3^L) for a word of length L.` : 'Not found from any start.' }))
  return { title: `board = [${board.map((r) => r.join('')).join(', ')}], word = "${word}"`, frames: f }
}

/** Spiral order with four shrinking boundaries. */
export function shrinkingBoundaries(): Viz {
  const m = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]
  let top = 0
  let bottom = m.length - 1
  let left = 0
  let right = m[0]!.length - 1
  const out: number[] = []
  const f: Frame[] = []
  const cells = (hot: Set<number>): Cell[][] => m.map((row, i) => row.map((v, j) => ({ v, tone: hot.has(v) ? 'active' : out.includes(v) ? 'done' : i >= top && i <= bottom && j >= left && j <= right ? 'window' : 'dim' })))
  f.push(G({ cells: cells(new Set()), aux: [list('out', out)], caption: 'Four boundaries: top, bottom, left, right. Walk the top row, then the right column, then the bottom row backwards, then the left column upwards; after each side, pull that boundary in by one.' }))
  while (top <= bottom && left <= right) {
    const row: number[] = []
    for (let j = left; j <= right; j++) row.push(m[top]![j]!)
    out.push(...row)
    f.push(G({ cells: cells(new Set(row)), aux: [list('out', out)], vars: { top, bottom, left, right }, caption: `Top row ${top}, left to right: ${row.join(', ')}. Then top++.` }))
    top++
    const col: number[] = []
    for (let i = top; i <= bottom; i++) col.push(m[i]![right]!)
    if (col.length) {
      out.push(...col)
      f.push(G({ cells: cells(new Set(col)), aux: [list('out', out)], vars: { top, bottom, left, right }, caption: `Right column ${right}, top to bottom: ${col.join(', ')}. Then right−−.` }))
    }
    right--
    if (top <= bottom) {
      const row2: number[] = []
      for (let j = right; j >= left; j--) row2.push(m[bottom]![j]!)
      out.push(...row2)
      f.push(G({ cells: cells(new Set(row2)), aux: [list('out', out)], vars: { top, bottom, left, right }, caption: `Bottom row ${bottom}, right to left: ${row2.join(', ')}. Then bottom−−.` }))
      bottom--
    }
    if (left <= right) {
      const col2: number[] = []
      for (let i = bottom; i >= top; i--) col2.push(m[i]![left]!)
      if (col2.length) {
        out.push(...col2)
        f.push(G({ cells: cells(new Set(col2)), aux: [list('out', out)], vars: { top, bottom, left, right }, caption: `Left column ${left}, bottom to top: ${col2.join(', ')}. Then left++.` }))
      }
      left++
    }
  }
  f.push(G({ cells: cells(new Set()), aux: [list('out', out, () => 'done')], caption: `Boundaries crossed: done. [${out.join(', ')}], each cell once.` }))
  return { title: `${m.length} × ${m[0]!.length} matrix`, frames: f }
}

/** N-queens: row by row, with sets for the attacked columns and diagonals. */
export function nQueens(): Viz {
  const n = 4
  const cols = new Set<number>()
  const d1 = new Set<number>()
  const d2 = new Set<number>()
  const queens: number[] = []
  const f: Frame[] = []
  let solutions = 0
  const cells = (hot?: [number, number], tone: Tone = 'active'): Cell[][] => Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => ({ v: queens[r] === c ? '♛' : '', tone: hot && hot[0] === r && hot[1] === c ? tone : queens[r] === c ? 'match' : r > queens.length - 1 && (cols.has(c) || d1.has(r - c) || d2.has(r + c)) ? 'dim' : undefined })))
  const sets = () => [list('columns used', [...cols]), list('r − c used', [...d1]), list('r + c used', [...d2])]
  f.push(G({ cells: cells(), aux: sets(), caption: `Place one queen per row. A square is attacked if its column, its r−c diagonal or its r+c diagonal is already taken: three sets make that an O(1) check. Dim squares are attacked.` }))
  const place = (r: number): void => {
    if (r === n) {
      solutions++
      f.push(G({ cells: cells(), aux: sets(), vars: { solutions }, caption: `All ${n} rows placed: a solution.` }))
      return
    }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue
      queens.push(c)
      cols.add(c)
      d1.add(r - c)
      d2.add(r + c)
      f.push(G({ cells: cells([r, c], 'match'), aux: sets(), caption: `Row ${r}: column ${c} is free. Place a queen and record column ${c}, diagonals ${r - c} and ${r + c}.` }))
      place(r + 1)
      queens.pop()
      cols.delete(c)
      d1.delete(r - c)
      d2.delete(r + c)
      f.push(G({ cells: cells([r, c], 'bad'), aux: sets(), caption: `Back up: remove the queen from row ${r}, column ${c}, and release its column and diagonals.` }))
    }
  }
  place(0)
  f.push(G({ cells: cells(), vars: { solutions }, caption: `${solutions} solutions for n = ${n}. The sets prune every attacked square without scanning the board.` }))
  return { title: `n = ${n}`, frames: f }
}
