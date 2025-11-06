import cubby, { ZodLikeSchema } from '../src';

type User = { id: string };

const schema: ZodLikeSchema<User[]> = {
  safeParse(input: unknown) {
    if (Array.isArray(input) && input.every(x => x && typeof (x as any).id === 'string')) {
      return { success: true as const, data: input as User[] };
    }
    return { success: false as const, error: new Error('invalid') };
  }
};

const users = cubby<User[]>('users', [], { schema });
users.push({ id: 'ok' });
// @ts-expect-error id must be string
users.push({ id: 123 });

// @ts-expect-error defaultValue must match T
cubby<{ id: number }[]>('bad', [{ id: 'x' }]);


