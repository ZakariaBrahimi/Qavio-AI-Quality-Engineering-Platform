import { ComingSoon } from '@/components/shell/coming-soon';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Projects' };

export default function ProjectsPage() {
  return (
    <ComingSoon
      title="Projects"
      description="Creating and connecting web, mobile, and API projects ships with the Web Functional QA MVP."
    />
  );
}
