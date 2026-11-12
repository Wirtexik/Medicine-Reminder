/**
 * Uruchamia Vitest z katalogu z wielką literą dysku.
 *
 * Na Windows terminal VS Code startuje w „c:\…”, a Node rozwiązuje moduły z „C:\…”.
 * Vitest ładuje się wtedy dwa razy i każdy test kończy się błędem
 * „Cannot read properties of undefined (reading 'config')”.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

process.chdir(process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase()));

const require = createRequire(pathToFileURL(`${process.cwd()}/package.json`));
const cli = require.resolve("vitest/package.json").replace(/package\.json$/, "vitest.mjs");
await import(pathToFileURL(cli).href);
