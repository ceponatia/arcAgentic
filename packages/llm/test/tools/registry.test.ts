import { describe, expect, it } from 'vitest';
import type { ToolDefinition } from '@arcagentic/schemas';
import { ToolRegistry } from '../../src/tools/registry.js';
import { GET_SENSORY_DETAIL_TOOL } from '../../src/tools/definitions/core/get-sensory-detail.js';

function createTool(name: string): ToolDefinition {
  return {
    type: 'function',
    function: {
      name,
      description: `Tool ${name}`,
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'The target id.',
          },
        },
        required: ['target'],
      },
    },
  };
}

describe('ToolRegistry', () => {
  it('register adds a tool by name and getTool retrieves it', () => {
    const registry = new ToolRegistry();
    const tool = createTool('lookup_target');

    registry.register(tool);

    expect(registry.getTool('lookup_target')).toEqual(tool);
  });

  it('getTool returns undefined for an unknown tool', () => {
    const registry = new ToolRegistry();

    expect(registry.getTool('missing_tool')).toBeUndefined();
  });

  it('getAllTools returns every registered tool', () => {
    const registry = new ToolRegistry();
    const first = createTool('first_tool');
    const second = createTool('second_tool');

    registry.register(first);
    registry.register(second);

    expect(registry.getAllTools()).toEqual([first, second]);
  });

  it('getToolsByNames returns the requested subset in order', () => {
    const registry = new ToolRegistry();
    const first = createTool('first_tool');
    const second = createTool('second_tool');
    const third = createTool('third_tool');

    registry.register(first);
    registry.register(second);
    registry.register(third);

    expect(registry.getToolsByNames(['third_tool', 'first_tool', 'missing_tool'])).toEqual([
      third,
      first,
    ]);
  });

  it('registers real tool definitions with the expected shape', () => {
    const registry = new ToolRegistry();

    registry.register(GET_SENSORY_DETAIL_TOOL);

    expect(registry.getTool('get_sensory_detail')).toMatchObject({
      type: 'function',
      function: {
        name: 'get_sensory_detail',
        description: expect.any(String),
        parameters: {
          type: 'object',
          properties: expect.any(Object),
        },
      },
    });
  });
});
