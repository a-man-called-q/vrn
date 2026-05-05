#!/usr/bin/env node
const command = process.argv[2]

if (command === "gen") {
  await import("./commands/gen.js").then(m => m.run())
} else if (command === "link") {
  await import("./commands/link.js").then(m => m.run())
} else {
  await import("./commands/create.js").then(m => m.run())
}
