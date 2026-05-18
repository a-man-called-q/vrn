import { Elysia } from "elysia"
import { vrnApp } from "./_vrn/app"

const app = new Elysia().use(vrnApp)

export type App = typeof app

app.listen(process.env.PORT ?? {{apiPort}})
console.log(`🦊 {{titleCase name}} API is running at ${app.server?.hostname}:${app.server?.port}`)
