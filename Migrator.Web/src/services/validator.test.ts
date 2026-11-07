import { describe, it, expect } from 'vitest';
import { isValidEmail, parseGitHubUrl, validateMigrationRequest } from './validator';
import { RunMigrationRequest } from '../types';

describe('validator', () => {
  it('validates emails correctly', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });

  it('parses GitHub URLs correctly', () => {
    expect(parseGitHubUrl('https://github.com/CesarOvies/GitCommitMigrator')).toEqual({
      owner: 'CesarOvies',
      repo: 'GitCommitMigrator'
    });
    expect(parseGitHubUrl('https://github.com/owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo'
    });
    expect(parseGitHubUrl('git@github.com:owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo'
    });
    expect(parseGitHubUrl('https://notgithub.com/user/repo')).toBeNull();
    expect(parseGitHubUrl('')).toBeNull();
  });

  it('validates migration request for remote mode', () => {
    const validRequest: RunMigrationRequest = {
      sourceMode: 'remote',
      sourceRepoUrl: 'https://github.com/source/repo',
      targetRemoteUrl: 'https://github.com/target/repo',
      filterOriginalEmail: 'old@company.com',
      newAuthorName: 'New Author',
      newAuthorEmail: 'new@personal.com',
      targetPatToken: 'ghp_1234567890',
      useAdvancedSettings: false
    };

    const result = validateMigrationRequest(validRequest, 'pt-BR', false);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('fails validation when required fields are missing', () => {
    const emptyRequest: RunMigrationRequest = {
      sourceMode: 'remote',
      sourceRepoUrl: '',
      targetRemoteUrl: '',
      filterOriginalEmail: 'invalid',
      newAuthorName: '',
      newAuthorEmail: '',
      targetPatToken: '',
      useAdvancedSettings: false
    };

    const result = validateMigrationRequest(emptyRequest, 'pt-BR', false);
    expect(result.isValid).toBe(false);
    expect(result.errors.sourceRepoUrl).toBeDefined();
    expect(result.errors.targetRemoteUrl).toBeDefined();
    expect(result.errors.filterOriginalEmail).toBeDefined();
    expect(result.errors.newAuthorName).toBeDefined();
    expect(result.errors.newAuthorEmail).toBeDefined();
    expect(result.errors.targetPatToken).toBeDefined();
  });

  it('validates local mode requiring directory handle', () => {
    const localReq: RunMigrationRequest = {
      sourceMode: 'local',
      sourceRepoUrl: '',
      targetRemoteUrl: 'https://github.com/target/repo',
      filterOriginalEmail: 'old@company.com',
      newAuthorName: 'New Author',
      newAuthorEmail: 'new@personal.com',
      targetPatToken: 'ghp_1234567890',
      useAdvancedSettings: false
    };

    // Without directory handle: invalid
    expect(validateMigrationRequest(localReq, 'pt-BR', false).isValid).toBe(false);

    // With directory handle: valid
    expect(validateMigrationRequest(localReq, 'pt-BR', true).isValid).toBe(true);
  });
});

