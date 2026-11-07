import { RunMigrationRequest, AppLanguage } from '../types';
import { getTranslation } from './localization';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Match https://github.com/owner/repo or https://github.com/owner/repo.git or git@github.com:owner/repo.git
  const httpsMatch = trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/.]+)(?:\.git)?\/?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }
  return null;
}

export function validateMigrationRequest(
  request: RunMigrationRequest,
  lang: AppLanguage,
  hasLocalDirectoryHandle: boolean
): ValidationResult {
  const t = getTranslation(lang);
  const errors: Record<string, string> = {};

  if (request.sourceMode === 'local') {
    if (!hasLocalDirectoryHandle) {
      errors.sourceRepoUrl = t.errSourceEmpty;
    }
  } else {
    if (!request.sourceRepoUrl || !request.sourceRepoUrl.trim()) {
      errors.sourceRepoUrl = t.errSourceEmpty;
    } else if (!parseGitHubUrl(request.sourceRepoUrl)) {
      errors.sourceRepoUrl = t.errSourceInvalid;
    }
  }

  if (!request.targetRemoteUrl || !request.targetRemoteUrl.trim()) {
    errors.targetRemoteUrl = t.errRemoteUrlEmpty;
  } else if (!parseGitHubUrl(request.targetRemoteUrl)) {
    errors.targetRemoteUrl = t.errRemoteUrlInvalid;
  }

  if (!request.filterOriginalEmail || !request.filterOriginalEmail.trim()) {
    errors.filterOriginalEmail = t.errOriginalEmailEmpty;
  } else if (!isValidEmail(request.filterOriginalEmail)) {
    errors.filterOriginalEmail = t.errOriginalEmailInvalid;
  }

  if (!request.newAuthorName || !request.newAuthorName.trim()) {
    errors.newAuthorName = t.errNewNameEmpty;
  }

  if (!request.newAuthorEmail || !request.newAuthorEmail.trim()) {
    errors.newAuthorEmail = t.errNewEmailEmpty;
  } else if (!isValidEmail(request.newAuthorEmail)) {
    errors.newAuthorEmail = t.errNewEmailInvalid;
  }

  if (!request.targetPatToken || !request.targetPatToken.trim()) {
    errors.targetPatToken = t.errPatEmpty;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

