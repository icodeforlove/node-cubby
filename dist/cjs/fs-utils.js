"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDirSync = ensureDirSync;
exports.readJsonFileSync = readJsonFileSync;
exports.writeJsonAtomicSync = writeJsonAtomicSync;
exports.sanitizeNameToFilename = sanitizeNameToFilename;
exports.deepClone = deepClone;
const fs = require("node:fs");
const path = require("node:path");
function ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
function readJsonFileSync(filePath) {
    if (!fs.existsSync(filePath))
        return undefined;
    const content = fs.readFileSync(filePath, { encoding: 'utf8' });
    if (content.trim() === '')
        return undefined;
    return JSON.parse(content);
}
function writeJsonAtomicSync(filePath, data) {
    ensureDirSync(path.dirname(filePath));
    const tmp = `${filePath}.${process.pid}.${Date.now()}.${Math.random()
        .toString(36)
        .slice(2)}.tmp`;
    const json = JSON.stringify(data);
    fs.writeFileSync(tmp, json, { encoding: 'utf8' });
    fs.renameSync(tmp, filePath);
}
function sanitizeNameToFilename(name) {
    // Keep legacy-compatible behavior: replace non-letters with '-'
    const replaced = name.replace(/[^A-Z]{1,}/gi, '-').replace(/^-|-$/g, '');
    return replaced.toLowerCase();
}
function deepClone(value) {
    // Prefer structuredClone if available; fallback to JSON clone for JSON-safe data
    const sc = globalThis.structuredClone;
    if (typeof sc === 'function') {
        return sc(value);
    }
    return JSON.parse(JSON.stringify(value));
}
