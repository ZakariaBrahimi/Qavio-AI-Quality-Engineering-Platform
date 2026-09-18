import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createEnv } from '../env';

describe('createEnv', () => {
  const schema = { PORT: z.coerce.number().int().positive() };

  it('parses and coerces valid input', () => {
    expect(createEnv(schema, { PORT: '3000' })).toEqual({ PORT: 3000 });
  });

  it('throws a readable error for missing or invalid variables', () => {
    expect(() => createEnv(schema, {})).toThrow(/PORT/);
  });
});
