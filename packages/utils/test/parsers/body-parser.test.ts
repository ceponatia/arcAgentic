import {
  containsSensoryKeyword,
  detectSensoryType,
  extractIntensity,
  formatFlavor,
  formatScent,
  formatTexture,
  formatVisual,
  parseFlavor,
  parseScent,
  parseTexture,
  parseVisual,
} from '../../src/parsers/body-parser/index.js';

describe('body parser helpers', () => {
  it('parseScent extracts the primary scent and intensity', () => {
    expect(parseScent('strong musk, floral, vanilla')).toEqual({
      primary: 'musk',
      intensity: 0.8,
      notes: ['floral', 'vanilla'],
    });
  });

  it('parseTexture extracts the texture with temperature and moisture', () => {
    expect(parseTexture('calloused warm damp')).toEqual({
      primary: 'calloused',
      temperature: 'warm',
      moisture: 'damp',
    });
  });

  it('parseVisual extracts the description and features', () => {
    expect(parseVisual('long auburn waves, freckled, slight scar')).toEqual({
      description: 'long auburn waves',
      features: ['freckled', 'slight scar'],
    });
  });

  it('parseFlavor extracts the primary flavor and intensity', () => {
    expect(parseFlavor('strong salty, sweet, metallic')).toEqual({
      primary: 'salty',
      intensity: 0.8,
      notes: ['sweet', 'metallic'],
    });
  });

  it('formatScent converts RegionScent values back to text', () => {
    expect(formatScent({ primary: 'musk', intensity: 0.8, notes: ['floral'] })).toBe(
      'strong, musk, floral'
    );
  });

  it('formatTexture converts RegionTexture values back to text', () => {
    expect(
      formatTexture({
        primary: 'calloused',
        temperature: 'warm',
        moisture: 'damp',
        notes: ['rough'],
      })
    ).toBe('calloused, warm, damp, rough');
  });

  it('formatVisual converts RegionVisual values back to text', () => {
    expect(
      formatVisual({ description: 'long auburn waves', features: ['freckled', 'slight scar'] })
    ).toBe('long auburn waves, freckled, slight scar');
  });

  it('formatFlavor converts RegionFlavor values back to text', () => {
    expect(formatFlavor({ primary: 'salty', intensity: 0.25, notes: ['sweet'] })).toBe(
      'subtle, salty, sweet'
    );
  });

  it('detectSensoryType identifies scent keywords', () => {
    expect(detectSensoryType('she smells the air')).toBe('scent');
  });

  it('detectSensoryType identifies texture keywords', () => {
    expect(detectSensoryType('he is touching the fabric')).toBe('texture');
  });

  it('detectSensoryType returns null for non-sensory text', () => {
    expect(detectSensoryType('walk to the next room')).toBeNull();
  });

  it('extractIntensity returns the intensity and cleaned phrase', () => {
    expect(extractIntensity('strong musky scent')).toEqual({
      intensity: 0.8,
      cleaned: 'musky scent',
    });
  });

  it('containsSensoryKeyword matches suffix variants of base keywords', () => {
    expect(containsSensoryKeyword('she smells the flowers', ['smell'])).toBe(true);
  });
});
