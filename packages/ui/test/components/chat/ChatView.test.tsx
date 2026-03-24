import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatView } from '../../../src/components/chat/ChatView.js';
import type { ChatViewProps } from '../../../src/components/chat/types.js';

const baseMessages: ChatViewProps['messages'] = [
  { role: 'user', content: 'Hello there' },
  {
    role: 'assistant',
    content: 'Welcome back',
    speaker: {
      id: 'speaker-1',
      name: 'Guide',
      profilePic: 'https://example.com/guide.png',
      description: 'Helpful guide',
    },
  },
];

const createProps = (overrides: Partial<ChatViewProps> = {}): ChatViewProps => ({
  messages: baseMessages,
  loading: false,
  error: null,
  draft: 'Draft message',
  sending: false,
  disabled: false,
  editingIdx: null,
  editDraft: '',
  onDraftChange: vi.fn(),
  onSend: vi.fn(),
  onStartEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onSaveEdit: vi.fn(),
  onDeleteMessage: vi.fn(),
  onRedo: vi.fn(),
  autoScroll: false,
  ...overrides,
});

describe('ChatView', () => {
  it('renders messages with assistant speaker name and avatar', () => {
    render(<ChatView {...createProps()} />);

    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Guide')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Guide' })).toHaveAttribute(
      'src',
      'https://example.com/guide.png'
    );
  });

  it('controls the draft input and calls onDraftChange on input changes', () => {
    const onDraftChange = vi.fn();
    render(<ChatView {...createProps({ draft: 'Typed text', onDraftChange })} />);

    const input = screen.getByPlaceholderText('Type a message...');

    expect(input).toHaveValue('Typed text');
    fireEvent.change(input, { target: { value: 'Updated text' } });

    expect(onDraftChange).toHaveBeenCalledWith('Updated text');
  });

  it('calls onSend when the send button is clicked', () => {
    const onSend = vi.fn();
    render(<ChatView {...createProps({ onSend })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('disables the send button when the draft is empty or the view is disabled', () => {
    const { rerender } = render(<ChatView {...createProps({ draft: '   ' })} />);

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    rerender(<ChatView {...createProps({ draft: 'Ready', disabled: true })} />);

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('shows loading and error states', () => {
    const { rerender } = render(<ChatView {...createProps({ loading: true })} />);

    expect(screen.getByText('Loading session…')).toBeInTheDocument();

    rerender(<ChatView {...createProps({ error: 'Something broke' })} />);

    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('shows edit mode and fires edit callbacks', () => {
    const onStartEdit = vi.fn();
    const onSaveEdit = vi.fn();
    const onCancelEdit = vi.fn();
    const onDeleteMessage = vi.fn();
    const { rerender } = render(
      <ChatView
        {...createProps({
          onStartEdit,
          onSaveEdit,
          onCancelEdit,
          onDeleteMessage,
        })}
      />
    );

    fireEvent.click(screen.getAllByTitle('Edit message')[0]!);
    expect(onStartEdit).toHaveBeenCalledWith(0, 'Hello there');

    rerender(
      <ChatView
        {...createProps({
          editingIdx: 0,
          editDraft: 'Edited message',
          onStartEdit,
          onSaveEdit,
          onCancelEdit,
          onDeleteMessage,
        })}
      />
    );

    expect(screen.getByDisplayValue('Edited message')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveEdit).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancelEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDeleteMessage).toHaveBeenCalledWith(0);
  });
});
