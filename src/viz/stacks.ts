import { A, cellsOf, list } from './frames.ts'
import type { Frame, Viz } from './frames.ts'

/** Valid parentheses: push openers, pop on a matching closer. */
export function stackMatching(): Viz {
  const s = '{[()]}('
  const chars = [...s]
  const pair: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  const stack: string[] = []
  const f: Frame[] = []
  const st = (hot?: 'active' | 'bad') => list('stack (top on the right)', stack, (j) => (hot && j === stack.length - 1 ? hot : undefined))
  f.push(A({ cells: cellsOf(chars), aux: [st()], caption: 'The most recently opened bracket must close first: that is a stack. Push openers; on a closer, the top must be its partner.' }))
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (c in pair) {
      const top = stack[stack.length - 1]
      if (top !== pair[c]) {
        f.push(A({ cells: cellsOf(chars, (j) => (j === i ? 'bad' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [st('bad')], caption: `'${c}' needs '${pair[c]}' on top, but the top is ${top ? `'${top}'` : 'empty'}: invalid.` }))
        return { title: `s = "${s}"`, frames: f }
      }
      stack.pop()
      f.push(A({ cells: cellsOf(chars, (j) => (j === i ? 'match' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [st()], caption: `'${c}' matches the top '${pair[c]}': pop.` }))
    } else {
      stack.push(c)
      f.push(A({ cells: cellsOf(chars, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [st('active')], caption: `'${c}' opens: push.` }))
    }
  }
  const ok = stack.length === 0
  f.push(A({ cells: cellsOf(chars, () => (ok ? 'done' : 'bad')), aux: [st(ok ? undefined : 'bad')], caption: ok ? 'End of input with an empty stack: valid.' : `End of input but '${stack.join('')}' never closed: invalid.` }))
  return { title: `s = "${s}"`, frames: f }
}

/** Daily temperatures with a monotonic (decreasing) stack of indices. */
export function monotonicStack(): Viz {
  const t = [73, 74, 75, 71, 69, 72, 76, 73]
  const out = new Array<number>(t.length).fill(0)
  const stack: number[] = []
  const f: Frame[] = []
  const st = (hot?: number, tone: 'active' | 'bad' = 'active') => list('stack: index (temp), bottom first', stack.map((i) => `${i} (${t[i]})`), (j) => (stack[j] === hot ? tone : undefined), 'temps decrease bottom to top: each is still waiting for a warmer day')
  f.push(A({ cells: cellsOf(t), aux: [st(), list('answer (days to wait)', out)], caption: 'Keep a stack of indices still waiting for a warmer day; their temperatures decrease upwards. Each new day pops every colder day below it and answers them.' }))
  for (let i = 0; i < t.length; i++) {
    while (stack.length && t[stack[stack.length - 1]!]! < t[i]!) {
      const j = stack[stack.length - 1]!
      out[j] = i - j
      f.push(A({ cells: cellsOf(t, (x) => (x === j ? 'match' : x === i ? 'active' : out[x] ? 'done' : undefined)), marks: [{ i, label: 'i' }, { i: j, label: 'j', tone: 'match' }], aux: [st(j, 'bad'), list('answer (days to wait)', out, (x) => (x === j ? 'match' : undefined))], caption: `${t[i]} > ${t[j]}: day ${j} finally has its warmer day. answer[${j}] = ${i} − ${j} = ${i - j}. Pop it.` }))
      stack.pop()
    }
    stack.push(i)
    f.push(A({ cells: cellsOf(t, (x) => (x === i ? 'active' : out[x] ? 'done' : undefined)), marks: [{ i, label: 'i' }], aux: [st(i), list('answer (days to wait)', out)], caption: `Push day ${i} (${t[i]}): it waits for something warmer.` }))
  }
  f.push(A({ cells: cellsOf(t, (x) => (out[x] ? 'done' : 'dim')), aux: [st(), list('answer (days to wait)', out, () => 'done')], caption: `Days left on the stack never get a warmer day: 0. Each index is pushed and popped once, so O(n).` }))
  return { title: `temperatures = [${t.join(', ')}]`, frames: f }
}

/** Min stack: a second stack of running minima. */
export function auxiliaryStack(): Viz {
  const ops: (['push', number] | ['pop'] | ['getMin'])[] = [['push', 5], ['push', 3], ['push', 7], ['getMin'], ['pop'], ['pop'], ['getMin'], ['push', 1], ['getMin']]
  const stack: number[] = []
  const mins: number[] = []
  const f: Frame[] = []
  const opCells = () => cellsOf(ops.map((o) => (o[0] === 'push' ? `push ${o[1]}` : o[0])))
  const aux = (hot?: 'active' | 'bad' | 'match') => [list('stack', stack, (j) => (hot && j === stack.length - 1 ? hot : undefined)), list('mins (min so far at each depth)', mins, (j) => (hot && j === mins.length - 1 ? hot : undefined))]
  f.push(A({ cells: opCells(), aux: aux(), caption: 'Alongside the real stack, keep a stack of "the minimum at this depth". Push min(x, current min); pop both together. getMin is the top of the second stack.' }))
  ops.forEach((op, i) => {
    const cells = () => cellsOf(ops.map((o) => (o[0] === 'push' ? `push ${o[1]}` : o[0])), (j) => (j === i ? 'active' : j < i ? 'dim' : undefined))
    if (op[0] === 'push') {
      stack.push(op[1])
      mins.push(mins.length ? Math.min(op[1], mins[mins.length - 1]!) : op[1])
      f.push(A({ cells: cells(), marks: [{ i, label: 'op' }], aux: aux('active'), caption: `push ${op[1]}: mins gets min(${op[1]}, ${mins.length > 1 ? mins[mins.length - 2] : '∅'}) = ${mins[mins.length - 1]}.` }))
    } else if (op[0] === 'pop') {
      const v = stack.pop()
      mins.pop()
      f.push(A({ cells: cells(), marks: [{ i, label: 'op' }], aux: aux(), caption: `pop ${v}: both stacks lose their top, so the min for the remaining depth is already there.` }))
    } else {
      f.push(A({ cells: cells(), marks: [{ i, label: 'op' }], aux: aux('match'), vars: { getMin: mins[mins.length - 1]! }, caption: `getMin = ${mins[mins.length - 1]} in O(1): just read the top of mins.` }))
    }
  })
  return { title: ops.map((o) => (o[0] === 'push' ? `push(${o[1]})` : `${o[0]}()`)).join(', '), frames: f }
}

/** Reverse Polish notation with an operand stack. */
export function operandStack(): Viz {
  const tokens = ['2', '1', '+', '3', '*', '4', '-']
  const stack: number[] = []
  const f: Frame[] = []
  const st = (hot?: 'active' | 'match') => list('stack', stack, (j) => (hot && j >= stack.length - 1 ? hot : undefined))
  f.push(A({ cells: cellsOf(tokens), aux: [st()], caption: 'Numbers are pushed. An operator pops two operands (the first popped is the right-hand one), applies, and pushes the result.' }))
  tokens.forEach((tok, i) => {
    const cells = () => cellsOf(tokens, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined))
    if (/^-?\d+$/.test(tok)) {
      stack.push(Number(tok))
      f.push(A({ cells: cells(), marks: [{ i, label: 'i' }], aux: [st('active')], caption: `${tok} is a number: push.` }))
    } else {
      const b = stack.pop()!
      const a = stack.pop()!
      const r = tok === '+' ? a + b : tok === '-' ? a - b : tok === '*' ? a * b : Math.trunc(a / b)
      stack.push(r)
      f.push(A({ cells: cells(), marks: [{ i, label: 'i' }], aux: [st('match')], caption: `'${tok}': pop ${b} then ${a}, compute ${a} ${tok} ${b} = ${r}, push ${r}.` }))
    }
  })
  f.push(A({ cells: cellsOf(tokens, () => 'done'), aux: [st('match')], vars: { result: stack[0]! }, caption: `One value left: ${stack[0]}. O(n) time and space.` }))
  return { title: `tokens = [${tokens.join(', ')}]`, frames: f }
}

/** Largest rectangle in a histogram with a monotonic stack and a sentinel. */
export function histogramStack(): Viz {
  const heights = [2, 1, 5, 6, 2, 3]
  const h = [...heights, 0]
  const stack: number[] = []
  let best = 0
  let bestRange: [number, number] = [0, 0]
  const f: Frame[] = []
  const st = (hot?: number) => list('stack: index (height), bottom first', stack.map((i) => `${i} (${h[i]})`), (j) => (stack[j] === hot ? 'bad' : undefined), 'heights increase bottom to top')
  f.push(A({ cells: cellsOf(h, (j) => (j === h.length - 1 ? 'mark' : undefined)), aux: [st()], caption: 'Keep bars on a stack with increasing heights. When a shorter bar arrives, every taller bar on the stack has found its right edge; its left edge is the bar below it on the stack. A sentinel 0 at the end flushes the stack.' }))
  for (let i = 0; i < h.length; i++) {
    while (stack.length && h[stack[stack.length - 1]!]! > h[i]!) {
      const top = stack.pop()!
      const left = stack.length ? stack[stack.length - 1]! + 1 : 0
      const width = i - left
      const area = h[top]! * width
      const better = area > best
      if (better) {
        best = area
        bestRange = [left, i - 1]
      }
      f.push(A({ cells: cellsOf(h, (j) => (j === top ? 'match' : j >= left && j < i ? 'window' : j === i ? 'active' : j === h.length - 1 ? 'mark' : undefined)), marks: [{ i, label: 'i' }, { i: top, label: 'top', tone: 'match' }], range: [left, i - 1], aux: [st(top)], vars: { height: h[top]!, width, area, best }, caption: `Bar ${i} (${h[i]}) is shorter than bar ${top} (${h[top]}). Bar ${top} spans from ${left} to ${i - 1}: area ${h[top]} × ${width} = ${area}.${better ? ' New best.' : ''}` }))
    }
    stack.push(i)
    if (i < h.length - 1) f.push(A({ cells: cellsOf(h, (j) => (j === i ? 'active' : j === h.length - 1 ? 'mark' : undefined)), marks: [{ i, label: 'i' }], aux: [st()], caption: `Push bar ${i} (${h[i]}): the stack stays increasing.` }))
  }
  f.push(A({ cells: cellsOf(h, (j) => (j >= bestRange[0] && j <= bestRange[1] ? 'done' : 'dim')), range: bestRange, vars: { best }, caption: `Largest rectangle ${best}, over bars ${bestRange[0]}..${bestRange[1]}. Each bar is pushed and popped once: O(n).` }))
  return { title: `heights = [${heights.join(', ')}] (+ sentinel 0)`, frames: f }
}
