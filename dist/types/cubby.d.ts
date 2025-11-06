export interface ZodLikeSchema<T> {
    safeParse(input: unknown): {
        success: true;
        data: T;
    } | {
        success: false;
        error: unknown;
    };
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
export declare function createCubby<T>(options: CreateCubbyOptions<T>): Cubby<T>;
export interface LegacyCubbyOptions<T> {
    name: string;
    defaultValue: T;
    schema?: ZodLikeSchema<T>;
    dir?: string;
    writeDebounceMs?: number;
}
export declare function cubby<T>(name: string, defaultValue: T, options?: Omit<LegacyCubbyOptions<T>, 'name' | 'defaultValue'>): T;
