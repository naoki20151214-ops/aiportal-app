import { existsSync, readdirSync, renameSync, rmdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Next.js 16's Windows export leaves separators in RSC segment filenames.
// Match the dot-separated filenames requested by the client prefetcher.
// https://github.com/vercel/next.js/issues/92339
export function normalizeStaticExport(outputDirectory) {
  const root = path.resolve(outputDirectory);
  const moves = [];
  function collect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const source = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(source);
      else if (entry.isFile() && entry.name.endsWith(".txt")) {
        const parts = path.relative(root, source).split(path.sep);
        const segmentIndex = parts.findIndex((part) => part.startsWith("__next."));
        if (segmentIndex < 0 || segmentIndex === parts.length - 1) continue;
        const target = path.join(root, ...parts.slice(0, segmentIndex), parts.slice(segmentIndex).join("."));
        moves.push({ source, target });
      }
    }
  }
  collect(root);
  // Fail before moving anything if a future export would overwrite a payload.
  const targets = new Set();
  for (const { target } of moves) {
    if (existsSync(target) || targets.has(target)) throw new Error(`RSC export filename collision: ${target}`);
    targets.add(target);
  }
  for (const { source, target } of moves) {
    renameSync(source, target);
    let directory = path.dirname(source);
    const routeDirectory = path.dirname(target);
    while (directory !== routeDirectory) {
      if (readdirSync(directory).length) break;
      rmdirSync(directory); // Only empty generated segment directories.
      directory = path.dirname(directory);
    }
  }
  return moves.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const count = normalizeStaticExport("out");
  console.log(`Static export: normalized ${count} RSC segment filenames.`);
}
