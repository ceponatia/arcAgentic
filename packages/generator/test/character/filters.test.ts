import {
  GENDER_APPEARANCE_REGIONS,
  GENDER_BODY_REGIONS,
  filterRegionsByGender,
  getAppearanceRegionsForGender,
  getBodyRegionsForGender,
  isAppearanceRegionForGender,
  isRegionForGender,
} from '../../src/character/index.js';

describe('getBodyRegionsForGender', () => {
  it('includes female-only body regions for female characters', () => {
    expect(getBodyRegionsForGender('female')).toContain('leftBreast');
    expect(getBodyRegionsForGender('female')).toContain('vagina');
  });

  it('excludes male-only body regions for female characters', () => {
    expect(getBodyRegionsForGender('female')).not.toContain('penis');
  });

  it('includes male-only body regions for male characters', () => {
    expect(getBodyRegionsForGender('male')).toContain('penis');
  });

  it('excludes female-only body regions for male characters', () => {
    const regions = getBodyRegionsForGender('male');

    expect(regions).not.toContain('leftBreast');
    expect(regions).not.toContain('vagina');
  });

  it('returns only neutral regions when gender is undefined', () => {
    const regions = getBodyRegionsForGender(undefined);

    expect(regions).not.toContain('leftBreast');
    expect(regions).not.toContain('penis');
  });

  it('returns all body regions for an unknown gender string', () => {
    const regions = getBodyRegionsForGender('nonbinary');

    expect(regions).toContain('leftBreast');
    expect(regions).toContain('penis');
  });
});

describe('getAppearanceRegionsForGender', () => {
  it('includes female-only appearance regions for female characters', () => {
    expect(getAppearanceRegionsForGender('female')).toContain('leftBreast');
  });

  it('excludes male-only appearance regions for female characters', () => {
    expect(getAppearanceRegionsForGender('female')).not.toContain('penis');
  });

  it('includes male-only appearance regions for male characters', () => {
    expect(getAppearanceRegionsForGender('male')).toContain('penis');
  });

  it('excludes female-only appearance regions for male characters', () => {
    expect(getAppearanceRegionsForGender('male')).not.toContain('leftBreast');
  });

  it('returns only neutral appearance regions when gender is undefined', () => {
    const regions = getAppearanceRegionsForGender(undefined);

    expect(regions).not.toContain('leftBreast');
    expect(regions).not.toContain('penis');
  });
});

describe('isRegionForGender', () => {
  it('returns true for leftBreast and female', () => {
    expect(isRegionForGender('leftBreast', 'female')).toBe(true);
  });

  it('returns false for leftBreast and male', () => {
    expect(isRegionForGender('leftBreast', 'male')).toBe(false);
  });

  it('returns true for penis and male', () => {
    expect(isRegionForGender('penis', 'male')).toBe(true);
  });

  it('returns false for penis and female', () => {
    expect(isRegionForGender('penis', 'female')).toBe(false);
  });
});

describe('isAppearanceRegionForGender', () => {
  it('returns true for vagina and female', () => {
    expect(isAppearanceRegionForGender('vagina', 'female')).toBe(true);
  });

  it('returns false for vagina and male', () => {
    expect(isAppearanceRegionForGender('vagina', 'male')).toBe(false);
  });
});

describe('filterRegionsByGender', () => {
  it('returns separate included and excluded arrays', () => {
    expect(filterRegionsByGender(['hair', 'leftBreast', 'penis'], 'female')).toEqual({
      included: ['hair', 'leftBreast'],
      excluded: ['penis'],
    });
  });
});

describe('gender region constants', () => {
  it('defines the expected female-only body regions', () => {
    expect(GENDER_BODY_REGIONS.femaleOnly).toEqual(
      expect.arrayContaining(['leftBreast', 'rightBreast', 'leftNipple', 'rightNipple', 'vagina'])
    );
  });

  it('defines the expected male-only body regions', () => {
    expect(GENDER_BODY_REGIONS.maleOnly).toEqual(['penis']);
  });

  it('mirrors the same region split for appearance regions', () => {
    expect(GENDER_APPEARANCE_REGIONS.femaleOnly).toEqual(GENDER_BODY_REGIONS.femaleOnly);
    expect(GENDER_APPEARANCE_REGIONS.maleOnly).toEqual(GENDER_BODY_REGIONS.maleOnly);
  });
});
