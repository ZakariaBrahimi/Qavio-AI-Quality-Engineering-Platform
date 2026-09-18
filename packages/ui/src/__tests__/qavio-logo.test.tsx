import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QavioLogo } from '../components/qavio-logo';

describe('QavioLogo', () => {
  it('renders the wordmark by default', () => {
    render(<QavioLogo />);
    expect(screen.getByText('Qavio')).toBeInTheDocument();
  });

  it('omits the wordmark for the icon variant', () => {
    render(<QavioLogo variant="icon" />);
    expect(screen.queryByText('Qavio')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Qavio' })).toBeInTheDocument();
  });
});
