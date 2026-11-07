export type AppLanguage = 'pt-BR' | 'en-US' | 'es';

export type SourceMode = 'remote' | 'local';

export interface CommitMetadata {
  sha?: string;
  message: string;
  when: string; // ISO 8601
  authorName?: string;
  authorEmail?: string;
}

export interface RunMigrationRequest {
  sourceMode: SourceMode;
  sourceRepoUrl: string;
  sourcePatToken?: string;
  sourceBranch?: string;
  filterOriginalEmail: string;
  targetRemoteUrl: string;
  targetPatToken: string;
  newAuthorName: string;
  newAuthorEmail: string;
  useAdvancedSettings: boolean;
  startDate?: string;
  endDate?: string;
  selectedCommits?: CommitMetadata[];
}

export interface MigrationProgress {
  percentage: number;
  statusText: string;
  currentStep?: number;
  totalSteps?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

