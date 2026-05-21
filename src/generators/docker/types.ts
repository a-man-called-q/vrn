// docker-compose value shape — recursive primitive/object/array tree that
// `yaml.stringify` can serialize.

export type ComposeValue =
  | string
  | number
  | boolean
  | null
  | ComposeValue[]
  | { [k: string]: ComposeValue }
