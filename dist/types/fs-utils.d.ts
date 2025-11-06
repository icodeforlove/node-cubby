export declare function ensureDirSync(dirPath: string): void;
export declare function readJsonFileSync<T>(filePath: string): T | undefined;
export declare function writeJsonAtomicSync(filePath: string, data: unknown): void;
export declare function sanitizeNameToFilename(name: string): string;
export declare function deepClone<T>(value: T): T;
