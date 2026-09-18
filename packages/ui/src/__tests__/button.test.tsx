import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../components/button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Start Test Run</Button>);
    expect(screen.getByRole('button', { name: 'Start Test Run' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run</Button>);
    screen.getByRole('button').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button when the disabled prop is set', () => {
    render(<Button disabled>Run</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
