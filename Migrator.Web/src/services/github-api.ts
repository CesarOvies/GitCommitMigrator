import { CommitMetadata, MigrationProgress } from '../types';
import { parseGitHubUrl } from './validator';
import { Translations } from './localization';

export class GitHubApiError extends Error {
  constructor(message: string, public status?: number, public responseData?: unknown) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    tree: {
      sha: string;
    };
  };
  parents: Array<{ sha: string }>;
}

export async function fetchRemoteBranches(
  repoUrl: string,
  patToken?: string,
  messages?: Partial<Translations>
): Promise<string[]> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    const errorMsg = messages?.errInvalidRepoUrl
      ? messages.errInvalidRepoUrl.replace('{0}', repoUrl)
      : `URL do repositório inválida: ${repoUrl}`;
    throw new GitHubApiError(errorMsg);
  }

  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (patToken?.trim()) {
    headers.Authorization = `Bearer ${patToken.trim()}`;
  }

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    if (res.status === 401) {
      throw new GitHubApiError(messages?.errPatInvalidOrExpired || 'Token de acesso (PAT) inválido ou expirado.', 401);
    }
    if (res.status === 404) {
      const msg = messages?.errRepoNotFoundOrPrivate
        ? messages.errRepoNotFoundOrPrivate.replace('{0}', `${owner}/${repo}`)
        : `Repositório não encontrado ou privado: ${owner}/${repo}. Se for privado, informe um PAT de origem.`;
      throw new GitHubApiError(msg, 404);
    }
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        throw new GitHubApiError(messages?.errRateLimitExceeded || 'Limite de requisições da API do GitHub atingido (Rate Limit). Use um PAT para aumentar o limite.', 403);
      }
    }
    const errText = await res.text();
    throw new GitHubApiError(`Falha ao consultar branches do GitHub (${res.status}): ${errText}`, res.status);
  }

  const data: Array<{ name: string }> = await res.json();
  return data.map((b) => b.name);
}

export async function fetchRemoteCommits(
  repoUrl: string,
  filterEmail: string,
  patToken?: string,
  onProgress?: (loaded: number) => void,
  messages?: Partial<Translations>,
  branch?: string
): Promise<{ commits: CommitMetadata[]; totalFound: number }> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    const errorMsg = messages?.errInvalidRepoUrl
      ? messages.errInvalidRepoUrl.replace('{0}', repoUrl)
      : `URL do repositório inválida: ${repoUrl}`;
    throw new GitHubApiError(errorMsg);
  }

  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (patToken?.trim()) {
    headers.Authorization = `Bearer ${patToken.trim()}`;
  }

  const allFilteredCommits: CommitMetadata[] = [];
  let totalScanned = 0;
  let page = 1;
  const perPage = 100;
  const normalizedFilterEmail = filterEmail.trim().toLowerCase();
  const branchParam = branch?.trim() ? `&sha=${encodeURIComponent(branch.trim())}` : '';

  while (true) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${perPage}&page=${page}${branchParam}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      if (res.status === 401) {
        throw new GitHubApiError(messages?.errPatInvalidOrExpired || 'Token de acesso (PAT) inválido ou expirado.', 401);
      }
      if (res.status === 404) {
        const errorMsg = messages?.errRepoNotFoundOrPrivate
          ? messages.errRepoNotFoundOrPrivate.replace('{0}', `${owner}/${repo}`)
          : `Repositório não encontrado ou privado: ${owner}/${repo}. Se for privado, informe um PAT de origem.`;
        throw new GitHubApiError(errorMsg, 404);
      }
      if (res.status === 403) {
        const remaining = res.headers.get('x-ratelimit-remaining');
        if (remaining === '0') {
          throw new GitHubApiError(
            messages?.errRateLimitExceeded ||
            'Limite de requisições da API do GitHub atingido (Rate Limit). Use um PAT para aumentar o limite.',
            403
          );
        }
      }
      const errText = await res.text();
      const failMsg = messages?.errFetchCommitsFailed
        ? messages.errFetchCommitsFailed.replace('{0}', String(res.status)).replace('{1}', errText)
        : `Falha ao consultar commits do GitHub (${res.status}): ${errText}`;
      throw new GitHubApiError(failMsg, res.status);
    }

    const data: GitHubCommitResponse[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    for (const item of data) {
      totalScanned++;
      const authorEmail = item.commit?.author?.email?.toLowerCase() ?? '';
      if (authorEmail === normalizedFilterEmail) {
        allFilteredCommits.push({
          sha: item.sha,
          message: item.commit.message,
          when: item.commit.author.date,
          authorName: item.commit.author.name,
          authorEmail: item.commit.author.email
        });
      }
    }

    onProgress?.(allFilteredCommits.length);

    if (data.length < perPage) {
      break;
    }

    page++;
    // Safety stop at 50 pages (5000 commits) to avoid accidental browser lockups
    if (page > 50) {
      break;
    }
  }

  // Sort ascending by date
  allFilteredCommits.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());

  return {
    commits: allFilteredCommits,
    totalFound: totalScanned
  };
}

export async function pushGhostCommits(
  targetRepoUrl: string,
  targetPatToken: string,
  commitsToMigrate: CommitMetadata[],
  newAuthorName: string,
  newAuthorEmail: string,
  onProgress?: (progress: MigrationProgress) => void,
  messages?: Partial<Translations>
): Promise<{ totalMigrated: number; finalCommitSha: string; branchUrl: string }> {
  const parsed = parseGitHubUrl(targetRepoUrl);
  if (!parsed) {
    const errorMsg = messages?.errInvalidTargetRepoUrl
      ? messages.errInvalidTargetRepoUrl.replace('{0}', targetRepoUrl)
      : `URL do repositório de destino inválida: ${targetRepoUrl}`;
    throw new GitHubApiError(errorMsg);
  }

  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${targetPatToken.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };

  // Helper for API calls
  async function ghRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${endpoint}`;
    const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    if (!res.ok) {
      let msg = `GitHub API error ${res.status}`;
      try {
        const body = await res.json();
        if (body.message) msg = body.message;
      } catch {
        msg = await res.text();
      }
      throw new GitHubApiError(msg, res.status);
    }
    return res.json() as Promise<T>;
  }

  onProgress?.({
    percentage: 5,
    statusText: messages?.statusVerifyingTarget || 'Verificando repositório de destino...'
  });

  // 1. Check if target repo exists and get default branch
  let currentTipSha: string | null = null;
  let currentTreeSha: string | null = null;
  let isNewBranch = false;

  try {
    const refData = await ghRequest<{ object: { sha: string } }>('/git/ref/heads/main');
    currentTipSha = refData.object.sha;
    const commitData = await ghRequest<{ tree: { sha: string } }>(`/git/commits/${currentTipSha}`);
    currentTreeSha = commitData.tree.sha;
  } catch (err: unknown) {
    if (err instanceof GitHubApiError && (err.status === 404 || err.status === 409)) {
      isNewBranch = true;
    } else {
      throw err;
    }
  }

  // 2. If branch does not exist or repo is empty, initialize it with MIGRATION_INFO.md
  if (isNewBranch || !currentTipSha || !currentTreeSha) {
    onProgress?.({
      percentage: 10,
      statusText: messages?.statusInitialCommit || 'Criando commit inicial (MIGRATION_INFO.md)...'
    });

    // Create tree with MIGRATION_INFO.md
    const initialTree = await ghRequest<{ sha: string }>('/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        tree: [
          {
            path: 'MIGRATION_INFO.md',
            mode: '100644',
            type: 'blob',
            content: 'Repositório gerado via Git Commit Migrator (Ghost Commits).'
          }
        ]
      })
    });

    currentTreeSha = initialTree.sha;
    const initialDate = new Date().toISOString();

    const initialCommit = await ghRequest<{ sha: string }>('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Initial commit',
        tree: currentTreeSha,
        parents: [],
        author: {
          name: newAuthorName,
          email: newAuthorEmail,
          date: initialDate
        },
        committer: {
          name: newAuthorName,
          email: newAuthorEmail,
          date: initialDate
        }
      })
    });

    currentTipSha = initialCommit.sha;

    // Create or update refs/heads/main
    await ghRequest('/git/refs', {
      method: 'POST',
      body: JSON.stringify({
        ref: 'refs/heads/main',
        sha: currentTipSha
      })
    }).catch(async (e: unknown) => {
      // If ref already existed (e.g. race condition), update it
      if (e instanceof GitHubApiError && e.status === 422) {
        await ghRequest('/git/refs/heads/main', {
          method: 'PATCH',
          body: JSON.stringify({ sha: currentTipSha, force: true })
        });
      } else {
        throw e;
      }
    });
  }

  // 3. Collect existing commits on target repo to avoid duplicates
  const existingCommitsSet = new Set<string>();
  try {
    const existingList = await ghRequest<Array<{ commit: { author: { email: string; date: string }; message: string } }>>(
      '/commits?per_page=100'
    );
    if (Array.isArray(existingList)) {
      for (const item of existingList) {
        const key = `${item.commit.author.email.toLowerCase()}|${new Date(item.commit.author.date).getTime()}|${item.commit.message}`;
        existingCommitsSet.add(key);
      }
    }
  } catch {
    // Ignore non-fatal list errors on empty repos
  }

  // 4. Iterate over commitsToMigrate creating ghost commits on the tip
  const totalCommits = commitsToMigrate.length;
  let createdCount = 0;

  for (let i = 0; i < totalCommits; i++) {
    const meta = commitsToMigrate[i];
    const key = `${newAuthorEmail.toLowerCase()}|${new Date(meta.when).getTime()}|${meta.message}`;

    if (existingCommitsSet.has(key)) {
      continue;
    }

    const commitDateIso = new Date(meta.when).toISOString();

    const newCommit: { sha: string } = await ghRequest<{ sha: string }>('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message: meta.message,
        tree: currentTreeSha,
        parents: [currentTipSha],
        author: {
          name: newAuthorName,
          email: newAuthorEmail,
          date: commitDateIso
        },
        committer: {
          name: newAuthorName,
          email: newAuthorEmail,
          date: commitDateIso
        }
      })
    });

    currentTipSha = newCommit.sha;
    createdCount++;

    const pct = 15 + Math.round(((i + 1) / totalCommits) * 75);
    const reconstructingText = messages?.statusReconstructingHistory
      ? messages.statusReconstructingHistory.replace('{0}', String(i + 1)).replace('{1}', String(totalCommits))
      : `Criando ghost commits (${i + 1}/${totalCommits})...`;

    onProgress?.({
      percentage: pct,
      statusText: reconstructingText,
      currentStep: i + 1,
      totalSteps: totalCommits
    });
  }

  // 5. Update main branch reference to the final ghost commit
  onProgress?.({
    percentage: 95,
    statusText: messages?.statusPushingToRemote || 'Atualizando branch refs/heads/main...'
  });

  await ghRequest('/git/refs/heads/main', {
    method: 'PATCH',
    body: JSON.stringify({
      sha: currentTipSha,
      force: false
    })
  });

  onProgress?.({
    percentage: 100,
    statusText: messages?.statusCompleted || 'Migração concluída com sucesso!'
  });

  return {
    totalMigrated: createdCount,
    finalCommitSha: currentTipSha || '',
    branchUrl: `https://github.com/${owner}/${repo}/commits/main`
  };
}
