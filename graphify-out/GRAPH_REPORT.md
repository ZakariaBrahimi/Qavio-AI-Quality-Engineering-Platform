# Graph Report - Qavio-AI-Quality-Engineering-Platform  (2026-09-19)

## Corpus Check
- 368 files · ~90,386 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 7, .css 2, .example 1)

## Summary
- 2130 nodes · 4777 edges · 149 communities (111 shown, 38 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Environment & Integration Dialogs
- Dashboard List Pages
- Root Package Manifest
- Environment CRUD Dialogs
- Worker Package Dependencies
- API App Manifest
- Auth Middleware
- Dashboard Error Boundaries
- Settings & Activity Feed
- Auth & Onboarding Forms
- Auth Flow Pages
- Team Management Actions
- Environment & Project Selectors
- Web App Manifest
- Auth Component Tests
- Queue Producer/Consumer
- Core Schema Migration
- QA Fixture Manifest
- Queue Package Manifest
- TestExecutor Interface & Placeholder
- UI Package Manifest
- Test Model Migration
- Dashboard & Reports Pages
- Project Environment Actions
- Project Pages
- Database Package Manifest
- ESLint Config Package
- Notifications & Audit Migration
- Test Run & Issue Detail Pages
- Playwright Browser Manager & Executor
- Types Package Manifest
- Organization Switching & Auth Callback
- Project CRUD Actions
- Issue Status & Detail
- Turborepo Pipeline Config
- Reset Password & Dashboard Layout
- Environment Dialog & Header Menus
- SSRF Route Guard & Target Validation
- Config Package Manifest
- Next.js TSConfig Base
- Root TSConfig
- Testing Package Manifest
- Page Check Modules
- Worker Entrypoint & Test Run Status
- AI Package Manifest (placeholder)
- Integrations Package Manifest (placeholder)
- Web App Dev Dependencies
- Dashboard Loading States
- Issues Schema Migration
- AI Insight Card & Test Run Form
- Worker Repository Layer
- Vitest Configs
- QA Fixture Pages
- Environment List & RBAC Lib
- Authentication Docs
- UI Package Dev Dependencies
- Auth Server Actions
- CI/Conventions Docs & Redis Service
- UI Package Dependencies (Radix)
- Web App Dependencies
- Test Run Actions Tests
- Next.js TSConfig Compiler Options
- AI Analysis & Fix Suggestions Migration
- Issue Card & Project Overview
- Project Tabs & UI Tabs Component
- Test Run Status Panel & State Machine
- Test Run Engine Docs
- Login & Signup Pages
- Project Environment Actions Tests
- Environment Variable Validation
- Architecture Doc Core Concepts
- Phase 7 Completion & Playwright Docs
- Dropdown Menu UI Component
- Integrations Schema Migration
- Component Props Interfaces
- Navigation Sidebar & Nav Items
- Node Library TSConfig
- Prettier Config
- Crawler Link Discovery
- React Library TSConfig
- Invitations Schema Migration
- Credentials Schema Migration
- Web App NPM Scripts
- Root Layout & Toast Component
- Header & Navigation Components
- Test Run Status Panel & Throttled Refresh
- API TSConfig
- QA Fixture TSConfig
- Web App TSConfig
- AI Package TSConfig
- Config Package TSConfig
- Database Package TSConfig
- Integrations Package TSConfig
- Queue Package TSConfig
- Testing Package TSConfig
- Types Package TSConfig
- Worker TSConfig
- Invite Accept Flow
- Test Result Types & Artifacts
- Tooltip UI Component
- UI Package NPM Scripts
- AI Worker Manifest (placeholder)
- Mobile Worker Manifest (placeholder)
- Security Worker Manifest (placeholder)
- Visual Worker Manifest (placeholder)
- API Build TSConfig
- QA Fixture Build TSConfig
- SSRF & Security Docs
- Testing Build TSConfig
- UI Package TSConfig
- Worker Build TSConfig
- Next.js Config
- Tailwind Config
- UI Peer Dependencies
- Next.js Env Types
- AI Package Entry (placeholder)
- Clean-All Script
- Qavio Brand Icon

## God Nodes (most connected - your core abstractions)
1. `cn()` - 108 edges
2. `createClient()` - 77 edges
3. `next` - 62 edges
4. `Id` - 48 edges
5. `Timestamp` - 48 edges
6. `fail()` - 41 edges
7. `getCurrentOrganization()` - 41 edges
8. `ok()` - 38 edges
9. `Button` - 38 edges
10. `hasPermission()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Qavio` --semantically_similar_to--> `pnpm Workspace Packages (apps/*, workers/*, packages/*)`  [INFERRED] [semantically similar]
  README.md → pnpm-workspace.yaml
- `Deterministic Tools Execute Tests; AI Reasons About Results` --semantically_similar_to--> `Deterministic Tools Execute Tests; AI Reasons About Results (governing principle)`  [INFERRED] [semantically similar]
  README.md → docs/architecture.md
- `pnpm Workspace Packages (apps/*, workers/*, packages/*)` --shares_data_with--> `Repository Structure`  [INFERRED]
  pnpm-workspace.yaml → docs/architecture.md
- `IntegrationCardProps` --references--> `Integration`  [EXTRACTED]
  apps/web/src/components/integrations/integration-card.tsx → packages/types/src/integration.ts
- `IssueCardProps` --references--> `Issue`  [EXTRACTED]
  apps/web/src/components/issues/issue-card.tsx → packages/types/src/issue.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three Planes Architecture** — docs_architecture_control_plane, docs_architecture_queue, docs_architecture_execution_plane, docs_architecture_deterministic_ai_principle [EXTRACTED 1.00]
- **Phase 1 Placeholder Workers & Packages** — workers_ai_readme_worker_ai, workers_mobile_readme_worker_mobile, workers_security_readme_worker_security, workers_visual_readme_worker_visual, packages_ai_readme_qavio_ai, packages_integrations_readme_qavio_integrations [INFERRED 0.85]
- **Test Run Execution Pipeline** — docs_test_run_engine_worker_ts, docs_test_run_engine_packages_queue, docs_test_run_engine_test_run_transitions, docs_database_test_run_result_model [EXTRACTED 1.00]

## Communities (149 total, 38 thin omitted)

### Community 0 - "Environment & Integration Dialogs"
Cohesion: 0.07
Nodes (48): metadata, EditEnvironmentDialogProps, EnvironmentSelectorProps, ProjectSelectorProps, IntegrationCard(), EditProjectDialogProps, ProjectEnvironmentFilterProps, ProjectOverviewProps (+40 more)

### Community 1 - "Dashboard List Pages"
Cohesion: 0.09
Nodes (44): metadata, metadata, TestRunsPage(), formatDuration(), TestResultTable(), TestResultTableProps, getEnvironmentNameMap(), getProjectNameMap() (+36 more)

### Community 2 - "Root Package Manifest"
Cohesion: 0.04
Nodes (44): description, devDependencies, eslint, husky, lint-staged, prettier, @qavio/eslint-config, @trivago/prettier-plugin-sort-imports (+36 more)

### Community 3 - "Environment CRUD Dialogs"
Cohesion: 0.13
Nodes (35): schema, Values, schema, Values, EnvironmentFormFields(), schema, Values, schema (+27 more)

### Community 4 - "Worker Package Dependencies"
Cohesion: 0.05
Nodes (41): esbuild, dependencies, bullmq, playwright, @qavio/config, @qavio/database, @qavio/queue, @qavio/types (+33 more)

### Community 5 - "API App Manifest"
Cohesion: 0.06
Nodes (35): dependencies, fastify, @qavio/config, description, devDependencies, @qavio/eslint-config, @qavio/testing, tsx (+27 more)

### Community 6 - "Auth Middleware"
Cohesion: 0.08
Nodes (26): config, isAlwaysAllowedPath(), isPublicAuthPath(), middleware(), PUBLIC_PATHS, mockUpdateSession, createClient(), updateSession() (+18 more)

### Community 7 - "Dashboard Error Boundaries"
Cohesion: 0.10
Nodes (17): AlertProps, AlertTitle, alertVariants, ErrorState(), ErrorStateProps, InputProps, LoadingState(), LoadingStateProps (+9 more)

### Community 8 - "Settings & Activity Feed"
Cohesion: 0.13
Nodes (28): metadata, ACTION_LABEL, ActivityFeed(), ActivityFeedProps, describeAction(), relativeTime(), QualityOverviewProps, SEGMENTS (+20 more)

### Community 9 - "Auth & Onboarding Forms"
Cohesion: 0.16
Nodes (27): CreateOrganizationFormProps, schema, Values, OrganizationSettingsFormProps, schema, Values, ProfileSettingsFormProps, schema (+19 more)

### Community 10 - "Auth Flow Pages"
Cohesion: 0.09
Nodes (20): COPY, metadata, metadata, metadata, metadata, metadata, OnboardingPage(), AuthCardLayout() (+12 more)

### Community 11 - "Team Management Actions"
Cohesion: 0.11
Nodes (27): changeMemberRole(), inviteCallbackUrl(), inviteLinkFor(), inviteMember(), inviteSchema, removeMember(), requireManageMembers(), resendInvitation() (+19 more)

### Community 12 - "Environment & Project Selectors"
Cohesion: 0.16
Nodes (24): EnvironmentFormFieldsProps, EnvironmentFormValues, applyTheme(), resolveTheme(), ThemePreference, ThemePreferenceForm(), handleChange(), packages_types_src_index_environment (+16 more)

### Community 13 - "Web App Manifest"
Cohesion: 0.06
Nodes (31): description, eslint, eslint-config-next, jsdom, lucide-react, @qavio/config, @qavio/database, @qavio/eslint-config (+23 more)

### Community 14 - "Auth Component Tests"
Cohesion: 0.07
Nodes (16): mockPush, mockSignIn, mockPush, mockSignUp, ResizeObserverStub, Severity, SEVERITY_CLASSNAME, SEVERITY_LABEL (+8 more)

### Community 15 - "Queue Producer/Consumer"
Cohesion: 0.15
Nodes (20): getQueueEnv(), enqueueTestRun(), getQueue(), removeQueuedTestRunJob(), createTestRunWorker(), TestRunJobProcessor, TestRunWorkerOptions, withPayloadValidation() (+12 more)

### Community 16 - "Core Schema Migration"
Cohesion: 0.10
Nodes (26): auth, auth.users, environments, environments_set_updated_at, handle_new_user(), has_organization_role(), idx_environments_organization_id, idx_environments_project_id (+18 more)

### Community 17 - "QA Fixture Manifest"
Cohesion: 0.07
Nodes (29): description, devDependencies, @qavio/config, @qavio/eslint-config, @qavio/testing, tsx, @types/node, typescript (+21 more)

### Community 18 - "Queue Package Manifest"
Cohesion: 0.07
Nodes (29): dependencies, bullmq, @qavio/types, zod, description, devDependencies, @qavio/config, @qavio/eslint-config (+21 more)

### Community 19 - "TestExecutor Interface & Placeholder"
Cohesion: 0.11
Nodes (14): TestExecutionResult, TestExecutor, ref_node_crypto, DeterministicTestExecutorOptions, PlaceholderTestExecutor, readDurationMs(), readForceFailure(), sleep() (+6 more)

### Community 20 - "UI Package Manifest"
Cohesion: 0.07
Nodes (28): description, jsdom, lucide-react, @qavio/config, @qavio/eslint-config, @qavio/testing, react, react-dom (+20 more)

### Community 21 - "Test Model Migration"
Cohesion: 0.12
Nodes (28): artifacts, idx_artifacts_organization_id, idx_artifacts_test_result_id, idx_test_cases_organization_id, idx_test_cases_test_suite_id, idx_test_results_organization_id, idx_test_results_status, idx_test_results_test_run_id (+20 more)

### Community 22 - "Dashboard & Reports Pages"
Cohesion: 0.13
Nodes (24): DashboardPage(), metadata, IssuesPage(), formatDuration(), metadata, ReportsPage(), QualityOverview(), getRecentActivity() (+16 more)

### Community 23 - "Project Environment Actions"
Cohesion: 0.18
Nodes (25): archiveEnvironment(), configurationSchema, createEnvironment(), deleteEnvironment(), environmentFieldsSchema, requireManageEnvironments(), restoreEnvironment(), setDefaultEnvironment() (+17 more)

### Community 24 - "Project Pages"
Cohesion: 0.13
Nodes (22): generateMetadata(), ProjectDetailPage(), metadata, ProjectsPage(), NewTestRunPage(), CreateProjectDialog(), ProjectCard(), EnvironmentRow (+14 more)

### Community 25 - "Database Package Manifest"
Cohesion: 0.07
Nodes (26): dependencies, @supabase/ssr, @supabase/supabase-js, description, devDependencies, @qavio/config, @qavio/eslint-config, @qavio/testing (+18 more)

### Community 26 - "ESLint Config Package"
Cohesion: 0.07
Nodes (26): dependencies, eslint-config-next, eslint-config-prettier, eslint-import-resolver-typescript, eslint-plugin-import, eslint-plugin-react, eslint-plugin-react-hooks, @typescript-eslint/eslint-plugin (+18 more)

### Community 27 - "Notifications & Audit Migration"
Cohesion: 0.11
Nodes (25): audit_credential_change(), audit_fix_suggestion_approved(), audit_issue_status_change(), audit_logs, audit_organization_member_role_change(), audit_test_run_cancelled(), credentials_audit_change, fix_suggestions_audit_approved (+17 more)

### Community 28 - "Test Run & Issue Detail Pages"
Cohesion: 0.15
Nodes (23): formatSummaryValue(), generateMetadata(), humanizeSummaryKey(), TestRunDetailsPage(), TEST_RUN_TYPE_LABELS, getArtifactsForResults(), getTestRun(), Breadcrumb (+15 more)

### Community 29 - "Playwright Browser Manager & Executor"
Cohesion: 0.14
Nodes (15): TestExecutionContext, BrowserManagerOptions, withBrowserContext(), clampNumber(), CrawlLimits, crawlSite(), DEFAULT_LIMITS, MAX_LIMITS (+7 more)

### Community 30 - "Types Package Manifest"
Cohesion: 0.08
Nodes (25): dependencies, zod, description, devDependencies, @qavio/config, @qavio/eslint-config, @qavio/testing, typescript (+17 more)

### Community 31 - "Organization Switching & Auth Callback"
Cohesion: 0.17
Nodes (15): switchOrganization(), mockCookieSet, mockMaybeSingle, GET(), createTestRunSchema, testConfigurationSchema, createOrganization(), createOrganizationSchema (+7 more)

### Community 32 - "Project CRUD Actions"
Cohesion: 0.14
Nodes (21): archiveProject(), createProject(), deleteProject(), normalizeDescription(), projectFieldsSchema, requireManageProjects(), restoreProject(), updateProject() (+13 more)

### Community 33 - "Issue Status & Detail"
Cohesion: 0.11
Nodes (21): generateMetadata(), IssueDetailPage(), IssueStatus(), STATUS_CONFIG, EMPTY_ISSUE_COUNTS, getIssue(), getRecentIssues(), IssueCounts (+13 more)

### Community 34 - "Turborepo Pipeline Config"
Cohesion: 0.08
Nodes (23): dependsOn, outputs, cache, cache, persistent, globalDependencies, globalPassThroughEnv, dependsOn (+15 more)

### Community 35 - "Reset Password & Dashboard Layout"
Cohesion: 0.14
Nodes (18): metadata, ResetPasswordPage(), DashboardLayout(), SettingsPage(), metadata, TeamPage(), InvitePage(), ResetPasswordForm() (+10 more)

### Community 36 - "Environment Dialog & Header Menus"
Cohesion: 0.19
Nodes (17): EditEnvironmentDialog(), NotificationsMenuProps, EditProjectDialog(), PLATFORM_ICON, ConfirmDialog(), DropdownMenu, DropdownMenuItem, DropdownMenuSeparator (+9 more)

### Community 37 - "SSRF Route Guard & Target Validation"
Cohesion: 0.14
Nodes (20): RFC-1918, ref_node_dns, installRouteGuard(), isAllowedCrossOrigin(), BLOCKED_HOSTNAME_SUFFIXES, BLOCKED_HOSTNAMES, BLOCKED_IPV4_CIDRS, extractMappedIPv4() (+12 more)

### Community 38 - "Config Package Manifest"
Cohesion: 0.09
Nodes (22): dependencies, zod, description, devDependencies, @qavio/eslint-config, typescript, vitest, files (+14 more)

### Community 39 - "Next.js TSConfig Base"
Cohesion: 0.09
Nodes (22): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+14 more)

### Community 40 - "Root TSConfig"
Cohesion: 0.09
Nodes (22): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+14 more)

### Community 41 - "Testing Package Manifest"
Cohesion: 0.09
Nodes (21): dependencies, vitest, description, devDependencies, @qavio/config, @qavio/eslint-config, typescript, @qavio/config (+13 more)

### Community 42 - "Page Check Modules"
Cohesion: 0.12
Nodes (15): ref_node_http, playwright, PageCheckResult, runBasicPageCheck(), HttpErrorResponse, NetworkFailure, PageCheckArtifact, PageCheckEvidence (+7 more)

### Community 43 - "Worker Entrypoint & Test Run Status"
Cohesion: 0.13
Nodes (15): packages_types_src_index_istestrunfinished, packages_types_src_index_testrunstatus, admin, allowedTestHosts, env, executor, playwrightExecutor, worker (+7 more)

### Community 44 - "AI Package Manifest (placeholder)"
Cohesion: 0.10
Nodes (19): dependencies, @qavio/types, description, devDependencies, @qavio/config, @qavio/eslint-config, typescript, @qavio/config (+11 more)

### Community 45 - "Integrations Package Manifest (placeholder)"
Cohesion: 0.10
Nodes (19): dependencies, @qavio/types, description, devDependencies, @qavio/config, @qavio/eslint-config, typescript, @qavio/config (+11 more)

### Community 46 - "Web App Dev Dependencies"
Cohesion: 0.11
Nodes (19): devDependencies, autoprefixer, eslint, eslint-config-next, jsdom, postcss, @qavio/config, @qavio/eslint-config (+11 more)

### Community 48 - "Issues Schema Migration"
Cohesion: 0.17
Nodes (17): idx_issue_comments_issue_id, idx_issue_comments_organization_id, idx_issues_organization_id, idx_issues_project_id, idx_issues_severity, idx_issues_status, issue_comments, issue_comments_set_updated_at (+9 more)

### Community 49 - "AI Insight Card & Test Run Form"
Cohesion: 0.12
Nodes (15): AIInsightCard(), AIInsightCardProps, EnvironmentSelector(), ProjectSelector(), Coverage, TEST_TYPE_LABEL, TEST_TYPES, TestTypeOption() (+7 more)

### Community 50 - "Worker Repository Layer"
Cohesion: 0.16
Nodes (11): packages_types_src_index_asserttestruntransition, JobRecordUpdate, loadExecutionTarget(), TestRunJobStatus, TestRunRow, TransitionPatch, transitionTestRun(), updateProgress() (+3 more)

### Community 51 - "Vitest Configs"
Cohesion: 0.24
Nodes (6): packages_testing_dist_index, packages_testing_dist_index_basevitestconfig, baseVitestConfig, ref_node_path, ref_vitejs_plugin_react, ref_vitest

### Community 52 - "QA Fixture Pages"
Cohesion: 0.20
Nodes (12): port, ABOUT_PAGE, BROKEN_PAGE, CONSOLE_ERROR_PAGE, CONTACT_PAGE, HOME_PAGE, NETWORK_ERROR_PAGE, NOT_FOUND_PAGE (+4 more)

### Community 53 - "Environment List & RBAC Lib"
Cohesion: 0.17
Nodes (12): CreateEnvironmentDialog(), EnvironmentsList(), EnvironmentsListProps, ALL_ROLES, assignableRoles(), hasRole(), Permission, RANK_GATED (+4 more)

### Community 54 - "Authentication Docs"
Cohesion: 0.16
Nodes (16): Control Plane, Authentication, Organizations & RBAC (doc), Current Organization Resolution, Email Callback Flow (PKCE), RBAC (UI convenience layer), Session Management, Team Management & Invitations, Audit Logging (+8 more)

### Community 55 - "UI Package Dev Dependencies"
Cohesion: 0.12
Nodes (16): devDependencies, jsdom, @qavio/config, @qavio/eslint-config, @qavio/testing, react, react-dom, tailwindcss (+8 more)

### Community 56 - "Auth Server Actions"
Cohesion: 0.31
Nodes (12): callbackUrl(), requestPasswordReset(), signIn(), signOut(), signUp(), updatePassword(), mockAuth, SwitchAccountButton() (+4 more)

### Community 57 - "CI/Conventions Docs & Redis Service"
Cohesion: 0.16
Nodes (15): Redis Service (local dev), Continuous Integration (doc), Turborepo Caching, Coding Conventions (doc), Secrets Handling Convention, TypeScript Conventions, Environment Variables (doc), PLAYWRIGHT_LOCAL_TEST_TARGET_ALLOWLIST (+7 more)

### Community 58 - "UI Package Dependencies (Radix)"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, clsx, lucide-react, @radix-ui/react-checkbox, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-label (+7 more)

### Community 59 - "Web App Dependencies"
Cohesion: 0.14
Nodes (14): dependencies, @hookform/resolvers, lucide-react, next, @qavio/database, @qavio/integrations, @qavio/queue, @qavio/types (+6 more)

### Community 60 - "Test Run Actions Tests"
Cohesion: 0.14
Nodes (12): developerOrg, mockEnqueueTestRun, mockEqCalls, mockFromResults, mockGetCurrentOrganization, mockGetUser, mockInsertCalls, mockRemoveQueuedTestRunJob (+4 more)

### Community 61 - "Next.js TSConfig Compiler Options"
Cohesion: 0.14
Nodes (13): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+5 more)

### Community 62 - "AI Analysis & Fix Suggestions Migration"
Cohesion: 0.24
Nodes (13): ai_analyses, fix_attempts, fix_suggestions, fix_suggestions_set_updated_at, idx_ai_analyses_issue_id, idx_ai_analyses_organization_id, idx_ai_analyses_test_result_id, idx_fix_attempts_fix_suggestion_id (+5 more)

### Community 63 - "Issue Card & Project Overview"
Cohesion: 0.18
Nodes (10): IssueCard(), IssueCardProps, ProjectEnvironmentFilter(), ProjectOverview(), TestRunCard(), packages_types_src_index_issue, packages_types_src_index_testrun, MetricCard() (+2 more)

### Community 64 - "Project Tabs & UI Tabs Component"
Cohesion: 0.19
Nodes (11): ProjectTabs(), ProjectTabsProps, Tabs, TabsContent, TabsList, TabsTrigger, packages_ui_src_index_tabs, packages_ui_src_index_tabscontent (+3 more)

### Community 65 - "Test Run Status Panel & State Machine"
Cohesion: 0.27
Nodes (10): TestRunStatusPanelProps, TestRunRow, assertTestRunTransition(), canTransitionTestRunStatus(), InvalidTestRunTransitionError, isTestRunFinished(), TEST_RUN_TERMINAL_STATUSES, TEST_RUN_TRANSITIONS (+2 more)

### Community 66 - "Test Run Engine Docs"
Cohesion: 0.21
Nodes (13): Queue (Redis + BullMQ), Test Run / Result Model, BullMQ Architecture (packages/queue), Cancellation Mechanism, Idempotency Guarantees, packages/queue, PlaceholderTestExecutor, Retry Strategy (+5 more)

### Community 67 - "Login & Signup Pages"
Cohesion: 0.20
Nodes (7): metadata, metadata, AuthSplitLayout(), AuthSplitLayoutProps, FEATURES, LoginForm(), SignupForm()

### Community 68 - "Project Environment Actions Tests"
Cohesion: 0.17
Nodes (10): adminOrg, developerOrg, mockEqCalls, mockFromResults, mockGetCurrentOrganization, mockGetUser, mockRpc, ownerOrg (+2 more)

### Community 69 - "Environment Variable Validation"
Cohesion: 0.38
Nodes (6): getServerEnv(), createEnv(), publicEnvSchema, queueEnvSchema, serverEnvSchema, workerEnvSchema

### Community 70 - "Architecture Doc Core Concepts"
Cohesion: 0.30
Nodes (12): Architecture (doc), Deterministic Tools Execute Tests; AI Reasons About Results (governing principle), Execution Plane, Future Worker Architecture, Repository Structure, @qavio/ai, @qavio/integrations, Deterministic Tools Execute Tests; AI Reasons About Results (+4 more)

### Community 71 - "Phase 7 Completion & Playwright Docs"
Cohesion: 0.27
Nodes (12): Phase 7 Acceptance Criteria, Phase 7 Completion Checkpoint (doc), Production Deployment (Phase 7), Crawler (BFS, discover-links), Deterministic Functional Checks, Playwright Web QA Engine (doc), PlaywrightTestExecutor, RoutingTestExecutor (+4 more)

### Community 72 - "Dropdown Menu UI Component"
Cohesion: 0.17
Nodes (11): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub (+3 more)

### Community 73 - "Integrations Schema Migration"
Cohesion: 0.26
Nodes (11): get_integration_access_token(), idx_integration_accounts_integration_id, idx_integration_accounts_organization_id, idx_integrations_organization_id, integration_account_secrets, integration_accounts, integration_accounts_set_updated_at, integrations (+3 more)

### Community 74 - "Component Props Interfaces"
Cohesion: 0.27
Nodes (10): EnvironmentCardProps, UserMenuProps, ProjectHeaderProps, InviteMemberDialogProps, TeamViewProps, OrganizationMemberRow, PendingInvitationRow, packages_types_src_index_invitationstatus (+2 more)

### Community 75 - "Navigation Sidebar & Nav Items"
Cohesion: 0.27
Nodes (8): AppSidebarProps, MobileNavProps, NAV_ITEMS, NavItem, OrganizationSwitcher(), handleSwitch(), OrganizationSwitcherProps, OrganizationMembership

### Community 76 - "Node Library TSConfig"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, declarationMap, module, moduleResolution, types, display, extends (+2 more)

### Community 77 - "Prettier Config"
Cohesion: 0.18
Nodes (10): arrowParens, importOrder, importOrderSeparation, importOrderSortSpecifiers, plugins, printWidth, semi, singleQuote (+2 more)

### Community 78 - "Crawler Link Discovery"
Cohesion: 0.31
Nodes (9): discoverLinks(), DiscoverLinksOptions, isCrawlableProtocol(), looksDestructiveOrDownload(), normalizeUrl(), resolveLink(), ALLOWED_ORIGIN, discover() (+1 more)

### Community 79 - "React Library TSConfig"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, declarationMap, jsx, lib, display, extends, ./base.json (+1 more)

### Community 80 - "Invitations Schema Migration"
Cohesion: 0.31
Nodes (7): organizations, get_invitation_preview(), idx_invitations_email, idx_invitations_org_email_pending, idx_invitations_organization_id, invitations, idx_invitations_invited_by

### Community 81 - "Credentials Schema Migration"
Cohesion: 0.29
Nodes (9): credential_secrets, credentials, credentials_set_updated_at, get_credential_secret(), idx_credentials_organization_id, idx_credentials_project_id, vault.decrypted_secrets, idx_credentials_created_by (+1 more)

### Community 82 - "Web App NPM Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, clean, dev, lint, start, test, test:watch (+1 more)

### Community 83 - "Root Layout & Toast Component"
Cohesion: 0.22
Nodes (6): apps_web_src_app_globals, metadata, Toaster(), ToasterProps, packages_ui_src_index_toaster, sonner

### Community 84 - "Header & Navigation Components"
Cohesion: 0.22
Nodes (8): AppHeader(), AppHeaderProps, NotificationsMenu(), MobileNav(), UserMenu(), handleSignOut(), SearchInput, packages_ui_src_index_searchinput

### Community 85 - "Test Run Status Panel & Throttled Refresh"
Cohesion: 0.25
Nodes (5): TestRunStatusPanel(), handleCancel(), createThrottledRefresh(), scheduleWindow(), ThrottledRefresh

### Community 86 - "API TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 87 - "QA Fixture TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 88 - "Web App TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, exclude, extends, include, @qavio/config/tsconfig/nextjs.json

### Community 89 - "AI Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 90 - "Config Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ./tsconfig/node-library.json

### Community 91 - "Database Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 92 - "Integrations Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 93 - "Queue Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 94 - "Testing Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 95 - "Types Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 96 - "Worker TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, @qavio/config/tsconfig/node-library.json

### Community 97 - "Invite Accept Flow"
Cohesion: 0.40
Nodes (5): acceptInvitation(), mockCookieSet, mockRpc, AcceptInvitationButton(), handleAccept()

### Community 98 - "Test Result Types & Artifacts"
Cohesion: 0.40
Nodes (5): TestResultRow, TestExecutionArtifact, TestExecutionResultItem, packages_types_src_index_testresultstatus, TestResultStatus

### Community 99 - "Tooltip UI Component"
Cohesion: 0.33
Nodes (5): Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, @radix-ui/react-tooltip

### Community 100 - "UI Package NPM Scripts"
Cohesion: 0.40
Nodes (5): scripts, lint, test, test:watch, typecheck

### Community 101 - "AI Worker Manifest (placeholder)"
Cohesion: 0.40
Nodes (4): description, name, private, version

### Community 102 - "Mobile Worker Manifest (placeholder)"
Cohesion: 0.40
Nodes (4): description, name, private, version

### Community 103 - "Security Worker Manifest (placeholder)"
Cohesion: 0.40
Nodes (4): description, name, private, version

### Community 104 - "Visual Worker Manifest (placeholder)"
Cohesion: 0.40
Nodes (4): description, name, private, version

### Community 105 - "API Build TSConfig"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 106 - "QA Fixture Build TSConfig"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 107 - "SSRF & Security Docs"
Cohesion: 0.67
Nodes (4): Security Controls (Phase 7), route-guard.ts (installRouteGuard), Target URL SSRF Protection, target-validation.ts (validateTargetUrl)

### Community 108 - "Testing Build TSConfig"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 109 - "UI Package TSConfig"
Cohesion: 0.50
Nodes (3): extends, include, @qavio/config/tsconfig/react-library.json

### Community 110 - "Worker Build TSConfig"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 113 - "UI Peer Dependencies"
Cohesion: 0.67
Nodes (3): peerDependencies, react, react-dom

## Knowledge Gaps
- **852 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth` (+847 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 992 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Auth Flow Pages` to `Environment & Integration Dialogs`, `Dashboard List Pages`, `Environment CRUD Dialogs`, `Auth Middleware`, `Dashboard Error Boundaries`, `Settings & Activity Feed`, `Auth & Onboarding Forms`, `Environment & Project Selectors`, `Web App Manifest`, `Dashboard & Reports Pages`, `Project Pages`, `Test Run & Issue Detail Pages`, `Organization Switching & Auth Callback`, `Reset Password & Dashboard Layout`, `Environment Dialog & Header Menus`, `AI Insight Card & Test Run Form`, `Issue Card & Project Overview`, `Login & Signup Pages`, `Navigation Sidebar & Nav Items`, `Root Layout & Toast Component`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Organization Switching & Auth Callback` to `Project CRUD Actions`, `Invite Accept Flow`, `Dashboard List Pages`, `Reset Password & Dashboard Layout`, `Issue Status & Detail`, `Auth Middleware`, `Auth Flow Pages`, `Team Management Actions`, `Component Props Interfaces`, `Dashboard & Reports Pages`, `Project Environment Actions`, `Auth Server Actions`, `Project Pages`, `Test Run & Issue Detail Pages`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `@supabase/ssr` connect `Auth Middleware` to `Database Package Manifest`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _852 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Environment & Integration Dialogs` be split into smaller, more focused modules?**
  _Cohesion score 0.06801093643198906 - nodes in this community are weakly interconnected._
- **Should `Dashboard List Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.09333333333333334 - nodes in this community are weakly interconnected._
- **Should `Root Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._