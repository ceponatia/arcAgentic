import {
  BACKSTORY_TEMPLATES,
  BODY_SCENTS,
  BREAST_SIZES,
  CHEST_BUILDS_MALE,
  FEMALE_FIRST_NAMES,
  HAIR_COLORS_WEIGHTED,
  HEIGHTS_FEMALE_WEIGHTED,
  HEIGHTS_MALE_WEIGHTED,
  HIP_WIDTHS,
  LAST_NAMES,
  MALE_FIRST_NAMES,
  SKIN_FLAVORS,
  SKIN_FLAVORS_WEIGHTED,
  SKIN_TEXTURES,
  SUMMARY_TEMPLATES_FEMALE,
  SUMMARY_TEMPLATES_MALE,
  SUMMARY_TEMPLATES_NEUTRAL,
} from '../../src/character/pools/index.js';

function expectPositiveWeights(
  pool: readonly {
    weight: number;
  }[]
) {
  pool.forEach((item) => {
    expect(item.weight).toBeGreaterThan(0);
  });
}

describe('character pools', () => {
  it('has non-empty female first-name pools', () => {
    expect(FEMALE_FIRST_NAMES.length).toBeGreaterThan(0);
  });

  it('has non-empty male first-name pools', () => {
    expect(MALE_FIRST_NAMES.length).toBeGreaterThan(0);
  });

  it('has non-empty last-name pools', () => {
    expect(LAST_NAMES.length).toBeGreaterThan(0);
  });

  it('uses positive weights in weighted appearance pools', () => {
    expectPositiveWeights(HEIGHTS_FEMALE_WEIGHTED);
    expectPositiveWeights(HEIGHTS_MALE_WEIGHTED);
    expectPositiveWeights(HAIR_COLORS_WEIGHTED);
    expectPositiveWeights(SKIN_FLAVORS_WEIGHTED);
  });

  it('keeps weighted pool totals above zero', () => {
    const totalWeight = HEIGHTS_FEMALE_WEIGHTED.reduce((sum, item) => sum + item.weight, 0);

    expect(totalWeight).toBeGreaterThan(0);
  });

  it('includes female-specific appearance pools', () => {
    expect(BREAST_SIZES.length).toBeGreaterThan(0);
    expect(HIP_WIDTHS.length).toBeGreaterThan(0);
  });

  it('includes male-specific appearance pools', () => {
    expect(CHEST_BUILDS_MALE.length).toBeGreaterThan(0);
  });

  it('keeps sensory pools non-empty', () => {
    expect(BODY_SCENTS.length).toBeGreaterThan(0);
    expect(SKIN_TEXTURES.length).toBeGreaterThan(0);
    expect(SKIN_FLAVORS.length).toBeGreaterThan(0);
  });

  it('uses placeholder variables in backstory templates', () => {
    BACKSTORY_TEMPLATES.forEach((template) => {
      expect(template).toContain('{name}');
      expect(template).toMatch(/\{hometown\}|\{interest\}|\{event\}|\{relationship\}/);
    });
  });

  it('uses placeholder variables in summary templates', () => {
    [SUMMARY_TEMPLATES_FEMALE, SUMMARY_TEMPLATES_MALE, SUMMARY_TEMPLATES_NEUTRAL].forEach(
      (templates) => {
        templates.forEach((template) => {
          expect(template).toContain('{name}');
          expect(template).toMatch(/\{age\}|\{trait1\}|\{trait2\}|\{trait3\}/);
        });
      }
    );
  });
});
