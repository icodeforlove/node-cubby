const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cubby = require('..').default;

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cubby-test-'));
}

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
}

test.describe('cubby runtime', () => {
  test('basic direct mutation and persistence', () => {
    const tmp = mkTmpDir();
    try {
      const users = cubby('users', [], { dir: tmp });
      users.push('a');
      const file = path.join(tmp, 'users.json');
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.deepEqual(content, ['a']);
    } finally {
      rmrf(tmp);
    }
  });

  test('validation using zod-like schema', () => {
    const tmp = mkTmpDir();
    try {
      const schema = {
        safeParse(value) {
          const ok = Array.isArray(value) && value.every(v => typeof v === 'string');
          return ok ? { success: true, data: value } : { success: false, error: new Error('bad') };
        }
      };
      const tags = cubby('tags', [], { schema, dir: tmp });
      tags.push('x');
      const file = path.join(tmp, 'tags.json');
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.deepEqual(content, ['x']);
      assert.throws(() => {
        // @ts-ignore
        tags.push(123);
      });
    } finally {
      rmrf(tmp);
    }
  });

  test('debounced writes', async () => {
    const tmp = mkTmpDir();
    try {
      const arr = cubby('debounce', [], { dir: tmp, writeDebounceMs: 20 });
      arr.push('a');
      arr.push('b');
      await new Promise(r => setTimeout(r, 80));
      const file = path.join(tmp, 'debounce.json');
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.deepEqual(content, ['a', 'b']);
    } finally {
      rmrf(tmp);
    }
  });
});


