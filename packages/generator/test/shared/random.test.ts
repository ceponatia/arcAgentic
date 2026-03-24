import type { WeightedValue } from '../../src/types.js';
import {
  isWeightedPool,
  pickFromPool,
  pickMultiple,
  pickMultipleFromPool,
  pickRandom,
  pickRandomCount,
  pickRandomCountFromPool,
  pickWeighted,
  randomBool,
  randomFloat,
  randomFloatRounded,
  randomId,
  randomInt,
  shuffle,
} from '../../src/shared/random.js';

function mockRandomSequence(...values: number[]) {
  let index = 0;

  return vi.spyOn(Math, 'random').mockImplementation(() => {
    const nextValue = values[Math.min(index, values.length - 1)];
    index += 1;
    return nextValue ?? 0;
  });
}

describe('isWeightedPool', () => {
  it('returns false for a plain array pool', () => {
    expect(isWeightedPool(['a', 'b', 'c'])).toBe(false);
  });

  it('returns true for a weighted pool', () => {
    const pool: WeightedValue<string>[] = [{ value: 'a', weight: 1 }];

    expect(isWeightedPool(pool)).toBe(true);
  });
});

describe('pickRandom', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the first item when Math.random is 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(pickRandom(['first', 'second', 'third'])).toBe('first');
  });

  it('returns the last item when Math.random is near 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    expect(pickRandom(['first', 'second', 'third'])).toBe('third');
  });

  it('throws when picking from an empty array', () => {
    expect(() => pickRandom([])).toThrow('Cannot pick from empty array');
  });
});

describe('pickWeighted', () => {
  const pool: WeightedValue<string>[] = [
    { value: 'first', weight: 1 },
    { value: 'second', weight: 2 },
    { value: 'third', weight: 3 },
  ];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the first item at the lowest cumulative boundary', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(pickWeighted(pool)).toBe('first');
  });

  it('returns a middle item when the random value falls into its weight range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);

    expect(pickWeighted(pool)).toBe('second');
  });

  it('returns the last item when the random value falls into the final range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8);

    expect(pickWeighted(pool)).toBe('third');
  });

  it('throws when picking from an empty weighted pool', () => {
    expect(() => pickWeighted([])).toThrow('Cannot pick from empty weighted pool');
  });
});

describe('pickFromPool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks from a plain pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    expect(pickFromPool(['alpha', 'beta'])).toBe('beta');
  });

  it('picks from a weighted pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.6);

    expect(
      pickFromPool([
        { value: 'alpha', weight: 1 },
        { value: 'beta', weight: 5 },
      ])
    ).toBe('beta');
  });
});

describe('pickMultipleFromPool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns unique items from a weighted pool', () => {
    mockRandomSequence(0, 0);

    expect(
      pickMultipleFromPool(
        [
          { value: 'alpha', weight: 1 },
          { value: 'beta', weight: 1 },
          { value: 'gamma', weight: 1 },
        ],
        2
      )
    ).toEqual(['alpha', 'beta']);
  });

  it('returns all weighted values when count is greater than or equal to the pool length', () => {
    expect(
      pickMultipleFromPool(
        [
          { value: 'alpha', weight: 1 },
          { value: 'beta', weight: 1 },
        ],
        5
      )
    ).toEqual(['alpha', 'beta']);
  });
});

describe('pickMultiple', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns unique items from a plain array', () => {
    mockRandomSequence(0, 0);

    expect(pickMultiple(['alpha', 'beta', 'gamma'], 2)).toEqual(['alpha', 'beta']);
  });

  it('returns the whole array when count is greater than the array length', () => {
    expect(pickMultiple(['alpha', 'beta'], 4)).toEqual(['alpha', 'beta']);
  });
});

describe('pickRandomCount', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks a random count in range and then returns that many unique items', () => {
    mockRandomSequence(0.5, 0, 0);

    expect(pickRandomCount(['alpha', 'beta', 'gamma', 'delta'], 1, 3)).toEqual([
      'alpha',
      'beta',
    ]);
  });
});

describe('pickRandomCountFromPool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks a random count in range and then returns that many pool values', () => {
    mockRandomSequence(0.5, 0, 0);

    expect(
      pickRandomCountFromPool(
        [
          { value: 'alpha', weight: 1 },
          { value: 'beta', weight: 1 },
          { value: 'gamma', weight: 1 },
          { value: 'delta', weight: 1 },
        ],
        1,
        3
      )
    ).toEqual(['alpha', 'beta']);
  });
});

describe('randomInt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes both the minimum and maximum values', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.999);

    expect(randomInt(2, 5)).toBe(2);
    expect(randomInt(2, 5)).toBe(5);
  });
});

describe('randomFloat', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a float within the requested range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    expect(randomFloat(10, 20)).toBe(12.5);
  });
});

describe('randomFloatRounded', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rounds to the requested number of decimal places', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1 / 3);

    expect(randomFloatRounded(0, 1, 2)).toBe(0.33);
  });
});

describe('randomBool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when the random value is below the threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.29);

    expect(randomBool(0.3)).toBe(true);
  });

  it('returns false when the random value is at or above the threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);

    expect(randomBool(0.3)).toBe(false);
  });
});

describe('randomId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a string with the provided prefix', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    expect(randomId('char')).toBe(
      `char-${(1234567890).toString(36)}-${(0.123456789).toString(36).substring(2, 8)}`
    );
  });

  it('returns a string without a prefix when none is provided', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    expect(randomId()).toBe(
      `${(1234567890).toString(36)}-${(0.123456789).toString(36).substring(2, 8)}`
    );
  });
});

describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a deterministically shuffled array when Math.random is mocked', () => {
    const values = [1, 2, 3, 4];

    mockRandomSequence(0, 0.5, 0.999);

    expect(shuffle(values)).toBe(values);
    expect(values).toEqual([4, 3, 2, 1]);
  });
});
