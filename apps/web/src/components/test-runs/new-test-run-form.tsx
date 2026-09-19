'use client';

import type { Environment, Project, TestRunType } from '@qavio/types';
import { Eye, Play, Shield, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

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
import { createTestRun } from '@/app/(dashboard)/test-runs/actions';
import { TestTypeOption } from './test-type-option';

type Coverage = 'smart' | 'pages' | 'custom';

/** Only `functional` has a real worker in this phase (see @qavio/types' TestRunType) — the other three are shown so the run-type picker reads as the full product, but stay disabled rather than accepting a selection nothing executes. */
const TEST_TYPES: { id: TestRunType; icon: typeof Play; title: string; description: string; available: boolean }[] = [
  {
    id: 'functional',
    icon: Play,
    title: 'Functional Tests',
    description: 'Test user flows and core functionality.',
    available: true,
  },
  {
    id: 'visual',
    icon: Eye,
    title: 'Visual Tests',
    description: 'Compare with Figma designs or reference screenshots.',
    available: false,
  },
  {
    id: 'responsive',
    icon: Smartphone,
    title: 'Responsive Tests',
    description: 'Test across devices and screen sizes.',
    available: false,
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security Tests',
    description: 'Scan for vulnerabilities (OWASP, API, etc).',
    available: false,
  },
];

const TEST_TYPE_LABEL: Record<TestRunType, string> = {
  functional: 'Functional',
  visual: 'Visual',
  responsive: 'Responsive',
  security: 'Security',
};

export interface NewTestRunFormProps {
  projects: Project[];
  environments: Environment[];
}

export function NewTestRunForm({ projects, environments }: NewTestRunFormProps) {
  const router = useRouter();
  const [testType, setTestType] = useState<TestRunType>('functional');
  const [coverage, setCoverage] = useState<Coverage>('smart');
  const [instructions, setInstructions] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [environmentId, setEnvironmentId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const environmentsForProject = useMemo(
    () => environments.filter((environment) => environment.projectId === projectId),
    [environments, projectId],
  );

  const selectedProject = projects.find((project) => project.id === projectId);
  const selectedEnvironment = environmentsForProject.find((environment) => environment.id === environmentId);

  const canSubmit = Boolean(projectId && environmentId) && !isSubmitting;

  async function handleStart() {
    if (!projectId || !environmentId) return;

    setIsSubmitting(true);
    const result = await createTestRun({ projectId, environmentId, type: testType });
    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Test run started.');
    // No router.refresh() here: this is a brand-new dynamic route the
    // client has never visited, so router.push already fetches its RSC
    // payload fresh — there's no stale cache to bust. Calling refresh()
    // immediately afterward instead raced that in-flight navigation
    // against a refresh of the *previous* route, which is what actually
    // produced "Couldn't load this test run" right after starting a run
    // (a client-side router-reducer race, not a server error — see
    // docs/test-run-engine.md's Realtime section and commit 442fcd0's own
    // writeup of the same error surfacing from a different cause).
    router.push(`/test-runs/${result.data.testRunId}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-foreground">
            1. Select Project &amp; Environment
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="test-run-project">Project</Label>
              <ProjectSelector
                id="test-run-project"
                projects={projects}
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                  setEnvironmentId(undefined);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="test-run-environment">Environment</Label>
              <EnvironmentSelector
                id="test-run-environment"
                environments={environmentsForProject}
                value={environmentId}
                onValueChange={setEnvironmentId}
                disabled={!projectId}
              />
            </div>
          </div>
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              You need at least one project with an environment before you can start a run.{' '}
              <Link href="/projects" className="font-medium text-primary hover:underline">
                Create a project
              </Link>
              .
            </p>
          ) : null}
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
                recommended={option.id === 'functional'}
                disabled={!option.available}
                onSelect={() => {
                  if (option.available) setTestType(option.id);
                }}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-foreground">3. Configure Test Settings</h2>
          <div className="space-y-1.5">
            <Label htmlFor="app-url">Application URL</Label>
            <Input
              id="app-url"
              placeholder="https://staging.your-app.com"
              value={selectedEnvironment?.baseUrl ?? ''}
              disabled
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              {selectedEnvironment ? "From the selected environment's base URL." : 'Select an environment above to set this.'}
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
            <p className="text-xs text-muted-foreground">
              Coverage selection doesn&apos;t affect execution yet — this run always performs the basic
              functional check described below.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Additional Options</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox disabled />
                <span>
                  <span className="block font-medium">Test mobile responsiveness</span>
                  <span className="block text-xs">Coming soon</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox disabled />
                <span>
                  <span className="block font-medium">Generate AI bug report</span>
                  <span className="block text-xs">Coming soon</span>
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

        <div className="flex items-center justify-end rounded-lg border bg-muted/40 p-4">
          <Button disabled={!canSubmit} onClick={handleStart}>
            {isSubmitting ? 'Starting…' : 'Start Test Run'}
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Test Run Summary</h3>
          <PropertyList
            items={[
              { label: 'Project', value: selectedProject?.name ?? 'Not selected' },
              { label: 'Environment', value: selectedEnvironment?.name ?? 'Not selected' },
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
