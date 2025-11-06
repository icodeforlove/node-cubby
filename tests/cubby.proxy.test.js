const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cubby = require('..').default;

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cubby-proxy-'));
}

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
}

test.describe('cubby proxy API', () => {
  test('array push persists', async () => {
    const tmp = mkTmpDir();
    try {
      const users = cubby('users', [], { dir: tmp });
      users.push('a');
      await new Promise(r => setTimeout(r, 10));
      const file = path.join(tmp, 'users.json');
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.deepEqual(content, ['a']);
    } finally {
      rmrf(tmp);
    }
  });

  test('object property set persists', async () => {
    const tmp = mkTmpDir();
    try {
      const obj = cubby('obj', { a: 1 }, { dir: tmp });
      obj.b = 2;
      await new Promise(r => setTimeout(r, 10));
      const content = JSON.parse(fs.readFileSync(path.join(tmp, 'obj.json'), 'utf8'));
      assert.deepEqual(content, { a: 1, b: 2 });
    } finally {
      rmrf(tmp);
    }
  });

  test('schema validation blocks invalid change', () => {
    const tmp = mkTmpDir();
    try {
      const schema = {
        safeParse(v) {
          const ok = Array.isArray(v) && v.every(x => typeof x === 'string');
          return ok ? { success: true, data: v } : { success: false, error: new Error('invalid') };
        }
      };
      const arr = cubby('tags', [], { dir: tmp, schema });
      arr.push('x');
      assert.throws(() => {
        // @ts-ignore this is JS test; at runtime we expect throw
        arr.push(123);
      });
    } finally {
      rmrf(tmp);
    }
  });
});


