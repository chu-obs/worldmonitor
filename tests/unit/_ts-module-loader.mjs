import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export async function loadTsModule(tsFilePath) {
  const resolvedPath = tsFilePath instanceof URL ? fileURLToPath(tsFilePath) : tsFilePath;
  const source = await readFile(resolvedPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      isolatedModules: true,
    },
    fileName: path.basename(resolvedPath),
  });

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'worldmonitor-ts-test-'));
  const outPath = path.join(tempDir, `${path.basename(resolvedPath, '.ts')}.mjs`);
  await writeFile(outPath, transpiled.outputText, 'utf8');
  return import(`${pathToFileURL(outPath).href}?t=${Date.now()}-${Math.random()}`);
}
