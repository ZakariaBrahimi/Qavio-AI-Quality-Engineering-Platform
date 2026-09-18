import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '../components/status-badge';

describe('StatusBadge', () => {
  it('renders the label for a passed status', () => {
    render(<StatusBadge status="passed" />);
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('renders the label for a failed status', () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
