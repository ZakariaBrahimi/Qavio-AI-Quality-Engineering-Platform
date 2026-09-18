import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.hoisted(() => vi.fn());
const mockSignIn = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/(auth)/actions', () => ({
  signIn: mockSignIn,
}));

const { LoginForm } = await import('../login-form');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginForm', () => {
  it('shows validation errors for empty required fields', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows the server-provided error without navigating on failure', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid email or password.' });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email address'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to /dashboard on success', async () => {
    mockSignIn.mockResolvedValue({ ok: true, data: undefined });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email address'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
