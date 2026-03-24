import { parsePlayerInput } from '../../src/parsers/index.js';

describe('parsePlayerInput', () => {
  it('parses plain text as a speech segment', () => {
    const result = parsePlayerInput('Hello there');

    expect(result).toMatchObject({
      rawInput: 'Hello there',
      segments: [{ id: 'seg-0', type: 'speech', content: 'Hello there', observable: true }],
    });
  });

  it('parses action markers into action segments', () => {
    const result = parsePlayerInput('*waves*');

    expect(result.segments).toMatchObject([
      {
        id: 'seg-0',
        type: 'action',
        content: 'waves',
        observable: true,
        rawMarkers: { prefix: '*', suffix: '*' },
      },
    ]);
  });

  it('parses thought markers into thought segments', () => {
    const result = parsePlayerInput('~keep calm~');

    expect(result.segments).toMatchObject([
      {
        id: 'seg-0',
        type: 'thought',
        content: 'keep calm',
        observable: false,
        rawMarkers: { prefix: '~', suffix: '~' },
      },
    ]);
  });

  it('parses mixed speech, action, and thought content in order', () => {
    const result = parsePlayerInput('Hi *waves* ~stay cool~ bye');

    expect(result.segments).toMatchObject([
      { id: 'seg-0', type: 'speech', content: 'Hi', observable: true },
      {
        id: 'seg-1',
        type: 'action',
        content: 'waves',
        observable: true,
        rawMarkers: { prefix: '*', suffix: '*' },
      },
      {
        id: 'seg-2',
        type: 'thought',
        content: 'stay cool',
        observable: false,
        rawMarkers: { prefix: '~', suffix: '~' },
      },
      { id: 'seg-3', type: 'speech', content: 'bye', observable: true },
    ]);
  });

  it('returns empty segments for empty input', () => {
    expect(parsePlayerInput('').segments).toEqual([]);
  });

  it('handles adjacent markers without creating empty speech segments', () => {
    const result = parsePlayerInput('*wave**nod*');

    expect(result.segments).toMatchObject([
      {
        id: 'seg-0',
        type: 'action',
        content: 'wave',
        observable: true,
        rawMarkers: { prefix: '*', suffix: '*' },
      },
      {
        id: 'seg-1',
        type: 'action',
        content: 'nod',
        observable: true,
        rawMarkers: { prefix: '*', suffix: '*' },
      },
    ]);
  });
});
