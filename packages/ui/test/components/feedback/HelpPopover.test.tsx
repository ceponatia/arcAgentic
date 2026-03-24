import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpPopover } from '../../../src/components/feedback/HelpPopover.js';

describe('HelpPopover', () => {
  it('opens on trigger click and renders the title and content', () => {
    render(
      <HelpPopover title="Popover title">
        <p>Popover content</p>
      </HelpPopover>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    expect(screen.getByText('Popover title')).toBeInTheDocument();
    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });

  it('closes when the close button is clicked', () => {
    render(
      <HelpPopover title="Closable popover">
        <p>Body</p>
      </HelpPopover>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('Closable popover')).not.toBeInTheDocument();
  });

  it('shows the documentation link when provided', () => {
    render(
      <HelpPopover title="Docs" docLink="docs/page">
        <p>Body</p>
      </HelpPopover>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    expect(screen.getByRole('link', { name: 'Read full documentation' })).toHaveAttribute(
      'href',
      '#/docs/page'
    );
  });
});
