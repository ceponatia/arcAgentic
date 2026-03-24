import { describe, expect, it } from 'vitest';
import type { CharacterProfile } from '@arcagentic/schemas';

import { DiscoveryGuide } from '../../src/studio-npc/discovery.js';

describe('DiscoveryGuide', () => {
  it('infers the values topic from a values-oriented question', () => {
    const guide = new DiscoveryGuide({ profile: {} });

    expect(guide.inferTopicFromMessage('What are your values?')).toBe('values');
  });

  it('infers the fears topic from a fear-oriented question', () => {
    const guide = new DiscoveryGuide({ profile: {} });

    expect(guide.inferTopicFromMessage('Tell me about your fears.')).toBe('fears');
  });

  it('infers the backstory topic from a past-oriented question', () => {
    const guide = new DiscoveryGuide({ profile: {} });

    expect(guide.inferTopicFromMessage("What's your backstory?")).toBe('backstory');
  });

  it('returns null when no discovery topic matches the message', () => {
    const guide = new DiscoveryGuide({ profile: {} });

    expect(guide.inferTopicFromMessage('What is your favorite weather?')).toBeNull();
  });

  it('generates non-empty prompts for a known topic', () => {
    const guide = new DiscoveryGuide({ profile: {} });
    const prompts = guide.generatePrompts('values', 2);

    expect(prompts).toHaveLength(2);
    expect(prompts.every(prompt => prompt.topic === 'values')).toBe(true);
    expect(prompts.every(prompt => prompt.prompt.length > 0)).toBe(true);
  });

  it('includes a rationale when generating prompts for a topic', () => {
    const guide = new DiscoveryGuide({ profile: {} });
    const [prompt] = guide.generatePrompts('communication-style', 1);

    expect(prompt).toEqual(
      expect.objectContaining({
        topic: 'communication-style',
        rationale: 'Speech patterns make dialogue authentic',
      })
    );
  });

  it('tracks explored topics and excludes them from unexplored topics', () => {
    const guide = new DiscoveryGuide({ profile: {} });
    guide.markExplored('values');
    guide.markExplored('fears');

    expect(guide.getExploredTopics()).toEqual(['values', 'fears']);
    expect(guide.getUnexploredTopics()).not.toContain('values');
    expect(guide.getUnexploredTopics()).not.toContain('fears');
  });

  it('clears explored topics', () => {
    const guide = new DiscoveryGuide({ profile: {} });
    guide.markExplored('backstory');

    guide.clear();

    expect(guide.getExploredTopics()).toEqual([]);
    expect(guide.getUnexploredTopics()).toContain('backstory');
  });

  it('suggests the next topic based on current profile gaps', () => {
    const guide = new DiscoveryGuide({
      profile: {
        personalityMap: {
          values: ['loyalty'],
        },
      } as Partial<CharacterProfile>,
    });

    expect(guide.suggestTopic()).toBe('fears');
  });

  it('updates the profile used for topic suggestions', () => {
    const guide = new DiscoveryGuide({
      profile: {
        personalityMap: {
          values: ['loyalty'],
        },
      } as Partial<CharacterProfile>,
    });

    guide.updateProfile({
      personalityMap: {
        values: ['loyalty'],
        fears: ['abandonment'],
      },
    } as Partial<CharacterProfile>);

    expect(guide.suggestTopic()).toBe('relationships');
  });

  it('generates mixed prompts from unexplored topics only', () => {
    const guide = new DiscoveryGuide({ profile: {} });
    guide.markExplored('values');

    const prompts = guide.generateMixedPrompts(3);

    expect(prompts).toHaveLength(3);
    expect(prompts.every(prompt => prompt.topic !== 'values')).toBe(true);
  });
});
