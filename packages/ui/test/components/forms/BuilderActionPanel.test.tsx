import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BuilderActionPanel } from '../../../src/components/forms/BuilderActionPanel.js';
import type { BuilderActionPanelProps } from '../../../src/components/forms/types.js';

const createProps = (
  overrides: Partial<BuilderActionPanelProps> = {}
): BuilderActionPanelProps => ({
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  disabled: false,
  saving: false,
  isInEditMode: true,
  isEditing: true,
  error: null,
  loadError: null,
  success: null,
  itemName: 'Map draft',
  ...overrides,
});

describe('BuilderActionPanel', () => {
  it('shows the save button in edit mode and calls onSave', () => {
    const onSave = vi.fn();
    render(<BuilderActionPanel {...createProps({ onSave })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows the edit button in view mode and calls onEdit', () => {
    const onEdit = vi.fn();
    render(
      <BuilderActionPanel
        {...createProps({
          isEditing: true,
          isInEditMode: false,
          onEdit,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('opens the delete confirmation modal and confirms deletion', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<BuilderActionPanel {...createProps({ onDelete })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the saving, error, and success states', () => {
    render(
      <BuilderActionPanel
        {...createProps({
          saving: true,
          error: 'Save failed',
          success: 'Saved successfully',
        })}
      />
    );

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeInTheDocument();
    expect(screen.getByText('Error: Save failed')).toBeInTheDocument();
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('disables action buttons when disabled is true', () => {
    const onSave = vi.fn();
    render(<BuilderActionPanel {...createProps({ disabled: true, onSave })} />);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    const closeButton = screen.getByRole('button', { name: 'Close' });

    expect(saveButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(closeButton).toBeDisabled();
  });
});
