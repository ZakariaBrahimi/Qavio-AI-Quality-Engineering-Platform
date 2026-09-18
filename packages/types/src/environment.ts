import type { Id, Timestamp } from './common';

export type EnvironmentKind = 'production' | 'staging' | 'preview' | 'local';

export interface Environment {
  id: Id;
  projectId: Id;
  name: string;
  kind: EnvironmentKind;
  baseUrl: string;
  createdAt: Timestamp;
}
