import { describe, it, expect } from 'vitest';
import { exportConfiguration, importConfiguration } from './config';
import { RunMigrationRequest } from '../types';

describe('config serialization', () => {
  const sampleRequest: RunMigrationRequest = {
    sourceMode: 'remote',
    sourceRepoUrl: 'https://github.com/source/repo.git',
    sourcePatToken: 'ghp_source123',
    targetRemoteUrl: 'https://github.com/target/repo.git',
    filterOriginalEmail: 'dev@source.com',
    newAuthorName: 'Target Dev',
    newAuthorEmail: 'dev@target.com',
    targetPatToken: 'ghp_target456',
    useAdvancedSettings: true
  };

  it('exports configuration using PascalCase keys identical to desktop', () => {
    const json = exportConfiguration(sampleRequest);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual({
      SourceRepoPath: 'https://github.com/source/repo.git',
      SourcePatToken: 'ghp_source123',
      TargetRemoteUrl: 'https://github.com/target/repo.git',
      FilterOriginalEmail: 'dev@source.com',
      NewAuthorName: 'Target Dev',
      NewAuthorEmail: 'dev@target.com',
      TargetPatToken: 'ghp_target456',
      UseAdvancedSettings: true
    });

    // Explicit check that camelCase is not present in exported JSON keys
    expect(json).toContain('"SourceRepoPath":');
    expect(json).not.toContain('"sourceRepoPath":');
    expect(json).toContain('"TargetRemoteUrl":');
    expect(json).not.toContain('"targetRemoteUrl":');
  });

  it('imports configuration from desktop PascalCase JSON', () => {
    const desktopJson = JSON.stringify({
      SourceRepoPath: 'https://github.com/source/repo.git',
      SourcePatToken: 'ghp_source123',
      TargetRemoteUrl: 'https://github.com/target/repo.git',
      FilterOriginalEmail: 'dev@source.com',
      NewAuthorName: 'Target Dev',
      NewAuthorEmail: 'dev@target.com',
      TargetPatToken: 'ghp_target456',
      UseAdvancedSettings: true
    });

    const result = importConfiguration(desktopJson);

    expect(result.sourceRepoUrl).toBe('https://github.com/source/repo.git');
    expect(result.sourceMode).toBe('remote');
    expect(result.sourcePatToken).toBe('ghp_source123');
    expect(result.targetRemoteUrl).toBe('https://github.com/target/repo.git');
    expect(result.filterOriginalEmail).toBe('dev@source.com');
    expect(result.newAuthorName).toBe('Target Dev');
    expect(result.newAuthorEmail).toBe('dev@target.com');
    expect(result.targetPatToken).toBe('ghp_target456');
    expect(result.useAdvancedSettings).toBe(true);
  });

  it('imports legacy camelCase JSON without losing fields', () => {
    const legacyWebJson = JSON.stringify({
      sourceRepoPath: 'https://github.com/legacy/repo.git',
      sourcePatToken: 'ghp_legacy_source',
      targetRemoteUrl: 'https://github.com/legacy/target.git',
      filterOriginalEmail: 'old@company.com',
      newAuthorName: 'New Dev',
      newAuthorEmail: 'new@personal.com',
      targetPatToken: 'ghp_legacy_target',
      useAdvancedSettings: false
    });

    const result = importConfiguration(legacyWebJson);

    expect(result.sourceRepoUrl).toBe('https://github.com/legacy/repo.git');
    expect(result.sourceMode).toBe('remote');
    expect(result.sourcePatToken).toBe('ghp_legacy_source');
    expect(result.targetRemoteUrl).toBe('https://github.com/legacy/target.git');
    expect(result.filterOriginalEmail).toBe('old@company.com');
    expect(result.newAuthorName).toBe('New Dev');
    expect(result.newAuthorEmail).toBe('new@personal.com');
    expect(result.targetPatToken).toBe('ghp_legacy_target');
    expect(result.useAdvancedSettings).toBe(false);
  });

  it('handles local directory path from desktop export', () => {
    const desktopLocalJson = JSON.stringify({
      SourceRepoPath: 'C:\\Users\\dev\\source-repo',
      TargetRemoteUrl: 'https://github.com/target/repo.git',
      FilterOriginalEmail: 'dev@company.com',
      NewAuthorName: 'Dev Name',
      NewAuthorEmail: 'dev@personal.com',
      TargetPatToken: 'ghp_target',
      UseAdvancedSettings: false
    });

    const result = importConfiguration(desktopLocalJson);

    expect(result.sourceRepoUrl).toBe('C:\\Users\\dev\\source-repo');
    expect(result.sourceMode).toBeUndefined(); // Leaves existing mode intact
    expect(result.targetRemoteUrl).toBe('https://github.com/target/repo.git');
  });

  it('throws on invalid or non-object JSON', () => {
    expect(() => importConfiguration('')).toThrow();
    expect(() => importConfiguration('null')).toThrow();
    expect(() => importConfiguration('[]')).toThrow();
    expect(() => importConfiguration('{ invalid json')).toThrow();
  });

  it('round-trips full configuration accurately', () => {
    const exportedJson = exportConfiguration(sampleRequest);
    const imported = importConfiguration(exportedJson);

    expect(imported.sourceRepoUrl).toBe(sampleRequest.sourceRepoUrl);
    expect(imported.sourcePatToken).toBe(sampleRequest.sourcePatToken);
    expect(imported.targetRemoteUrl).toBe(sampleRequest.targetRemoteUrl);
    expect(imported.filterOriginalEmail).toBe(sampleRequest.filterOriginalEmail);
    expect(imported.newAuthorName).toBe(sampleRequest.newAuthorName);
    expect(imported.newAuthorEmail).toBe(sampleRequest.newAuthorEmail);
    expect(imported.targetPatToken).toBe(sampleRequest.targetPatToken);
    expect(imported.useAdvancedSettings).toBe(sampleRequest.useAdvancedSettings);
  });
});
