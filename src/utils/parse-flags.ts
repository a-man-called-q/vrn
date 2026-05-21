// Minimal `--key value` pair extractor — enough for the non-interactive
// command paths (`vrn gen service --name x --port 4002`). Flags without a
// trailing value or where the value itself starts with `--` are ignored.
export function parseFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < argv.length - 1; i++) {
    const k = argv[i]!
    const v = argv[i + 1]!
    if (k.startsWith("--") && !v.startsWith("--")) {
      flags[k.slice(2)] = v
      i++
    }
  }
  return flags
}
