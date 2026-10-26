import { BUILTIN_PROBLEMS as BASE, withPorts } from './index.ts'
import { RUBY_PORTS } from './ports-ruby.ts'
import { JAVA_PORTS } from './ports-java.ts'
import { RUBY_PRACTICAL } from './ports-practical-ruby.ts'
import { JAVA_PRACTICAL } from './ports-practical-java.ts'
import { RUST_PORTS } from './ports-rust.ts'
import { RUST_PRACTICAL } from './ports-practical-rust.ts'
import type { Problem } from '../types.ts'

/** Every built-in problem with its Ruby, Java and Rust ports attached: for the server and the content tests, which load everything at once. */
export const BUILTIN_PROBLEMS: Problem[] = withPorts(BASE, {
  ruby: { ...RUBY_PORTS, ...RUBY_PRACTICAL },
  java: { ...JAVA_PORTS, ...JAVA_PRACTICAL },
  rust: { ...RUST_PORTS, ...RUST_PRACTICAL },
})
