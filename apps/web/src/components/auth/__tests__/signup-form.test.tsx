import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.hoisted(() => vi.fn());
const mockSignUp = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/(auth)/actions', () => ({
  signUp: mockSignUp,
}));

const { SignupForm } = await import('../signup-form');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SignupForm', () => {
  it('shows validation errors instead of calling the server action', async () => {
    render(<SignupForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('flags mismatched passwords without calling the server action', async () => {
    render(<SignupForm />);
    await userEvent.type(screen.getByLabelText('Full name'), 'Jane Smith');
    await userEvent.type(screen.getByLabelText('Work email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'somethingelse');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('redirects to the check-email screen on success', async () => {
    mockSignUp.mockResolvedValue({ ok: true, data: undefined });
    render(<SignupForm />);

    await userEvent.type(screen.getByLabelText('Full name'), 'Jane Smith');
    await userEvent.type(screen.getByLabelText('Work email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/check-email?type=signup&email=jane%40example.com'),
      );
    });
  });

  it('surfaces a server-reported error (e.g. rate limit) without navigating', async () => {
    mockSignUp.mockResolvedValue({ ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' });
    render(<SignupForm />);

    await userEvent.type(screen.getByLabelText('Full name'), 'Jane Smith');
    await userEvent.type(screen.getByLabelText('Work email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
