/**
 * The Ruby harness. The solution file is loaded so its top-level `def`s
 * become methods on main (a `Solution` class with instance methods works
 * too). A test's function name is tried as written and in snake_case, so
 * content written for TypeScript (`twoSum`) finds `two_sum`. JSON arguments
 * become Ruby values; a hash shaped like a list node or a tree node becomes
 * a ListNode / TreeNode when the solution defines that class. Results go
 * back the same way. One JSON line with the raw outcome per test is printed;
 * comparison happens in runner.ts.
 */
export const RUBY_HARNESS = (mark: string, perTestMs: number): string => String.raw`
require 'json'
require 'timeout'
require 'stringio'

MARK = '${mark}'
PER_TEST_S = ${perTestMs} / 1000.0
TESTS = JSON.parse(File.read('tests.json'))
REAL_STDOUT = $stdout
BUFFER = StringIO.new
$stdout = BUFFER
$stderr = BUFFER
RESULT = { 'results' => [], 'output' => '' }

def finish!
  out = BUFFER.string
  RESULT['output'] = out.length > 20_000 ? out[0, 20_000] : out
  REAL_STDOUT.write("\n" + MARK + JSON.generate(RESULT) + "\n")
  REAL_STDOUT.flush
  exit!(0)
end

def snake(name)
  name.gsub(/([A-Z]+)([A-Z][a-z])/, '\1_\2').gsub(/([a-z\d])([A-Z])/, '\1_\2').downcase
end

def resolve_target(name)
  names = [name, snake(name)].uniq
  main = TOPLEVEL_BINDING.receiver
  names.each { |n| return [main, n] if main.respond_to?(n, true) }
  if Object.const_defined?(:Solution)
    sol = Solution.new
    names.each { |n| return [sol, n] if sol.respond_to?(n) }
  end
  raise NoMethodError, "no method named #{names.join(' or ')} is defined"
end

def from_json(v)
  case v
  when Array then v.map { |x| from_json(x) }
  when Hash
    keys = v.keys.sort
    if keys == %w[next val] && Object.const_defined?(:ListNode)
      node = ListNode.new
      node.val = from_json(v['val'])
      node.next = from_json(v['next'])
      node
    elsif keys == %w[left right val] && Object.const_defined?(:TreeNode)
      node = TreeNode.new
      node.val = from_json(v['val'])
      node.left = from_json(v['left'])
      node.right = from_json(v['right'])
      node
    else
      v.transform_values { |x| from_json(x) }
    end
  else v
  end
end

def plain(v, seen = {})
  case v
  when nil, true, false, String, Integer then v
  when Float
    raise 'result is not a finite number' unless v.finite?
    v
  when Symbol then v.to_s
  when Array then v.map { |x| plain(x, seen) }
  when Hash then v.each_with_object({}) { |(k, x), h| h[k.to_s] = plain(x, seen) }
  else
    if v.respond_to?(:to_a) && (defined?(Set) && v.is_a?(Set))
      return v.to_a.map { |x| plain(x, seen) }
    end
    raise 'result is a cyclic structure' if seen[v.object_id]
    seen[v.object_id] = true # only the objects on the current path: a shared reference is fine
    out = if v.respond_to?(:val) && v.respond_to?(:next)
            { 'val' => plain(v.val, seen), 'next' => plain(v.next, seen) }
          elsif v.respond_to?(:val) && v.respond_to?(:left) && v.respond_to?(:right)
            { 'val' => plain(v.val, seen), 'left' => plain(v.left, seen), 'right' => plain(v.right, seen) }
          elsif v.instance_variables.any?
            v.instance_variables.each_with_object({}) { |iv, h| h[iv.to_s.delete('@')] = plain(v.instance_variable_get(iv), seen) }
          else
            v.to_s
          end
    seen.delete(v.object_id)
    out
  end
end

begin
  load File.expand_path('solution.rb', __dir__)
rescue Exception => e
  RESULT['error'] = "Your code could not be loaded: #{e.class}: #{e.message}"
  finish!
end

TESTS.each do |t|
  entry = { 'name' => t['name'], 'ms' => 0 }
  t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  begin
    receiver, meth = resolve_target(t['fn'])
    args = from_json(t['args'])
    value = Timeout.timeout(PER_TEST_S) { receiver.send(meth, *args) }
    actual = plain(value)
    JSON.generate([actual])
    entry['actual'] = actual
  rescue Timeout::Error
    entry['error'] = "test timed out after #{(PER_TEST_S * 1000).to_i} ms"
  rescue Exception => e
    msg = e.message.lines.first.to_s.strip
    entry['error'] = e.is_a?(RuntimeError) ? msg : "#{e.class}: #{msg}"
  end
  entry['ms'] = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0) * 1000).round
  RESULT['results'] << entry
end
finish!
`
