import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionsPanel } from '../../../src/components/data-display/SessionsPanel.js';
import type { SessionsPanelProps } from '../../../src/components/data-display/types.js';

const sessions: SessionsPanelProps['sessions'] = [
  {
    id: 'session-1',
    characterName: 'Aela',
    settingName: 'Northwood',
    createdAt: '2026-03-24T12:00:00.000Z',
  },
  {
    id: 'session-2',
    characterName: 'Borin',
    settingName: 'Irondeep',
    createdAt: '2026-03-24T13:00:00.000Z',
  },
];

const createProps = (overrides: Partial<SessionsPanelProps> = {}): SessionsPanelProps => ({
  sessions,
  loading: false,
  error: null,
  activeId: null,
  onSelect: vi.fn(),
  onRetry: vi.fn(),
  onDelete: vi.fn(),
  ...overrides,
});

describe('SessionsPanel', () => {
  it('renders the sessions list', () => {
    render(<SessionsPanel {...createProps()} />);

    expect(screen.getByText('Aela')).toBeInTheDocument();
    expect(screen.getByText('Northwood')).toBeInTheDocument();
    expect(screen.getByText('Borin')).toBeInTheDocument();
  });

  it('shows an empty state when there are no sessions', () => {
    render(<SessionsPanel {...createProps({ sessions: [] })} />);

    expect(screen.getByText('No sessions yet.')).toBeInTheDocument();
  });

  it('distinguishes the active session and calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<SessionsPanel {...createProps({ activeId: 'session-1', onSelect })} />);

    const activeItem = screen.getByText('Aela').closest('[role="button"]');
    const inactiveItem = screen.getByText('Borin').closest('[role="button"]');

    fireEvent.click(activeItem!);

    expect(onSelect).toHaveBeenCalledWith('session-1');
    expect(activeItem?.className).not.toBe(inactiveItem?.className);
  });

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<SessionsPanel {...createProps({ onDelete })} />);

    fireEvent.click(screen.getAllByTitle('Delete session')[0]!);

    expect(onDelete).toHaveBeenCalledWith('session-1');
  });

  it('shows loading and error states', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<SessionsPanel {...createProps({ loading: true })} />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();

    rerender(<SessionsPanel {...createProps({ loading: false, error: 'Retry later', onRetry })} />);

    expect(screen.getByText('Failed to load: Retry later')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
