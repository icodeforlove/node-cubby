"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findProjectRoot = findProjectRoot;
const fs = require("node:fs");
const path = require("node:path");
function findProjectRoot(startDir = process.cwd()) {
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
