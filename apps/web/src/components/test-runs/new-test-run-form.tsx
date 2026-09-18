'use client';

import {
  AlertTriangle,
  Eye,
  Play,
  Settings as SettingsIcon,
  Shield,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
  Button,
  Checkbox,
  Input,
  Label,
  PropertyList,
  Textarea,
  toast,
} from '@qavio/ui';

import { AIInsightCard } from '@/components/ai/ai-insight-card';
import { EnvironmentSelector } from '@/components/forms/environment-selector';
import { ProjectSelector } from '@/components/forms/project-selector';
import { TestTypeOption } from './test-type-option';

type TestType = 'full' | 'functional' | 'visual' | 'responsive' | 'security' | 'custom';
type Coverage = 'smart' | 'pages' | 'custom';

const TEST_TYPES: { id: TestType; icon: typeof Sparkles; title: string; description: string }[] = [
  {
    id: 'full',
    icon: Sparkles,
    title: 'Full QA Run',
    description: 'Functional, visual, responsive, and security testing.',
  },
  {
    id: 'functional',
    icon: Play,
    title: 'Functional Tests',
    description: 'Test user flows and core functionality.',
  },
  {
    id: 'visual',
    icon: Eye,
    title: 'Visual Tests',
    description: 'Compare with Figma designs or reference screenshots.',
  },
  {
    id: 'responsive',
    icon: Smartphone,
    title: 'Responsive Tests',
    description: 'Test across devices and screen sizes.',
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security Tests',
    description: 'Scan for vulnerabilities (OWASP, API, etc).',
  },
  {
    id: 'custom',
    icon: SettingsIcon,
    title: 'Custom Test',
    description: 'Configure your own test suite and instructions.',
  },
];

const TEST_TYPE_LABEL: Record<TestType, string> = {
  full: 'Full QA Run',
  functional: 'Functional',
  visual: 'Visual',
  responsive: 'Responsive',
  security: 'Security',
  custom: 'Custom',
};

/**
 * There is no project or environment backend wired up yet, so this form
 * is always empty and Start Test Run stays disabled — the wizard is real,
 * queueing a run is not, until workers/web + the queue are connected.
 */
export function NewTestRunForm() {
  const [testType, setTestType] = useState<TestType>('full');
  const [coverage, setCoverage] = useState<Coverage>('smart');
  const [instructions, setInstructions] = useState('');

  const canSubmit = false; // No project exists to run against yet.

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-foreground">
            1. Select Project &amp; Environment
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <ProjectSelector projects={[]} />
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <EnvironmentSelector environments={[]} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            You need at least one project with an environment before you can start a run.{' '}
            <Link href="/projects" className="font-medium text-primary hover:underline">
              Create a project
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4 rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-foreground">2. What do you want to test?</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEST_TYPES.map((option) => (
              <TestTypeOption
                key={option.id}
                icon={option.icon}
                title={option.title}
                description={option.description}
                selected={testType === option.id}
                recommended={option.id === 'full'}
                onSelect={() => setTestType(option.id)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-foreground">3. Configure Test Settings</h2>
          <div className="space-y-1.5">
            <Label htmlFor="app-url">Application URL</Label>
            <Input id="app-url" placeholder="https://staging.your-app.com" disabled />
            <p className="text-xs text-muted-foreground">
              Set once your project has an environment configured.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Test Coverage</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { id: 'smart', title: 'Smart (Recommended)', description: 'AI selects the most important pages and flows.' },
                  { id: 'pages', title: 'Pages', description: "Select specific pages to test (you'll choose after)." },
                  { id: 'custom', title: 'Custom', description: 'Define exact test cases (advanced).' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCoverage(option.id)}
                  aria-pressed={coverage === option.id}
                  className={
                    coverage === option.id
                      ? 'rounded-lg border border-primary bg-primary/5 p-3 text-left text-sm'
                      : 'rounded-lg border p-3 text-left text-sm hover:bg-accent'
                  }
                >
                  <p className="font-medium text-foreground">{option.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Options</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox defaultChecked />
                <span>
                  <span className="block font-medium text-foreground">Test mobile responsiveness</span>
                  <span className="block text-xs text-muted-foreground">
                    Desktop, tablet, and mobile devices
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox defaultChecked />
                <span>
                  <span className="block font-medium text-foreground">Generate AI bug report</span>
                  <span className="block text-xs text-muted-foreground">
                    Get detailed analysis and suggested fixes
                  </span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-foreground">4. (Optional) Add Instructions</h2>
          <Textarea
            placeholder="e.g. Focus on the checkout flow, test with invalid inputs, check error handling…"
            maxLength={1000}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">{instructions.length} / 1000</p>
        </section>

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Connect a project to start a test run.
          </p>
          <Button
            disabled={!canSubmit}
            onClick={() => toast.info('Queueing test runs is not connected yet.')}
          >
            Start Test Run
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Test Run Summary</h3>
          <PropertyList
            items={[
              { label: 'Project', value: 'Not selected' },
              { label: 'Environment', value: 'Not selected' },
              { label: 'Test Type', value: TEST_TYPE_LABEL[testType] },
              { label: 'Coverage', value: coverage === 'smart' ? 'Smart' : coverage === 'pages' ? 'Pages' : 'Custom' },
            ]}
          />
        </div>

        <AIInsightCard
          title="AI-assisted exploration"
          description="Once connected, Qavio's agent will explore your app, run the selected checks, and create a detailed report."
        />
      </aside>
    </div>
  );
}
