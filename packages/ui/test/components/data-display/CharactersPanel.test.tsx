import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CharactersPanel } from '../../../src/components/data-display/CharactersPanel.js';
import type { CharactersPanelProps } from '../../../src/components/data-display/types.js';

const characters: NonNullable<CharactersPanelProps['characters']> = [
  { id: 'char-1', name: 'Aela', summary: 'Scout and ranger', tags: ['stealth', 'bow'] },
  { id: 'char-2', name: 'Borin', summary: 'Shield bearer', tags: ['tank'] },
];

const createProps = (overrides: Partial<CharactersPanelProps> = {}): CharactersPanelProps => ({
  selectedId: null,
  onSelect: vi.fn(),
  onEdit: vi.fn(),
  characters,
  loading: false,
  error: null,
  onRefresh: vi.fn(),
  ...overrides,
});

describe('CharactersPanel', () => {
  it('renders characters with names, summaries, and tags', () => {
    render(<CharactersPanel {...createProps()} />);

    expect(screen.getByText('Aela')).toBeInTheDocument();
    expect(screen.getByText('Scout and ranger')).toBeInTheDocument();
    expect(screen.getByText('stealth, bow')).toBeInTheDocument();
    expect(screen.getByText('Borin')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    render(<CharactersPanel {...createProps({ loading: true })} />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows an error and calls onRefresh from the retry button', () => {
    const onRefresh = vi.fn();
    render(<CharactersPanel {...createProps({ error: 'Network down', onRefresh })} />);

    expect(screen.getByText('Failed to load: Network down')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when a character is clicked and distinguishes the selected character', () => {
    const onSelect = vi.fn();
    render(<CharactersPanel {...createProps({ selectedId: 'char-1', onSelect })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Aela' }));
    expect(onSelect).toHaveBeenCalledWith('char-1');

    const selectedItem = screen.getByRole('button', { name: 'Aela' }).closest('li');
    const unselectedItem = screen.getByRole('button', { name: 'Borin' }).closest('li');

    expect(selectedItem?.className).not.toBe(unselectedItem?.className);
  });

  it('calls onEdit when the edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<CharactersPanel {...createProps({ onEdit })} />);

    fireEvent.click(screen.getAllByTitle('Edit character')[0]!);

    expect(onEdit).toHaveBeenCalledWith('char-1');
  });

  it('handles an empty character list gracefully', () => {
    render(<CharactersPanel {...createProps({ characters: [] })} />);

    expect(screen.getByText('No characters available.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Character Builder' })).toBeInTheDocument();
  });
});
