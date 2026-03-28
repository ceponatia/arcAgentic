import {
  buildAutoDefaults,
  resolveAgeBucket,
  resolveClassificationDefaults,
  type ClassificationDefaultMap,
} from '@arcagentic/schemas';

describe('classification defaults', () => {
  describe('resolveAgeBucket', () => {
    it('maps ages into the expected buckets', () => {
      expect(resolveAgeBucket(undefined)).toBe('adult');
      expect(resolveAgeBucket(0)).toBe('child');
      expect(resolveAgeBucket(12)).toBe('child');
      expect(resolveAgeBucket(13)).toBe('adolescent');
      expect(resolveAgeBucket(17)).toBe('adolescent');
      expect(resolveAgeBucket(18)).toBe('young-adult');
      expect(resolveAgeBucket(29)).toBe('young-adult');
      expect(resolveAgeBucket(30)).toBe('adult');
      expect(resolveAgeBucket(49)).toBe('adult');
      expect(resolveAgeBucket(50)).toBe('middle-aged');
      expect(resolveAgeBucket(69)).toBe('middle-aged');
      expect(resolveAgeBucket(70)).toBe('elderly');
      expect(resolveAgeBucket(100)).toBe('elderly');
    });
  });

  describe('resolveClassificationDefaults', () => {
    const sampleDefaults: ClassificationDefaultMap = {
      '*': {
        '*': {
          face: {
            scent: { primary: 'baseline', intensity: 0.1 },
            texture: {
              primary: 'smooth',
              temperature: 'warm',
              moisture: 'normal',
            },
          },
        },
      },
      male: {
        '*': {
          face: {
            scent: { notes: ['cedar'] },
            visual: { description: 'gender-specific face' },
          },
        },
        adult: {
          face: {
            scent: { intensity: 0.3 },
            texture: { notes: ['weathered'] },
          },
        },
      },
    };

    it('returns an empty object when no race defaults exist', () => {
      expect(
        resolveClassificationDefaults(
          { race: 'Human', gender: 'male', ageBucket: 'adult' },
          undefined
        )
      ).toEqual({});
    });

    it('returns wildcard-only data when no gender defaults match', () => {
      const result = resolveClassificationDefaults(
        { race: 'Human', gender: 'female', ageBucket: 'child' },
        sampleDefaults
      );

      expect(result.face?.scent?.primary).toBe('baseline');
      expect(result.face?.visual).toBeUndefined();
    });

    it('returns gender-specific data when the gender matches', () => {
      const result = resolveClassificationDefaults(
        { race: 'Human', gender: 'male', ageBucket: 'child' },
        sampleDefaults
      );

      expect(result.face?.visual?.description).toBe('gender-specific face');
      expect(result.face?.scent?.notes).toEqual(['cedar']);
      expect(result.face?.scent?.primary).toBe('baseline');
    });

    it('prefers the exact age bucket over the gender wildcard', () => {
      const result = resolveClassificationDefaults(
        { race: 'Human', gender: 'male', ageBucket: 'adult' },
        sampleDefaults
      );

      expect(result.face?.scent?.intensity).toBe(0.3);
    });

    it('merges wildcard, gender, and age layers together', () => {
      const result = resolveClassificationDefaults(
        { race: 'Human', gender: 'male', ageBucket: 'adult' },
        sampleDefaults
      );

      expect(result.face).toEqual({
        scent: {
          primary: 'baseline',
          notes: ['cedar'],
          intensity: 0.3,
        },
        texture: {
          primary: 'smooth',
          temperature: 'warm',
          moisture: 'normal',
          notes: ['weathered'],
        },
        visual: { description: 'gender-specific face' },
      });
    });
  });

  describe('buildAutoDefaults', () => {
    it('produces human male young-adult face defaults with classification data', () => {
      const result = buildAutoDefaults(
        {
          race: 'Human',
          gender: 'male',
          age: 25,
        },
        undefined
      );

      expect(result.face?.visual?.description).toContain('Youthful masculine features');
      expect(result.face?.texture?.primary).toBe('smooth');
      expect(result.face?.scent?.primary).toBe('warm skin');
    });

    it('falls back to flat scent defaults for unknown races', () => {
      const result = buildAutoDefaults(
        {
          race: 'Gnome',
          gender: 'male',
          age: 25,
        },
        undefined
      );

      expect(result.face?.visual).toBeUndefined();
      expect(result.face?.texture).toBeUndefined();
      expect(result.face?.scent?.primary).toBeDefined();
    });

    it('remains backward compatible when profile fields are omitted', () => {
      const result = buildAutoDefaults({}, undefined);

      expect(result.face?.scent?.primary).toBeDefined();
      expect(result.hair?.scent?.primary).toBeDefined();
      expect(result.leftFoot?.scent?.primary).toBeDefined();
    });

    it('still honors excluded regions', () => {
      const result = buildAutoDefaults(
        {
          race: 'Human',
          gender: 'male',
          age: 25,
        },
        ['face', 'leftFoot']
      );

      expect(result.face).toBeUndefined();
      expect(result.leftFoot).toBeUndefined();
      expect(result.rightFoot?.scent?.primary).toBeDefined();
    });

    it('produces different defaults for elves and humans with the same profile', () => {
      const human = buildAutoDefaults(
        {
          race: 'Human',
          gender: 'female',
          age: 35,
        },
        undefined
      );

      const elf = buildAutoDefaults(
        {
          race: 'Elf',
          gender: 'female',
          age: 35,
        },
        undefined
      );

      expect(human.leftEar?.visual?.description).not.toBe(elf.leftEar?.visual?.description);
      expect(elf.leftEar?.visual?.description).toContain('taper');
      expect(human.face?.scent?.intensity).not.toBe(elf.face?.scent?.intensity);
    });
  });
});