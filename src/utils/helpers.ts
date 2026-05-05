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

/**
 * Title-cases a string (e.g. "my-app" → "My App").
 */
function titleCase(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

/**
 * Upper-cases all characters in a string.
 */
function upperCase(str: string): string {
  return str.toUpperCase()
}

export function registerHelpers(): void {
  Handlebars.registerHelper("camelCase", (str: string) => camelCase(str))
  Handlebars.registerHelper("capitalCase", (str: string) => capitalCase(str))
  Handlebars.registerHelper("constantCase", (str: string) => constantCase(str))
  Handlebars.registerHelper("dotCase", (str: string) => dotCase(str))
  Handlebars.registerHelper("kebabCase", (str: string) => kebabCase(str))
  Handlebars.registerHelper("noCase", (str: string) => noCase(str))
  Handlebars.registerHelper("pascalCase", (str: string) => pascalCase(str))
  Handlebars.registerHelper("pascalSnakeCase", (str: string) => pascalSnakeCase(str))
  Handlebars.registerHelper("pathCase", (str: string) => pathCase(str))
  Handlebars.registerHelper("sentenceCase", (str: string) => sentenceCase(str))
  Handlebars.registerHelper("snakeCase", (str: string) => snakeCase(str))
  Handlebars.registerHelper("trainCase", (str: string) => trainCase(str))

  Handlebars.registerHelper("dashCase", (str: string) => kebabCase(str))
  Handlebars.registerHelper("upperCase", (str: string) => upperCase(str))
  Handlebars.registerHelper("titleCase", (str: string) => titleCase(str))

  // `cb` returns a closing curly brace — used to escape }} in templates
  Handlebars.registerHelper("cb", () => "}")

  // `includes` checks if a string contains a substring
  Handlebars.registerHelper(
    "includes",
    (haystack: string, needle: string) => haystack.includes(needle)
  )

  // `eq` strict equality check
  Handlebars.registerHelper(
    "eq",
    (a: unknown, b: unknown) => a === b
  )
}
