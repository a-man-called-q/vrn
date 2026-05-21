// Registry of available addons. Each addon must export `name`,
// `description`, and `install(projectRoot, templatesDir, config)`.

import * as subscription from "./subscription.js"

export const addons = {
  subscription,
} as const

export type AddonName = keyof typeof addons
