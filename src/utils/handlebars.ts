import Handlebars from "handlebars"
import {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  kebabCase,
  noCase,
  pascalCase,
  pascalSnakeCase,
  pathCase,
  sentenceCase,
  snakeCase,
  trainCase,
} from "change-case"

function titleCase(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function upperCase(str: string): string {
  return str.toUpperCase()
}

export function registerHelpers(): void {
  const caseHelpers: Record<string, (str: string) => string> = {
    camelCase, capitalCase, constantCase, dotCase, noCase,
    pascalCase, pascalSnakeCase, pathCase, sentenceCase,
    snakeCase, trainCase,
    dashCase: kebabCase,
    upperCase, titleCase,
  }
  for (const [name, fn] of Object.entries(caseHelpers)) {
    Handlebars.registerHelper(name, fn)
  }

  // `cb` returns a closing curly brace — used to escape }} in templates
  Handlebars.registerHelper("cb", () => "}")
  Handlebars.registerHelper("includes", (haystack: string, needle: string) => haystack.includes(needle))
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b)
}
