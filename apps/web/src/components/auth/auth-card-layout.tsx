import { QavioLogo } from '@qavio/ui';

export interface AuthCardLayoutProps {
  children: React.ReactNode;
}

/** Centered single-panel auth shell for Forgot/Reset Password and Check Email. */
export function AuthCardLayout({ children }: AuthCardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <QavioLogo />
      </div>
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  );
}
