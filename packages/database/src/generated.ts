/**
 * Hand-authored placeholder for the Supabase-generated database types.
 *
 * Once a real Supabase project is linked, replace this file by running:
 *   pnpm --filter @qavio/database db:generate-types
 *
 * Its shape (Database.public.Tables.<table>.{Row,Insert,Update}) matches
 * what the Supabase CLI generates, so no call sites need to change.
 *
 * Deliberately NOT modeled here: `credential_secrets` and
 * `integration_account_secrets`. Nothing ever queries them through the
 * Supabase client — they're only reachable via the SECURITY DEFINER
 * functions `get_credential_secret()` / `get_integration_access_token()`
 * (see supabase/migrations) — so they have no safe row shape to expose.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type OrganizationRole = 'owner' | 'admin' | 'qa' | 'developer' | 'viewer';
type ProjectPlatform = 'web' | 'mobile' | 'api';
type EnvironmentKind = 'production' | 'staging' | 'preview' | 'local';
type TestRunType = 'functional' | 'visual' | 'responsive' | 'security';
type TestRunStatus =
  | 'created'
  | 'queued'
  | 'starting'
  | 'running'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'cancelled';
type TestRunJobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'delayed';
type TestResultStatus = 'passed' | 'failed' | 'skipped' | 'blocked';
type ArtifactKind = 'screenshot' | 'video' | 'trace' | 'log' | 'dom_snapshot' | 'json_report';
type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'reopened' | 'ignored' | 'duplicate';
type IntegrationProvider = 'jira' | 'clickup' | 'notion' | 'linear' | 'github' | 'gitlab';
type CredentialType = 'api_key' | 'basic_auth' | 'oauth_token' | 'ssh_key' | 'generic';
type FixSuggestionStatus = 'proposed' | 'approved' | 'rejected' | 'applied';
type FixAttemptStatus = 'pending' | 'running' | 'succeeded' | 'failed';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrganizationRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrganizationRole;
          invited_by?: string | null;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          platform: ProjectPlatform;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          platform?: ProjectPlatform;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          platform?: ProjectPlatform;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      environments: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          name: string;
          kind: EnvironmentKind;
          base_url: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          name: string;
          kind?: EnvironmentKind;
          base_url: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          name?: string;
          kind?: EnvironmentKind;
          base_url?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      test_suites: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          name: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      test_cases: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          test_suite_id: string;
          title: string;
          description: string | null;
          steps: Json;
          expected_result: string | null;
          priority: string;
          tags: string[];
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          test_suite_id: string;
          title: string;
          description?: string | null;
          steps?: Json;
          expected_result?: string | null;
          priority?: string;
          tags?: string[];
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          test_suite_id?: string;
          title?: string;
          description?: string | null;
          steps?: Json;
          expected_result?: string | null;
          priority?: string;
          tags?: string[];
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      test_runs: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          environment_id: string;
          test_suite_id: string | null;
          type: TestRunType;
          status: TestRunStatus;
          triggered_by: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          environment_id: string;
          test_suite_id?: string | null;
          type?: TestRunType;
          status?: TestRunStatus;
          triggered_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          environment_id?: string;
          test_suite_id?: string | null;
          type?: TestRunType;
          status?: TestRunStatus;
          triggered_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
      };
      test_run_jobs: {
        Row: {
          id: string;
          organization_id: string;
          test_run_id: string;
          queue_name: string;
          job_id: string;
          status: TestRunJobStatus;
          attempts: number;
          last_error: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          test_run_id: string;
          queue_name: string;
          job_id: string;
          status?: TestRunJobStatus;
          attempts?: number;
          last_error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          test_run_id?: string;
          queue_name?: string;
          job_id?: string;
          status?: TestRunJobStatus;
          attempts?: number;
          last_error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
      };
      test_results: {
        Row: {
          id: string;
          organization_id: string;
          test_run_id: string;
          test_case_id: string | null;
          name: string;
          status: TestResultStatus;
          duration_ms: number;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          test_run_id: string;
          test_case_id?: string | null;
          name: string;
          status: TestResultStatus;
          duration_ms?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          test_run_id?: string;
          test_case_id?: string | null;
          name?: string;
          status?: TestResultStatus;
          duration_ms?: number;
          error_message?: string | null;
          created_at?: string;
        };
      };
      artifacts: {
        Row: {
          id: string;
          organization_id: string;
          test_result_id: string;
          kind: ArtifactKind;
          storage_bucket: string;
          storage_path: string;
          content_type: string | null;
          size_bytes: number | null;
          checksum: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          test_result_id: string;
          kind: ArtifactKind;
          storage_bucket?: string;
          storage_path: string;
          content_type?: string | null;
          size_bytes?: number | null;
          checksum?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          test_result_id?: string;
          kind?: ArtifactKind;
          storage_bucket?: string;
          storage_path?: string;
          content_type?: string | null;
          size_bytes?: number | null;
          checksum?: string | null;
          created_at?: string;
        };
      };
      issues: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          test_run_id: string | null;
          test_result_id: string | null;
          title: string;
          description: string | null;
          severity: IssueSeverity;
          status: IssueStatus;
          evidence: Json;
          ai_summary: string | null;
          external_issue_url: string | null;
          assigned_to: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          test_run_id?: string | null;
          test_result_id?: string | null;
          title: string;
          description?: string | null;
          severity?: IssueSeverity;
          status?: IssueStatus;
          evidence?: Json;
          ai_summary?: string | null;
          external_issue_url?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          test_run_id?: string | null;
          test_result_id?: string | null;
          title?: string;
          description?: string | null;
          severity?: IssueSeverity;
          status?: IssueStatus;
          evidence?: Json;
          ai_summary?: string | null;
          external_issue_url?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      issue_comments: {
        Row: {
          id: string;
          organization_id: string;
          issue_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          issue_id: string;
          author_id?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          issue_id?: string;
          author_id?: string | null;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          organization_id: string;
          provider: IntegrationProvider;
          is_connected: boolean;
          config: Json;
          connected_by: string | null;
          connected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider: IntegrationProvider;
          is_connected?: boolean;
          config?: Json;
          connected_by?: string | null;
          connected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider?: IntegrationProvider;
          is_connected?: boolean;
          config?: Json;
          connected_by?: string | null;
          connected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      integration_accounts: {
        Row: {
          id: string;
          organization_id: string;
          integration_id: string;
          external_account_id: string;
          external_account_name: string | null;
          scope: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_id: string;
          external_account_id: string;
          external_account_name?: string | null;
          scope?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          integration_id?: string;
          external_account_id?: string;
          external_account_name?: string | null;
          scope?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      credentials: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          environment_id: string | null;
          name: string;
          type: CredentialType;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          rotated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          environment_id?: string | null;
          name: string;
          type?: CredentialType;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          rotated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          environment_id?: string | null;
          name?: string;
          type?: CredentialType;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          rotated_at?: string | null;
        };
      };
      ai_analyses: {
        Row: {
          id: string;
          organization_id: string;
          test_result_id: string | null;
          issue_id: string | null;
          provider: string;
          model: string;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          summary: string;
          raw_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          test_result_id?: string | null;
          issue_id?: string | null;
          provider: string;
          model: string;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          summary: string;
          raw_response?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          test_result_id?: string | null;
          issue_id?: string | null;
          provider?: string;
          model?: string;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          summary?: string;
          raw_response?: Json | null;
          created_at?: string;
        };
      };
      fix_suggestions: {
        Row: {
          id: string;
          organization_id: string;
          issue_id: string;
          ai_analysis_id: string | null;
          description: string;
          diff: string | null;
          status: FixSuggestionStatus;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          issue_id: string;
          ai_analysis_id?: string | null;
          description: string;
          diff?: string | null;
          status?: FixSuggestionStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          issue_id?: string;
          ai_analysis_id?: string | null;
          description?: string;
          diff?: string | null;
          status?: FixSuggestionStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      fix_attempts: {
        Row: {
          id: string;
          organization_id: string;
          fix_suggestion_id: string;
          status: FixAttemptStatus;
          pull_request_url: string | null;
          log: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          fix_suggestion_id: string;
          status?: FixAttemptStatus;
          pull_request_url?: string | null;
          log?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          fix_suggestion_id?: string;
          status?: FixAttemptStatus;
          pull_request_url?: string | null;
          log?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          metadata: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
      };
      usage_events: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string | null;
          test_run_id: string | null;
          event_type: string;
          provider: string | null;
          model: string | null;
          quantity: number;
          unit: string;
          estimated_cost_cents: number | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id?: string | null;
          test_run_id?: string | null;
          event_type: string;
          provider?: string | null;
          model?: string | null;
          quantity: number;
          unit: string;
          estimated_cost_cents?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string | null;
          test_run_id?: string | null;
          event_type?: string;
          provider?: string | null;
          model?: string | null;
          quantity?: number;
          unit?: string;
          estimated_cost_cents?: number | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan: string;
          status: SubscriptionStatus;
          seats: number;
          provider: string | null;
          provider_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          plan?: string;
          status?: SubscriptionStatus;
          seats?: number;
          provider?: string | null;
          provider_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          plan?: string;
          status?: SubscriptionStatus;
          seats?: number;
          provider?: string | null;
          provider_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_id?: string | null;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      create_organization: {
        Args: { org_name: string; org_slug: string };
        Returns: Database['public']['Tables']['organizations']['Row'];
      };
      log_audit_event: {
        Args: {
          p_organization_id: string;
          p_action: string;
          p_target_type?: string | null;
          p_target_id?: string | null;
          p_metadata?: Json;
        };
        Returns: Database['public']['Tables']['audit_logs']['Row'];
      };
      get_credential_secret: {
        Args: { p_credential_id: string };
        Returns: string;
      };
      get_integration_access_token: {
        Args: { p_integration_account_id: string };
        Returns: string;
      };
    };
  };
}
