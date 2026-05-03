import Handlebars from "handlebars"
import {
  kebabCase,
  constantCase,
  snakeCase,
  pascalCase,
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
  Handlebars.registerHelper("dashCase", (str: string) => kebabCase(str))
  Handlebars.registerHelper("constantCase", (str: string) => constantCase(str))
  Handlebars.registerHelper("upperCase", (str: string) => upperCase(str))
  Handlebars.registerHelper("snakeCase", (str: string) => snakeCase(str))
  Handlebars.registerHelper("pascalCase", (str: string) => pascalCase(str))
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
