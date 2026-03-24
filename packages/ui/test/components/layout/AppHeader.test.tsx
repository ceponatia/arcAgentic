import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppHeader } from '../../../src/components/layout/AppHeader.js';

describe('AppHeader', () => {
  it('renders the title', () => {
    render(<AppHeader />);

    expect(screen.getByText('Minimal RPG')).toBeInTheDocument();
  });

  it('shows character and setting names when a session is active', () => {
    render(<AppHeader hasSession characterName="Aela" settingName="Northwood" />);

    expect(screen.getByText('Aela')).toBeInTheDocument();
    expect(screen.getByText('Northwood')).toBeInTheDocument();
  });

  it('shows the no-session message when there is no active session', () => {
    render(<AppHeader hasSession={false} />);

    expect(screen.getByText('No session selected')).toBeInTheDocument();
  });
});
