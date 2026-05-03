type RedirectResponse = Response & { options?: { href?: string } }

export async function callWithRedirect(fn: () => Promise<unknown>): Promise<void> {
  await fn().catch((err: unknown) => {
    if (err instanceof Response && err.status === 307) {
      const href = (err as RedirectResponse).options?.href
      if (href) window.location.href = href
    }
  })
}
