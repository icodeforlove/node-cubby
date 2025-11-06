## cubby

Simple synchronous JSON storage for Node.js, fully typed, no runtime deps.

## Installation

```bash
npm install cubby
```

## API (TypeScript)

```ts
import cubby from 'cubby';

// Arrays
const users = cubby<string[]>('users', []);
users.push('a'); // persists to <projectRoot>/.cubby/users.json

// Objects
const settings = cubby('settings', { theme: 'light' });
settings.theme = 'dark'; // persists
```

Validation with Zod (checked before persisting):

```ts
import { z } from 'zod';
const Tag = z.string();
const tags = cubby('tags', [] as string[], { schema: z.array(Tag) });
tags.push('ok');
// throws and does not persist
// @ts-ignore
tags.push(123);
```

### API

```ts
type ZodLikeSchema<T> = {
  safeParse(input: unknown): { success: true; data: T } | { success: false; error: unknown };
};
function cubby<T>(name: string, defaultValue: T, options?: {
  schema?: ZodLikeSchema<T>;
  dir?: string;
  writeDebounceMs?: number;
}): T;
```

### Storage location

- Defaults to `<projectRoot>/.cubby/<name>.json` where `projectRoot` is the nearest directory containing a `package.json` when starting from `process.cwd()`.
- Override with `dir` if you want a custom directory (tests, ephemeral data, etc.).

### Debounced writes

Provide `writeDebounceMs` to reduce filesystem churn when performing many updates in quick succession.

## Migration from v0.x

No API change for common usage. You can continue using:
```js
const users = cubby('users', []);
users.push('test');
```

## Testing

This project uses Node's built-in test runner.

```bash
npm test
```