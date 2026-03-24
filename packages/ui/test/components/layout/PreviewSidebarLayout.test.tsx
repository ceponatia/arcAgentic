import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PreviewSidebarLayout } from '../../../src/components/layout/PreviewSidebarLayout.js';

describe('PreviewSidebarLayout', () => {
  it('renders the preview title and children content', () => {
    render(
      <PreviewSidebarLayout onSave={vi.fn()}>
        <p>Preview body</p>
      </PreviewSidebarLayout>
    );

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Preview body')).toBeInTheDocument();
  });

  it('supports a custom preview title', () => {
    render(
      <PreviewSidebarLayout title="Character Preview" onSave={vi.fn()}>
        <p>Character sheet</p>
      </PreviewSidebarLayout>
    );

    expect(screen.getByText('Character Preview')).toBeInTheDocument();
  });

  it('passes action props through to the embedded BuilderActionPanel', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <PreviewSidebarLayout
        onSave={onSave}
        onCancel={onCancel}
        saveLabel="Commit"
        closeLabel="Dismiss"
        success="Ready"
      >
        <p>Body</p>
      </PreviewSidebarLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Commit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });
});
