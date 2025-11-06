import * as path from 'node:path';
import { deepClone, ensureDirSync, readJsonFileSync, sanitizeNameToFilename, writeJsonAtomicSync } from './fs-utils';
import { findProjectRoot } from './project-root';

export interface ZodLikeSchema<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export interface CreateCubbyOptions<T> {
  name: string;
  defaultValue: T;
  schema?: ZodLikeSchema<T>;
  dir?: string;
  writeDebounceMs?: number;
}

export interface Cubby<T> {
  readonly name: string;
  readonly filePath: string;
  get(): T;
  set(value: T): void;
  update(mutator: (draft: T) => void): T;
  subscribe(listener: (value: T) => void): () => void;
}

class CubbyImpl<T> implements Cubby<T> {
  public readonly name: string;
  public readonly filePath: string;
  private value: T;
  private readonly schema?: ZodLikeSchema<T>;
  private readonly listeners: Array<(value: T) => void> = [];
  private writeTimer: NodeJS.Timeout | null = null;
  private readonly writeDebounceMs: number;

  constructor(name: string, filePath: string, initialValue: T, schema: ZodLikeSchema<T> | undefined, writeDebounceMs: number = 0) {
    this.name = name;
    this.filePath = filePath;
    this.schema = schema;
    this.value = initialValue;
    this.writeDebounceMs = Math.max(0, writeDebounceMs | 0);
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    const validated = this.validate(next);
    this.value = validated;
    this.persist();
    this.notify();
  }

  update(mutator: (draft: T) => void): T {
    const draft = deepClone(this.value);
    mutator(draft);
    this.set(draft);
    return this.value;
  }

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l(this.value);
  }

  private validate(input: T): T {
    if (!this.schema) return input;
    const result = this.schema.safeParse(input);
    if (result && (result as any).success === true) {
      return (result as any).data as T;
    }
    throw new Error('Validation failed');
  }

  private persist(): void {
    if (this.writeDebounceMs > 0) {
      if (this.writeTimer) clearTimeout(this.writeTimer);
      this.writeTimer = setTimeout(() => {
        writeJsonAtomicSync(this.filePath, this.value);
      }, this.writeDebounceMs);
      return;
    }
    writeJsonAtomicSync(this.filePath, this.value);
  }
}

export function createCubby<T>(options: CreateCubbyOptions<T>): Cubby<T> {
  const { name, defaultValue, schema, dir, writeDebounceMs = 0 } = options;
  const projectRoot = dir ? path.resolve(dir) : findProjectRoot(process.cwd());
  const cubbyDir = dir ? projectRoot : path.join(projectRoot, '.cubby');
  ensureDirSync(cubbyDir);

  const fileName = `${sanitizeNameToFilename(name)}.json`;
  const filePath = path.join(cubbyDir, fileName);

  let value = readJsonFileSync<T>(filePath);
  if (value === undefined) {
    value = deepClone(defaultValue);
    writeJsonAtomicSync(filePath, value);
  }

  if (schema) {
    const res = schema.safeParse(value);
    if (!res.success) {
      value = deepClone(defaultValue);
      writeJsonAtomicSync(filePath, value);
    } else {
      value = res.data;
    }
  }

  return new CubbyImpl<T>(name, filePath, value as T, schema, writeDebounceMs);
}

// Legacy-compatible proxy API: direct mutations (push, property sets) trigger persistence.
// Validation (if provided) is checked synchronously against a simulated next state prior to committing.

type ChangeCommit<T> = (nextRoot: T) => void;

function createPersistentProxy<T>(initialRoot: T, commit: ChangeCommit<T>, schema?: ZodLikeSchema<T>): T {
  const proxyCache = new WeakMap<object, any>();
  const rootRef: { current: T } = { current: initialRoot };

  const getProxy = (target: any, path: Array<string | number>): any => {
    if (typeof target !== 'object' || target === null) return target;
    const cached = proxyCache.get(target);
    if (cached) return cached;

    const handler: ProxyHandler<any> = {
      get(obj, prop, receiver) {
        if (prop === Symbol.toStringTag) return Object.prototype.toString.call(obj);
        const value = Reflect.get(obj, prop, receiver);
        return getProxy(value, path.concat(prop as any));
      },
      set(obj, prop, value, receiver) {
        const next = deepClone(rootRef.current);
        // apply change to clone at path
        let cursor: any = next;
        for (let i = 0; i < path.length; i++) {
          cursor = cursor[path[i] as any];
        }
        cursor[prop as any] = unwrapProxy(value);
        if (schema) {
          const res = schema.safeParse(next);
          if (!res.success) {
            throw new Error('Validation failed');
          }
        }
        // commit real change only after validation
        const ok = Reflect.set(obj, prop, unwrapProxy(value), receiver);
        if (ok) {
          rootRef.current = next;
          commit(next);
        }
        return ok;
      },
      deleteProperty(obj, prop) {
        const next = deepClone(rootRef.current);
        let cursor: any = next;
        for (let i = 0; i < path.length; i++) {
          cursor = cursor[path[i] as any];
        }
        delete cursor[prop as any];
        if (schema) {
          const res = schema.safeParse(next);
          if (!res.success) {
            throw new Error('Validation failed');
          }
        }
        const ok = Reflect.deleteProperty(obj, prop);
        if (ok) {
          rootRef.current = next;
          commit(next);
        }
        return ok;
      }
    };

    const proxied = new Proxy(target, handler);
    proxyCache.set(target, proxied);
    return proxied;
  };

  const unwrapProxy = (v: any): any => {
    // Our proxies don't need special unwrapping; handle nested proxies by value copying.
    return v;
  };

  return getProxy(rootRef.current as any, []) as T;
}

export interface LegacyCubbyOptions<T> {
  name: string;
  defaultValue: T;
  schema?: ZodLikeSchema<T>;
  dir?: string;
  writeDebounceMs?: number;
}

export function cubby<T>(name: string, defaultValue: T, options?: Omit<LegacyCubbyOptions<T>, 'name' | 'defaultValue'>): T {
  const projectRoot = options?.dir ? path.resolve(options.dir) : findProjectRoot(process.cwd());
  const cubbyDir = options?.dir ? projectRoot : path.join(projectRoot, '.cubby');
  ensureDirSync(cubbyDir);

  const fileName = `${sanitizeNameToFilename(name)}.json`;
  const filePath = path.join(cubbyDir, fileName);

  let value = readJsonFileSync<T>(filePath);
  if (value === undefined) {
    value = deepClone(defaultValue);
    writeJsonAtomicSync(filePath, value);
  }

  if (options?.schema) {
    const res = options.schema.safeParse(value);
    if (!res.success) {
      value = deepClone(defaultValue);
      writeJsonAtomicSync(filePath, value);
    } else {
      value = res.data;
    }
  }

  let saving: NodeJS.Timeout | null = null;
  const debounceMs = Math.max(0, options?.writeDebounceMs ?? 0);
  const commit: ChangeCommit<T> = (nextRoot) => {
    if (debounceMs > 0) {
      if (saving) clearTimeout(saving);
      saving = setTimeout(() => {
        writeJsonAtomicSync(filePath, nextRoot);
      }, debounceMs);
    } else {
      writeJsonAtomicSync(filePath, nextRoot);
    }
  };

  const proxy = createPersistentProxy<T>(value as T, commit, options?.schema);
  return proxy;
}

