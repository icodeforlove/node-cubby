import * as fs from 'node:fs';
import * as path from 'node:path';

export function findProjectRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    const pkg = path.join(current, 'package.json');
    if (fs.existsSync(pkg)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

