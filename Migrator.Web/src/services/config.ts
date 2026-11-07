import { RunMigrationRequest } from '../types';

export interface DesktopMigrationConfig {
  SourceRepoPath: string;
  SourcePatToken: string;
  TargetRemoteUrl: string;
  FilterOriginalEmail: string;
  NewAuthorName: string;
  NewAuthorEmail: string;
  TargetPatToken: string;
  UseAdvancedSettings: boolean;
}

/**
 * Serializes the current migration request into standard PascalCase JSON matching Desktop format.
 */
export function exportConfiguration(request: RunMigrationRequest): string {
  const config: DesktopMigrationConfig = {
    SourceRepoPath: request.sourceRepoUrl || '',
    SourcePatToken: request.sourcePatToken || '',
    TargetRemoteUrl: request.targetRemoteUrl || '',
    FilterOriginalEmail: request.filterOriginalEmail || '',
    NewAuthorName: request.newAuthorName || '',
    NewAuthorEmail: request.newAuthorEmail || '',
    TargetPatToken: request.targetPatToken || '',
    UseAdvancedSettings: Boolean(request.useAdvancedSettings)
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Deserializes configuration JSON.
 * Accepts PascalCase (Desktop official), camelCase (legacy web format),
 * and case-insensitive property lookups.
 */
export function importConfiguration(jsonText: string): Partial<RunMigrationRequest> {
  if (!jsonText || typeof jsonText !== 'string') {
    throw new Error('Invalid JSON string.');
  }

  const raw = JSON.parse(jsonText);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('JSON content is not a valid configuration object.');
  }

  const getProp = (key: string): unknown => {
    if (key in raw) return (raw as Record<string, unknown>)[key];
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (k.toLowerCase() === lowerKey) {
        return v;
      }
    }
    return undefined;
  };

  const rawSource =
    getProp('SourceRepoPath') ??
    getProp('sourceRepoPath') ??
    getProp('SourceRepoUrl') ??
    getProp('sourceRepoUrl') ??
    '';

  const sourceRepoPath = typeof rawSource === 'string' ? rawSource : '';
  const rawSourcePat = getProp('SourcePatToken') ?? getProp('sourcePatToken') ?? '';
  const rawTargetRemote = getProp('TargetRemoteUrl') ?? getProp('targetRemoteUrl') ?? '';
  const rawFilterEmail = getProp('FilterOriginalEmail') ?? getProp('filterOriginalEmail') ?? '';
  const rawNewName = getProp('NewAuthorName') ?? getProp('newAuthorName') ?? '';
  const rawNewEmail = getProp('NewAuthorEmail') ?? getProp('newAuthorEmail') ?? '';
  const rawTargetPat = getProp('TargetPatToken') ?? getProp('targetPatToken') ?? '';
  const rawAdvanced = getProp('UseAdvancedSettings') ?? getProp('useAdvancedSettings');

  const isRemote =
    sourceRepoPath.startsWith('http://') ||
    sourceRepoPath.startsWith('https://') ||
    sourceRepoPath.startsWith('git@') ||
    sourceRepoPath.includes('github.com');

  return {
    sourceRepoUrl: sourceRepoPath,
    sourceMode: isRemote ? 'remote' : undefined,
    sourcePatToken: typeof rawSourcePat === 'string' ? rawSourcePat : '',
    targetRemoteUrl: typeof rawTargetRemote === 'string' ? rawTargetRemote : '',
    filterOriginalEmail: typeof rawFilterEmail === 'string' ? rawFilterEmail : '',
    newAuthorName: typeof rawNewName === 'string' ? rawNewName : '',
    newAuthorEmail: typeof rawNewEmail === 'string' ? rawNewEmail : '',
    targetPatToken: typeof rawTargetPat === 'string' ? rawTargetPat : '',
    useAdvancedSettings: Boolean(rawAdvanced)
  };
}
