import fs from 'node:fs'
import path from 'node:path'
import type { Language } from '../src/types.ts'

/**
 * Where the Ruby, Java and Rust toolchains live on this machine. Node is the
 * one running the server; the others are looked up at request time (so an
 * install needs no restart), from an environment override first, then the
 * usual rustup, Homebrew and system locations, then PATH.
 */

const isFile = (p: string): boolean => {
  try { return fs.statSync(p).isFile() } catch { return false }
}

const onPath = (name: string): string | null => {
  for (const dir of (process.env.PATH ?? '').split(':')) {
    if (!dir) continue
    const p = path.join(dir, name)
    // asdf shims exist even when no version is set; prefer real installs below them.
    if (isFile(p) && !p.includes('/.asdf/shims/')) return p
  }
  return null
}

/** Children of `dir` matching `test`, newest name first. */
const children = (dir: string, test: (name: string) => boolean): string[] => {
  try { return fs.readdirSync(dir).filter(test).sort().reverse().map((n) => path.join(dir, n)) } catch { return [] }
}

const home = process.env.HOME ?? ''

export function rubyBin(): string | null {
  const candidates = [
    process.env.WHETSTONE_RUBY,
    '/opt/homebrew/opt/ruby/bin/ruby',
    ...children('/opt/homebrew/opt', (n) => /^ruby@\d/.test(n)).map((d) => path.join(d, 'bin/ruby')),
    ...children(path.join(home, '.asdf/installs/ruby'), () => true).map((d) => path.join(d, 'bin/ruby')),
    ...children(path.join(home, '.rubies'), () => true).map((d) => path.join(d, 'bin/ruby')),
    '/usr/local/opt/ruby/bin/ruby',
    onPath('ruby'),
    '/usr/bin/ruby',
  ]
  return candidates.find((c): c is string => Boolean(c) && isFile(c!)) ?? null
}

export function javaBins(): { java: string; javac: string } | null {
  const homes = [
    process.env.WHETSTONE_JAVA_HOME,
    process.env.JAVA_HOME,
    '/opt/homebrew/opt/openjdk',
    ...children('/opt/homebrew/opt', (n) => /^openjdk@\d/.test(n)),
    ...children('/Library/Java/JavaVirtualMachines', () => true).map((d) => path.join(d, 'Contents/Home')),
    ...children(path.join(home, '.asdf/installs/java'), () => true),
    ...children(path.join(home, '.sdkman/candidates/java'), (n) => n !== 'current'),
  ]
  for (const h of homes) {
    if (!h) continue
    const java = path.join(h, 'bin/java')
    const javac = path.join(h, 'bin/javac')
    if (isFile(java) && isFile(javac)) return { java, javac }
  }
  const java = onPath('java')
  const javac = onPath('javac')
  // macOS ships /usr/bin/java as a stub that only works once a JDK is installed, which the loop above would have found.
  if (java && javac && !java.startsWith('/usr/bin/')) return { java, javac }
  return null
}

/** The Rust compiler: a rustup install first (its proxy picks the default toolchain), then Homebrew's rust formula, then PATH. */
export function rustBin(): string | null {
  const candidates = [
    process.env.WHETSTONE_RUSTC,
    path.join(home, '.cargo/bin/rustc'),
    '/opt/homebrew/opt/rust/bin/rustc',
    '/opt/homebrew/bin/rustc',
    '/usr/local/bin/rustc',
    onPath('rustc'),
  ]
  return candidates.find((c): c is string => Boolean(c) && isFile(c!)) ?? null
}

export interface Availability {
  typescript: true
  ruby: boolean
  java: boolean
  rust: boolean
}

/** Which languages can run on this machine right now. */
export function availability(): Availability {
  return { typescript: true, ruby: rubyBin() !== null, java: javaBins() !== null, rust: rustBin() !== null }
}

export function missingMessage(language: Language): string {
  if (language === 'ruby') return 'Ruby is not installed on the machine running Whetstone (looked in Homebrew, asdf, chruby, PATH and /usr/bin). Install it with "brew install ruby", or point WHETSTONE_RUBY at a ruby binary.'
  if (language === 'java') return 'A JDK is not installed on the machine running Whetstone (looked in Homebrew, /Library/Java, asdf, sdkman and PATH). Install one with "brew install openjdk", or point WHETSTONE_JAVA_HOME at a JDK.'
  if (language === 'rust') return 'Rust is not installed on the machine running Whetstone (looked in ~/.cargo/bin, Homebrew and PATH). Install it with "brew install rust" or from rustup.rs, or point WHETSTONE_RUSTC at a rustc binary.'
  return 'TypeScript runs on the server itself.'
}
