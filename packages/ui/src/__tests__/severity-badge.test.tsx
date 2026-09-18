import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SeverityBadge } from '../components/severity-badge';

describe('SeverityBadge', () => {
  it('renders the label for each severity', () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});
