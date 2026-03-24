import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpIcon } from '../../../src/components/feedback/HelpIcon.js';

describe('HelpIcon', () => {
  it('renders the help icon button', () => {
    render(<HelpIcon tooltip="Helpful text" />);

    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('shows and hides the tooltip on hover', () => {
    render(<HelpIcon tooltip="Hover help" />);

    const button = screen.getByRole('button', { name: 'Help' });
    fireEvent.mouseEnter(button);
    expect(screen.getByText('Hover help')).toBeInTheDocument();

    fireEvent.mouseLeave(button);
    expect(screen.queryByText('Hover help')).not.toBeInTheDocument();
  });

  it('shows the tooltip on focus and includes the doc link prompt when provided', () => {
    render(<HelpIcon tooltip="Focused help" docLink="docs/guide" />);

    const button = screen.getByRole('button', { name: 'Help' });
    fireEvent.focus(button);

    expect(screen.getByText('Focused help')).toBeInTheDocument();
    expect(screen.getByText('Click to learn more →')).toBeInTheDocument();
  });

  it('renders different size variants', () => {
    const { rerender } = render(<HelpIcon tooltip="Small help" size="sm" />);
    const smallButton = screen.getByRole('button', { name: 'Help' });
    const smallClassName = smallButton.className;

    rerender(<HelpIcon tooltip="Medium help" size="md" />);
    const mediumButton = screen.getByRole('button', { name: 'Help' });

    expect(mediumButton.className).not.toBe(smallClassName);
  });
});
