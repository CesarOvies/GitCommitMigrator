import git from 'isomorphic-git';
import { CommitMetadata } from '../types';

interface FsError extends Error {
  code?: string;
}

/**
 * Lightweight FileSystemDirectoryHandle adapter for isomorphic-git
 */
function createFsFromDirectoryHandle(rootDirHandle: FileSystemDirectoryHandle) {
  async function resolvePath(pathStr: string, create = false): Promise<{ handle: FileSystemFileHandle | FileSystemDirectoryHandle; parent: FileSystemDirectoryHandle; name: string } | null> {
    const segments = pathStr.replace(/^[/\\]+/, '').split(/[/\\]+/).filter(Boolean);
    if (segments.length === 0) {
      return { handle: rootDirHandle, parent: rootDirHandle, name: '' };
    }

    let currentDir = rootDirHandle;
    for (let i = 0; i < segments.length - 1; i++) {
      try {
        currentDir = await currentDir.getDirectoryHandle(segments[i], { create });
      } catch {
        return null;
      }
    }

    const last = segments[segments.length - 1];
    try {
      const fileHandle = await currentDir.getFileHandle(last, { create });
      return { handle: fileHandle, parent: currentDir, name: last };
    } catch {
      try {
        const dirHandle = await currentDir.getDirectoryHandle(last, { create });
        return { handle: dirHandle, parent: currentDir, name: last };
      } catch {
        return null;
      }
    }
  }

  const promises = {
    async readFile(filepath: string, options?: { encoding?: string } | string): Promise<Uint8Array | string> {
      const resolved = await resolvePath(filepath);
      if (!resolved || resolved.handle.kind !== 'file') {
        const err = new Error(`ENOENT: no such file or directory, open '${filepath}'`) as FsError;
        err.code = 'ENOENT';
        throw err;
      }
      const file = await (resolved.handle as FileSystemFileHandle).getFile();
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const encoding = typeof options === 'string' ? options : options?.encoding;
      if (encoding === 'utf8' || encoding === 'utf-8') {
        return new TextDecoder().decode(uint8);
      }
      return uint8;
    },

    async writeFile(filepath: string, data: Uint8Array | string): Promise<void> {
      const resolved = await resolvePath(filepath, true);
      if (!resolved || resolved.handle.kind !== 'file') {
        const err = new Error(`ENOENT: cannot write to directory '${filepath}'`) as FsError;
        err.code = 'ENOENT';
        throw err;
      }
      const writable = await (resolved.handle as FileSystemFileHandle).createWritable();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (writable as any).write(data);
      await writable.close();
    },

    async readdir(filepath: string): Promise<string[]> {
      const resolved = await resolvePath(filepath);
      if (!resolved || resolved.handle.kind !== 'directory') {
        const err = new Error(`ENOTDIR: not a directory, scandir '${filepath}'`) as FsError;
        err.code = 'ENOTDIR';
        throw err;
      }
      const dir = resolved.handle as FileSystemDirectoryHandle;
      const entries: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const name of (dir as any).keys()) {
        entries.push(name);
      }
      return entries;
    },

    async mkdir(filepath: string): Promise<void> {
      await resolvePath(filepath, true);
    },

    async stat(filepath: string): Promise<{ size: number; isDirectory: () => boolean; isFile: () => boolean; isSymbolicLink: () => boolean; mtimeMs: number }> {
      const resolved = await resolvePath(filepath);
      if (!resolved) {
        const err = new Error(`ENOENT: no such file or directory, stat '${filepath}'`) as FsError;
        err.code = 'ENOENT';
        throw err;
      }
      if (resolved.handle.kind === 'directory') {
        return {
          size: 0,
          isDirectory: () => true,
          isFile: () => false,
          isSymbolicLink: () => false,
          mtimeMs: Date.now()
        };
      }
      const file = await (resolved.handle as FileSystemFileHandle).getFile();
      return {
        size: file.size,
        isDirectory: () => false,
        isFile: () => true,
        isSymbolicLink: () => false,
        mtimeMs: file.lastModified
      };
    },

    async lstat(filepath: string) {
      return this.stat(filepath);
    },

    async unlink(): Promise<void> {
      // No-op for read operations
    },

    async rmdir(): Promise<void> {
      // No-op for read operations
    }
  };

  return { promises };
}

export async function extractCommitsFromLocalDirectory(
  rootDirHandle: FileSystemDirectoryHandle,
  filterEmail: string,
  onProgress?: (count: number) => void
): Promise<{ commits: CommitMetadata[]; totalFound: number }> {
  // Check if .git exists in root
  try {
    await rootDirHandle.getDirectoryHandle('.git');
  } catch {
    throw new Error('A pasta selecionada não contém um repositório Git válido (.git não encontrado).');
  }

  const fs = createFsFromDirectoryHandle(rootDirHandle);
  const normalizedFilterEmail = filterEmail.trim().toLowerCase();

  const commits: CommitMetadata[] = [];
  let totalFound = 0;

  try {
    // Read commit logs reachable from HEAD
    const logEntries = await git.log({
      fs,
      dir: '/',
      depth: 5000
    });

    for (const entry of logEntries) {
      totalFound++;
      const authorEmail = entry.commit.author.email.toLowerCase();
      if (authorEmail === normalizedFilterEmail) {
        // isomorphic-git timestamp is in seconds, convert to ISO 8601
        const dateIso = new Date(entry.commit.author.timestamp * 1000).toISOString();
        commits.push({
          sha: entry.oid,
          message: entry.commit.message,
          when: dateIso,
          authorName: entry.commit.author.name,
          authorEmail: entry.commit.author.email
        });
      }
    }

    onProgress?.(commits.length);
  } catch (err: unknown) {
    throw new Error(`Erro ao ler histórico do repositório local: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Sort chronological ascending
  commits.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());

  return {
    commits,
    totalFound
  };
}
