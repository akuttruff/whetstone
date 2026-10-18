/**
 * The Java harness. The solution is a file holding `class Solution` (plus
 * any helper classes such as ListNode or TreeNode); both files are compiled
 * together and the harness finds the tested method by reflection, as written
 * or in camelCase. JSON arguments are coerced to the method's parameter
 * types (int[], List<Integer>, char[][], String, ListNode, …) and the result
 * is turned back into JSON by walking arrays, collections, maps and the
 * fields of any other object. One JSON line with the raw outcome per test is
 * printed; comparison happens in runner.ts.
 */
export const JAVA_HARNESS = (mark: string, perTestMs: number): string => String.raw`
import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

public class Harness {
  static final String MARK = "${mark}";
  static final long PER_TEST_MS = ${perTestMs};

  public static void main(String[] argv) throws Exception {
    PrintStream real = System.out;
    ByteArrayOutputStream buf = new ByteArrayOutputStream();
    PrintStream capture = new PrintStream(buf, true, "UTF-8");
    System.setOut(capture);
    System.setErr(capture);
    List<Object> tests = asList(Json.parse(Files.readString(Path.of("tests.json"), StandardCharsets.UTF_8)));
    Map<String, Object> result = new LinkedHashMap<>();
    List<Object> results = new ArrayList<>();
    Class<?> cls = null;
    Object instance = null;
    try {
      cls = Class.forName("Solution");
      instance = construct(cls);
    } catch (Throwable e) {
      result.put("error", "Your code could not be loaded: " + describe(unwrap(e)));
    }
    ExecutorService pool = Executors.newCachedThreadPool(r -> { Thread t = new Thread(r); t.setDaemon(true); return t; });
    if (cls != null) {
      for (Object to : tests) {
        Map<String, Object> t = asMap(to);
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("name", t.get("name"));
        long t0 = System.nanoTime();
        try {
          String fn = (String) t.get("fn");
          List<Object> args = asList(t.get("args"));
          final Method m = find(cls, fn, args.size());
          final Object[] coerced = coerceArgs(m, args);
          final Object target = instance;
          Future<Object> f = pool.submit(() -> m.invoke(target, coerced));
          Object v = f.get(PER_TEST_MS, TimeUnit.MILLISECONDS);
          entry.put("actual", plain(v, Collections.newSetFromMap(new IdentityHashMap<>())));
        } catch (TimeoutException e) {
          entry.put("error", "test timed out after " + PER_TEST_MS + " ms");
        } catch (Throwable e) {
          entry.put("error", describe(unwrap(e)));
        }
        entry.put("ms", (System.nanoTime() - t0) / 1_000_000L);
        results.add(entry);
      }
    }
    String printed = buf.toString("UTF-8");
    result.put("output", printed.length() > 20000 ? printed.substring(0, 20000) : printed);
    result.put("results", results);
    real.print("\n" + MARK + Json.write(result) + "\n");
    real.flush();
    System.exit(0);
  }

  @SuppressWarnings("unchecked")
  static List<Object> asList(Object o) { return o == null ? new ArrayList<>() : (List<Object>) o; }
  @SuppressWarnings("unchecked")
  static Map<String, Object> asMap(Object o) { return (Map<String, Object>) o; }

  static Throwable unwrap(Throwable e) {
    while ((e instanceof InvocationTargetException || e instanceof ExecutionException) && e.getCause() != null) e = e.getCause();
    return e;
  }

  static String describe(Throwable e) {
    if (e instanceof StackOverflowError) return "StackOverflowError: recursion too deep";
    String msg = e.getMessage();
    String name = e.getClass().getSimpleName();
    if (e instanceof RuntimeException && msg != null && !(e instanceof NullPointerException) && !(e instanceof ArrayIndexOutOfBoundsException) && !(e instanceof ClassCastException)) return name + ": " + msg;
    return msg == null || msg.isEmpty() ? name : name + ": " + msg;
  }

  static Object construct(Class<?> cls) throws ReflectiveOperationException {
    for (Constructor<?> c : cls.getDeclaredConstructors()) {
      if (c.getParameterCount() == 0) { c.setAccessible(true); return c.newInstance(); }
    }
    return null; // static methods only
  }

  static String camel(String s) {
    StringBuilder b = new StringBuilder();
    boolean up = false;
    for (char c : s.toCharArray()) {
      if (c == '_') { up = true; continue; }
      b.append(up ? Character.toUpperCase(c) : c);
      up = false;
    }
    return b.toString();
  }

  static Method find(Class<?> cls, String fn, int arity) {
    String[] names = { fn, camel(fn) };
    Method fallback = null;
    for (String n : names) {
      for (Method m : cls.getDeclaredMethods()) {
        if (!m.getName().equals(n) || m.isSynthetic()) continue;
        if (m.getParameterCount() == arity) { m.setAccessible(true); return m; }
        if (fallback == null) fallback = m;
      }
    }
    if (fallback != null) throw new IllegalArgumentException("method " + fallback.getName() + " takes " + fallback.getParameterCount() + " parameters but the test passes " + arity);
    throw new IllegalArgumentException("class Solution has no method named " + fn + (camel(fn).equals(fn) ? "" : " (or " + camel(fn) + ")"));
  }

  static Object[] coerceArgs(Method m, List<Object> args) {
    Type[] types = m.getGenericParameterTypes();
    Object[] out = new Object[types.length];
    for (int i = 0; i < types.length; i++) {
      try {
        out[i] = coerce(args.get(i), types[i]);
      } catch (RuntimeException e) {
        throw new IllegalArgumentException("argument " + (i + 1) + " (" + Json.write(args.get(i)) + ") does not fit parameter type " + types[i].getTypeName() + ": " + e.getMessage());
      }
    }
    return out;
  }

  static Class<?> raw(Type t) {
    if (t instanceof Class) return (Class<?>) t;
    if (t instanceof ParameterizedType) return (Class<?>) ((ParameterizedType) t).getRawType();
    if (t instanceof GenericArrayType) return Array.newInstance(raw(((GenericArrayType) t).getGenericComponentType()), 0).getClass();
    if (t instanceof WildcardType) return raw(((WildcardType) t).getUpperBounds()[0]);
    if (t instanceof TypeVariable) return Object.class;
    return Object.class;
  }

  static Type typeArg(Type t, int i) {
    if (t instanceof ParameterizedType) {
      Type[] a = ((ParameterizedType) t).getActualTypeArguments();
      if (i < a.length) return a[i];
    }
    return Object.class;
  }

  static Object coerce(Object v, Type type) {
    Class<?> c = raw(type);
    if (v == null) {
      if (c.isPrimitive()) throw new IllegalArgumentException("null for a primitive");
      return null;
    }
    if (c == int.class || c == Integer.class) return ((Number) v).intValue();
    if (c == long.class || c == Long.class) return ((Number) v).longValue();
    if (c == double.class || c == Double.class) return ((Number) v).doubleValue();
    if (c == float.class || c == Float.class) return ((Number) v).floatValue();
    if (c == short.class || c == Short.class) return ((Number) v).shortValue();
    if (c == byte.class || c == Byte.class) return ((Number) v).byteValue();
    if (c == boolean.class || c == Boolean.class) return (Boolean) v;
    if (c == char.class || c == Character.class) {
      String s = v.toString();
      if (s.length() != 1) throw new IllegalArgumentException("expected a single character");
      return s.charAt(0);
    }
    if (c == String.class) return v instanceof String ? v : Json.write(v);
    if (c == Object.class) return plainJava(v);
    if (c.isArray()) {
      Class<?> ct = c.getComponentType();
      if (v instanceof String && ct == char.class) return ((String) v).toCharArray();
      List<Object> list = asList(v);
      Object arr = Array.newInstance(ct, list.size());
      Type elem = type instanceof GenericArrayType ? ((GenericArrayType) type).getGenericComponentType() : ct;
      for (int i = 0; i < list.size(); i++) Array.set(arr, i, coerce(list.get(i), elem));
      return arr;
    }
    if (Collection.class.isAssignableFrom(c)) {
      Type elem = typeArg(type, 0);
      Collection<Object> out;
      if (c.isAssignableFrom(ArrayList.class)) out = new ArrayList<>();
      else if (c.isAssignableFrom(LinkedHashSet.class)) out = new LinkedHashSet<>();
      else if (c.isAssignableFrom(ArrayDeque.class)) out = new ArrayDeque<>();
      else if (c.isAssignableFrom(LinkedList.class)) out = new LinkedList<>();
      else throw new IllegalArgumentException("unsupported collection " + c.getSimpleName());
      for (Object x : asList(v)) out.add(coerce(x, elem));
      return out;
    }
    if (Map.class.isAssignableFrom(c)) {
      Type kt = typeArg(type, 0);
      Type vt = typeArg(type, 1);
      Map<Object, Object> out = c.isAssignableFrom(LinkedHashMap.class) ? new LinkedHashMap<>() : new TreeMap<>();
      for (Map.Entry<String, Object> e : asMap(v).entrySet()) {
        Object key = e.getKey();
        Class<?> kc = raw(kt);
        if (kc == Integer.class) key = Integer.parseInt(e.getKey());
        else if (kc == Long.class) key = Long.parseLong(e.getKey());
        else if (kc == Double.class) key = Double.parseDouble(e.getKey());
        else if (kc == Character.class) key = e.getKey().charAt(0);
        out.put(key, coerce(e.getValue(), vt));
      }
      return out;
    }
    // A class from the solution file (ListNode, TreeNode, …): built from a JSON object field by field.
    if (v instanceof Map) {
      try {
        Object obj = construct(c);
        if (obj == null) throw new IllegalArgumentException(c.getSimpleName() + " needs a no-argument constructor");
        for (Map.Entry<String, Object> e : asMap(v).entrySet()) {
          Field f = field(c, e.getKey());
          if (f == null) continue;
          f.setAccessible(true);
          f.set(obj, coerce(e.getValue(), f.getGenericType()));
        }
        return obj;
      } catch (ReflectiveOperationException e) {
        throw new IllegalArgumentException("could not build a " + c.getSimpleName() + ": " + e);
      }
    }
    throw new IllegalArgumentException("cannot convert " + v.getClass().getSimpleName());
  }

  static Field field(Class<?> c, String name) {
    for (Class<?> k = c; k != null && k != Object.class; k = k.getSuperclass()) {
      try { return k.getDeclaredField(name); } catch (NoSuchFieldException ignored) { }
    }
    return null;
  }

  /** JSON as Java for an Object parameter: whole numbers become Integer when they fit. */
  static Object plainJava(Object v) {
    if (v instanceof Long) { long l = (Long) v; return l >= Integer.MIN_VALUE && l <= Integer.MAX_VALUE ? (Object) (int) l : (Object) l; }
    if (v instanceof List) { List<Object> out = new ArrayList<>(); for (Object x : asList(v)) out.add(plainJava(x)); return out; }
    if (v instanceof Map) { Map<String, Object> out = new LinkedHashMap<>(); for (Map.Entry<String, Object> e : asMap(v).entrySet()) out.put(e.getKey(), plainJava(e.getValue())); return out; }
    return v;
  }

  static Object plain(Object v, Set<Object> seen) {
    if (v == null || v instanceof Boolean || v instanceof String) return v;
    if (v instanceof Character) return v.toString();
    if (v instanceof Double || v instanceof Float) {
      double d = ((Number) v).doubleValue();
      if (Double.isNaN(d) || Double.isInfinite(d)) throw new IllegalArgumentException("result is not a finite number");
      return d;
    }
    if (v instanceof Number) return v;
    if (v.getClass().isArray()) {
      int n = Array.getLength(v);
      List<Object> out = new ArrayList<>(n);
      for (int i = 0; i < n; i++) out.add(plain(Array.get(v, i), seen));
      return out;
    }
    if (v instanceof Collection) {
      List<Object> out = new ArrayList<>();
      for (Object x : (Collection<?>) v) out.add(plain(x, seen));
      return out;
    }
    if (v instanceof Map) {
      Map<String, Object> out = new LinkedHashMap<>();
      for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) out.put(String.valueOf(e.getKey()), plain(e.getValue(), seen));
      return out;
    }
    if (v instanceof Optional) return ((Optional<?>) v).map(x -> plain(x, seen)).orElse(null);
    if (v instanceof CharSequence || v instanceof Enum) return v.toString();
    if (!seen.add(v)) throw new IllegalArgumentException("result is a cyclic structure");
    Map<String, Object> out = new LinkedHashMap<>();
    for (Class<?> k = v.getClass(); k != null && k != Object.class; k = k.getSuperclass()) {
      for (Field f : k.getDeclaredFields()) {
        if (Modifier.isStatic(f.getModifiers()) || f.isSynthetic()) continue;
        f.setAccessible(true);
        try { out.put(f.getName(), plain(f.get(v), seen)); } catch (IllegalAccessException e) { throw new IllegalArgumentException(e); }
      }
    }
    seen.remove(v);
    return out;
  }
}

/** Just enough JSON: objects to LinkedHashMap, arrays to ArrayList, whole numbers to Long, others to Double. */
class Json {
  private final String s;
  private int i = 0;
  private Json(String s) { this.s = s; }

  static Object parse(String s) {
    Json p = new Json(s);
    Object v = p.value();
    p.ws();
    if (p.i != s.length()) throw new IllegalArgumentException("trailing JSON");
    return v;
  }

  private void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }

  private Object value() {
    ws();
    char c = s.charAt(i);
    if (c == '{') {
      i++;
      Map<String, Object> m = new LinkedHashMap<>();
      ws();
      if (s.charAt(i) == '}') { i++; return m; }
      for (;;) {
        ws();
        String k = string();
        ws();
        i++; // :
        m.put(k, value());
        ws();
        if (s.charAt(i) == ',') { i++; continue; }
        i++; // }
        return m;
      }
    }
    if (c == '[') {
      i++;
      List<Object> l = new ArrayList<>();
      ws();
      if (s.charAt(i) == ']') { i++; return l; }
      for (;;) {
        l.add(value());
        ws();
        if (s.charAt(i) == ',') { i++; continue; }
        i++; // ]
        return l;
      }
    }
    if (c == '"') return string();
    if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
    if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
    if (s.startsWith("null", i)) { i += 4; return null; }
    int start = i;
    while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
    String num = s.substring(start, i);
    if (num.contains(".") || num.contains("e") || num.contains("E")) return Double.parseDouble(num);
    try { return Long.parseLong(num); } catch (NumberFormatException e) { return Double.parseDouble(num); }
  }

  private String string() {
    i++; // opening quote
    StringBuilder b = new StringBuilder();
    for (;;) {
      char c = s.charAt(i++);
      if (c == '"') return b.toString();
      if (c == '\\') {
        char e = s.charAt(i++);
        switch (e) {
          case 'n': b.append('\n'); break;
          case 't': b.append('\t'); break;
          case 'r': b.append('\r'); break;
          case 'b': b.append('\b'); break;
          case 'f': b.append('\f'); break;
          case 'u': b.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
          default: b.append(e);
        }
      } else b.append(c);
    }
  }

  static String write(Object v) {
    StringBuilder b = new StringBuilder();
    write(v, b);
    return b.toString();
  }

  private static void write(Object v, StringBuilder b) {
    if (v == null) { b.append("null"); return; }
    if (v instanceof Boolean || v instanceof Integer || v instanceof Long || v instanceof Short || v instanceof Byte) { b.append(v); return; }
    if (v instanceof Number) {
      double d = ((Number) v).doubleValue();
      if (d == Math.rint(d) && Math.abs(d) < 1e15) b.append((long) d); else b.append(d);
      return;
    }
    if (v instanceof Map) {
      b.append('{');
      boolean first = true;
      for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) {
        if (!first) b.append(',');
        first = false;
        writeString(String.valueOf(e.getKey()), b);
        b.append(':');
        write(e.getValue(), b);
      }
      b.append('}');
      return;
    }
    if (v instanceof Collection) {
      b.append('[');
      boolean first = true;
      for (Object x : (Collection<?>) v) {
        if (!first) b.append(',');
        first = false;
        write(x, b);
      }
      b.append(']');
      return;
    }
    writeString(v.toString(), b);
  }

  private static void writeString(String s, StringBuilder b) {
    b.append('"');
    for (char c : s.toCharArray()) {
      switch (c) {
        case '"': b.append("\\\""); break;
        case '\\': b.append("\\\\"); break;
        case '\n': b.append("\\n"); break;
        case '\r': b.append("\\r"); break;
        case '\t': b.append("\\t"); break;
        default:
          if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
      }
    }
    b.append('"');
  }
}
`
