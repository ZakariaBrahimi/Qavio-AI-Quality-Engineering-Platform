import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ComingSoon } from '../coming-soon';

describe('ComingSoon', () => {
  it('renders the title with a coming soon suffix and the description', () => {
    render(<ComingSoon title="Projects" description="Ships with the MVP." />);
    expect(screen.getByText('Projects — coming soon')).toBeInTheDocument();
    expect(screen.getByText('Ships with the MVP.')).toBeInTheDocument();
  });
});
