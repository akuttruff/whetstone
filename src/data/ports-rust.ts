import type { Port } from '../types.ts'
import { RUST_ARRAYS } from './ports-rust-arrays.ts'
import { RUST_STRUCTURES } from './ports-rust-structures.ts'
import { RUST_GRAPHS } from './ports-rust-graphs.ts'
import { RUST_DP_MISC } from './ports-rust-dp-misc.ts'

/**
 * The coding problems in Rust: a starter and a reference solution per
 * problem id, mirroring the TypeScript versions, in four files by area.
 * Function names are the snake_case form of the TypeScript names, which is
 * what the test runner resolves. `server/content.test.ts` compiles and runs
 * every solution here against the problem's tests.
 */
export const RUST_PORTS: Record<string, Port> = { ...RUST_ARRAYS, ...RUST_STRUCTURES, ...RUST_GRAPHS, ...RUST_DP_MISC }
