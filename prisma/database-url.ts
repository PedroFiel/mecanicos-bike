import path from "node:path";

export function resolveDatabaseUrl(url: string | undefined) {
  if (!url?.startsWith("file:")) return url;

  const filename = url.slice(5);
  if (filename === ":memory:" || path.isAbsolute(filename)) return url;

  // Match the Prisma schema directory in the CLI, dev server and SSR build.
  return `file:${path.resolve("prisma", filename).split(path.sep).join("/")}`;
}
