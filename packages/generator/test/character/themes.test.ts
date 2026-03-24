import {
  BASE_THEME,
  CHARACTER_THEMES,
  MODERN_MAN_THEME,
  MODERN_WOMAN_THEME,
} from '../../src/character/index.js';

describe('character themes', () => {
  it('exposes the required top-level sections on each theme', () => {
    [BASE_THEME, MODERN_WOMAN_THEME, MODERN_MAN_THEME].forEach((theme) => {
      expect(theme).toMatchObject({
        id: expect.any(String),
        basics: expect.any(Object),
        appearance: expect.any(Object),
        personality: expect.any(Object),
        body: expect.any(Object),
        details: expect.any(Object),
      });
    });
  });

  it('defines the required basics pools', () => {
    [BASE_THEME, MODERN_WOMAN_THEME, MODERN_MAN_THEME].forEach((theme) => {
      expect(theme.basics.firstNames.length).toBeGreaterThan(0);
      expect(theme.basics.lastNames?.length ?? 0).toBeGreaterThan(0);
      expect(theme.basics.ageRange[0]).toBeLessThanOrEqual(theme.basics.ageRange[1]);
      expect(theme.basics.personalityTraits.length).toBeGreaterThan(0);
    });
  });

  it('defines the required appearance pools', () => {
    [BASE_THEME, MODERN_WOMAN_THEME, MODERN_MAN_THEME].forEach((theme) => {
      expect(theme.appearance.heights.length).toBeGreaterThan(0);
      expect(theme.appearance.builds.length).toBeGreaterThan(0);
      expect(theme.appearance.skinTones.length).toBeGreaterThan(0);
      expect(theme.appearance.hairColors.length).toBeGreaterThan(0);
      expect(theme.appearance.eyeColors.length).toBeGreaterThan(0);
    });
  });

  it('defines the required personality pools', () => {
    [BASE_THEME, MODERN_WOMAN_THEME, MODERN_MAN_THEME].forEach((theme) => {
      expect(theme.personality.traits.length).toBeGreaterThan(0);
      expect(theme.personality.values.length).toBeGreaterThan(0);
    });
  });

  it('keeps body regionPopulationRate within 0 and 1', () => {
    [BASE_THEME, MODERN_WOMAN_THEME, MODERN_MAN_THEME].forEach((theme) => {
      expect(theme.body.regionPopulationRate ?? 0).toBeGreaterThanOrEqual(0);
      expect(theme.body.regionPopulationRate ?? 0).toBeLessThanOrEqual(1);
    });
  });

  it('defines details labels, values, and count ranges', () => {
    [BASE_THEME, MODERN_WOMAN_THEME, MODERN_MAN_THEME].forEach((theme) => {
      expect(Object.keys(theme.details.labels).length).toBeGreaterThan(0);
      expect(Object.keys(theme.details.values).length).toBeGreaterThan(0);
      expect(theme.details.countRange[0]).toBeLessThanOrEqual(theme.details.countRange[1]);
    });
  });

  it('keeps BASE_THEME gender-neutral by default', () => {
    expect(BASE_THEME.defaultGender).toBeUndefined();
  });

  it('sets the correct default gender for MODERN_WOMAN_THEME', () => {
    expect(MODERN_WOMAN_THEME.defaultGender).toBe('female');
  });

  it('sets the correct default gender for MODERN_MAN_THEME', () => {
    expect(MODERN_MAN_THEME.defaultGender).toBe('male');
  });

  it('includes default tags on all exported themes', () => {
    [BASE_THEME, MODERN_WOMAN_THEME, MODERN_MAN_THEME].forEach((theme) => {
      expect(theme.defaultTags?.length ?? 0).toBeGreaterThan(0);
    });
  });

  it('uses unique theme ids across the exported theme map', () => {
    const ids = Object.values(CHARACTER_THEMES).map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
