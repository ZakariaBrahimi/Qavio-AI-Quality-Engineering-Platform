import type { Id, Timestamp } from './common';

export type TestCasePriority = 'low' | 'medium' | 'high';

/** One step of a TestCase's script — deliberately loose (see TestCase.steps). */
export interface TestCaseStep {
  action: string;
  target?: string;
  value?: string;
  expected?: string;
}

export interface TestCase {
  id: Id;
  organizationId: Id;
  projectId: Id;
  testSuiteId: Id;
  title: string;
  description: string | null;
  /** Genuinely dynamic — an ordered script whose shape varies by action type. */
  steps: TestCaseStep[];
  expectedResult: string | null;
  priority: TestCasePriority;
  tags: string[];
  isActive: boolean;
  createdBy: Id | null;
  createdAt: Timestamp;
}
