/**
 * Hand-authored placeholder for the Supabase-generated database types.
 *
 * Once a real Supabase project is linked, replace this file by running:
 *   pnpm --filter @qavio/database db:generate-types
 *
 * Its shape (Database.public.Tables.<table>.{Row,Insert,Update}) matches
 * what the Supabase CLI generates, so no call sites need to change.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; slug: string; created_at: string };
        Insert: { id?: string; name: string; slug: string; created_at?: string };
        Update: { id?: string; name?: string; slug?: string; created_at?: string };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          platform: 'web' | 'mobile' | 'api';
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          platform?: 'web' | 'mobile' | 'api';
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          platform?: 'web' | 'mobile' | 'api';
          created_at?: string;
        };
      };
      environments: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          kind: 'production' | 'staging' | 'preview' | 'local';
          base_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          kind: 'production' | 'staging' | 'preview' | 'local';
          base_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          kind?: 'production' | 'staging' | 'preview' | 'local';
          base_url?: string;
          created_at?: string;
        };
      };
      test_runs: {
        Row: {
          id: string;
          project_id: string;
          environment_id: string;
          type: 'functional' | 'visual' | 'responsive' | 'security';
          status: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';
          triggered_by: string;
          queue_job_id: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          environment_id: string;
          type?: 'functional' | 'visual' | 'responsive' | 'security';
          status?: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';
          triggered_by: string;
          queue_job_id?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          environment_id?: string;
          type?: 'functional' | 'visual' | 'responsive' | 'security';
          status?: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';
          triggered_by?: string;
          queue_job_id?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
      };
      test_results: {
        Row: {
          id: string;
          test_run_id: string;
          name: string;
          status: 'passed' | 'failed' | 'skipped' | 'timed_out';
          duration_ms: number;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_run_id: string;
          name: string;
          status: 'passed' | 'failed' | 'skipped' | 'timed_out';
          duration_ms?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_run_id?: string;
          name?: string;
          status?: 'passed' | 'failed' | 'skipped' | 'timed_out';
          duration_ms?: number;
          error_message?: string | null;
          created_at?: string;
        };
      };
      test_artifacts: {
        Row: {
          id: string;
          test_result_id: string;
          kind: 'screenshot' | 'video' | 'trace' | 'log';
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_result_id: string;
          kind: 'screenshot' | 'video' | 'trace' | 'log';
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_result_id?: string;
          kind?: 'screenshot' | 'video' | 'trace' | 'log';
          storage_path?: string;
          created_at?: string;
        };
      };
      bugs: {
        Row: {
          id: string;
          project_id: string;
          test_result_id: string;
          title: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          status: 'open' | 'investigating' | 'fixed' | 'wont_fix' | 'closed';
          ai_summary: string | null;
          external_issue_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          test_result_id: string;
          title: string;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'open' | 'investigating' | 'fixed' | 'wont_fix' | 'closed';
          ai_summary?: string | null;
          external_issue_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          test_result_id?: string;
          title?: string;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'open' | 'investigating' | 'fixed' | 'wont_fix' | 'closed';
          ai_summary?: string | null;
          external_issue_url?: string | null;
          created_at?: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          organization_id: string;
          provider: 'jira' | 'clickup' | 'notion' | 'linear' | 'github' | 'gitlab';
          is_connected: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider: 'jira' | 'clickup' | 'notion' | 'linear' | 'github' | 'gitlab';
          is_connected?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider?: 'jira' | 'clickup' | 'notion' | 'linear' | 'github' | 'gitlab';
          is_connected?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
