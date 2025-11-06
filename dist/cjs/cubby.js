"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCubby = createCubby;
exports.cubby = cubby;
const path = require("node:path");
const fs_utils_1 = require("./fs-utils");
const project_root_1 = require("./project-root");
class CubbyImpl {
    constructor(name, filePath, initialValue, schema, writeDebounceMs = 0) {
        this.listeners = [];
        this.writeTimer = null;
        this.name = name;
        this.filePath = filePath;
        this.schema = schema;
        this.value = initialValue;
        this.writeDebounceMs = Math.max(0, writeDebounceMs | 0);
    }
    get() {
        return this.value;
    }
    set(next) {
        const validated = this.validate(next);
        this.value = validated;
        this.persist();
        this.notify();
    }
    update(mutator) {
        const draft = (0, fs_utils_1.deepClone)(this.value);
        mutator(draft);
        this.set(draft);
        return this.value;
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const idx = this.listeners.indexOf(listener);
            if (idx >= 0)
                this.listeners.splice(idx, 1);
        };
    }
    notify() {
        for (const l of this.listeners)
            l(this.value);
    }
    validate(input) {
        if (!this.schema)
            return input;
        const result = this.schema.safeParse(input);
        if (result && result.success === true) {
            return result.data;
        }
        throw new Error('Validation failed');
    }
    persist() {
        if (this.writeDebounceMs > 0) {
            if (this.writeTimer)
                clearTimeout(this.writeTimer);
            this.writeTimer = setTimeout(() => {
                (0, fs_utils_1.writeJsonAtomicSync)(this.filePath, this.value);
            }, this.writeDebounceMs);
            return;
        }
        (0, fs_utils_1.writeJsonAtomicSync)(this.filePath, this.value);
    }
}
function createCubby(options) {
    const { name, defaultValue, schema, dir, writeDebounceMs = 0 } = options;
    const projectRoot = dir ? path.resolve(dir) : (0, project_root_1.findProjectRoot)(process.cwd());
    const cubbyDir = dir ? projectRoot : path.join(projectRoot, '.cubby');
    (0, fs_utils_1.ensureDirSync)(cubbyDir);
    const fileName = `${(0, fs_utils_1.sanitizeNameToFilename)(name)}.json`;
    const filePath = path.join(cubbyDir, fileName);
    let value = (0, fs_utils_1.readJsonFileSync)(filePath);
    if (value === undefined) {
        value = (0, fs_utils_1.deepClone)(defaultValue);
        (0, fs_utils_1.writeJsonAtomicSync)(filePath, value);
    }
    if (schema) {
        const res = schema.safeParse(value);
        if (!res.success) {
            value = (0, fs_utils_1.deepClone)(defaultValue);
            (0, fs_utils_1.writeJsonAtomicSync)(filePath, value);
        }
        else {
            value = res.data;
        }
    }
    return new CubbyImpl(name, filePath, value, schema, writeDebounceMs);
}
function createPersistentProxy(initialRoot, commit, schema) {
    const proxyCache = new WeakMap();
    const rootRef = { current: initialRoot };
    const getProxy = (target, path) => {
        if (typeof target !== 'object' || target === null)
            return target;
        const cached = proxyCache.get(target);
        if (cached)
            return cached;
        const handler = {
            get(obj, prop, receiver) {
                if (prop === Symbol.toStringTag)
                    return Object.prototype.toString.call(obj);
                const value = Reflect.get(obj, prop, receiver);
                return getProxy(value, path.concat(prop));
            },
            set(obj, prop, value, receiver) {
                const next = (0, fs_utils_1.deepClone)(rootRef.current);
                // apply change to clone at path
                let cursor = next;
                for (let i = 0; i < path.length; i++) {
                    cursor = cursor[path[i]];
                }
                cursor[prop] = unwrapProxy(value);
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
                const next = (0, fs_utils_1.deepClone)(rootRef.current);
                let cursor = next;
                for (let i = 0; i < path.length; i++) {
                    cursor = cursor[path[i]];
                }
                delete cursor[prop];
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
    const unwrapProxy = (v) => {
        // Our proxies don't need special unwrapping; handle nested proxies by value copying.
        return v;
    };
    return getProxy(rootRef.current, []);
}
function cubby(name, defaultValue, options) {
    const projectRoot = options?.dir ? path.resolve(options.dir) : (0, project_root_1.findProjectRoot)(process.cwd());
    const cubbyDir = options?.dir ? projectRoot : path.join(projectRoot, '.cubby');
    (0, fs_utils_1.ensureDirSync)(cubbyDir);
    const fileName = `${(0, fs_utils_1.sanitizeNameToFilename)(name)}.json`;
    const filePath = path.join(cubbyDir, fileName);
    let value = (0, fs_utils_1.readJsonFileSync)(filePath);
    if (value === undefined) {
        value = (0, fs_utils_1.deepClone)(defaultValue);
        (0, fs_utils_1.writeJsonAtomicSync)(filePath, value);
    }
    if (options?.schema) {
        const res = options.schema.safeParse(value);
        if (!res.success) {
            value = (0, fs_utils_1.deepClone)(defaultValue);
            (0, fs_utils_1.writeJsonAtomicSync)(filePath, value);
        }
        else {
            value = res.data;
        }
    }
    let saving = null;
    const debounceMs = Math.max(0, options?.writeDebounceMs ?? 0);
    const commit = (nextRoot) => {
        if (debounceMs > 0) {
            if (saving)
                clearTimeout(saving);
            saving = setTimeout(() => {
                (0, fs_utils_1.writeJsonAtomicSync)(filePath, nextRoot);
            }, debounceMs);
        }
        else {
            (0, fs_utils_1.writeJsonAtomicSync)(filePath, nextRoot);
        }
    };
    const proxy = createPersistentProxy(value, commit, options?.schema);
    return proxy;
}
