import { Octokit } from '@octokit/rest';
import crypto from 'crypto';
import type { Repository, CodeFile, InsertCodeFile } from '@shared/schema';

export class GitHubIntegration {
  private octokit: Octokit;

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth: accessToken || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Parse GitHub URL to extract owner and repo name
   */
  parseGitHubUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL');
    }
    return { owner: match[1], repo: match[2].replace('.git', '') };
  }

  /**
   * Fetch repository information
   */
  async getRepository(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.repos.get({ owner, repo });
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch repository: ${error?.message || error}`);
    }
  }

  /**
   * Get default branch
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const repoData = await this.getRepository(owner, repo);
    return repoData.default_branch;
  }

  /**
   * Get latest commit SHA for a branch
   */
  async getLatestCommit(owner: string, repo: string, branch: string): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch,
      });
      return data.commit.sha;
    } catch (error: any) {
      throw new Error(`Failed to fetch latest commit: ${error?.message || error}`);
    }
  }

  /**
   * List COBOL files in repository
   */
  async listCobolFiles(
    owner: string,
    repo: string,
    branch: string = 'main',
    path: string = ''
  ): Promise<Array<{ path: string; name: string; sha: string; size: number }>> {
    const cobolFiles: Array<{ path: string; name: string; sha: string; size: number }> = [];

    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.type === 'file') {
            const extension = item.name.toLowerCase().match(/\.(cbl|cob|cpy|jcl)$/);
            if (extension) {
              cobolFiles.push({
                path: item.path,
                name: item.name,
                sha: item.sha,
                size: item.size,
              });
            }
          } else if (item.type === 'dir') {
            // Recursively search directories
            const subFiles = await this.listCobolFiles(owner, repo, branch, item.path);
            cobolFiles.push(...subFiles);
          }
        }
      }
    } catch (error: any) {
      console.error(`Error listing files in ${path}:`, error?.message || error);
    }

    return cobolFiles;
  }

  /**
   * Fetch file content
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      throw new Error('File content not available');
    } catch (error: any) {
      throw new Error(`Failed to fetch file content: ${error?.message || error}`);
    }
  }

  /**
   * Fetch all COBOL files from repository
   */
  async fetchAllCobolFiles(
    owner: string,
    repo: string,
    branch: string = 'main',
    repositoryId: number
  ): Promise<Partial<InsertCodeFile>[]> {
    const files = await this.listCobolFiles(owner, repo, branch);
    const codeFiles: Partial<InsertCodeFile>[] = [];

    for (const file of files) {
      try {
        const content = await this.getFileContent(owner, repo, file.path, branch);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        
        let language = 'COBOL';
        if (file.name.toLowerCase().endsWith('.jcl')) {
          language = 'JCL';
        } else if (file.name.toLowerCase().endsWith('.cpy')) {
          language = 'COPYBOOK';
        }

        codeFiles.push({
          repositoryId,
          filePath: file.path,
          fileName: file.name,
          content,
          language,
          version: branch,
          hash,
          size: file.size,
          lastModified: new Date(),
        });
      } catch (error: any) {
        console.error(`Error fetching file ${file.path}:`, error?.message || error);
      }
    }

    return codeFiles;
  }

  /**
   * Create webhook for repository
   */
  async createWebhook(
    owner: string,
    repo: string,
    webhookUrl: string,
    secret: string
  ): Promise<number | null> {
    try {
      const { data } = await this.octokit.repos.createWebhook({
        owner,
        repo,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret,
        },
        events: ['push', 'pull_request'],
        active: true,
      });
      return data.id;
    } catch (error: any) {
      console.error('Failed to create webhook:', error?.message || error);
      return null;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    try {
      await this.octokit.repos.deleteWebhook({
        owner,
        repo,
        hook_id: hookId,
      });
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  }

  /**
   * Get changed files between two commits
   */
  async getChangedFiles(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<Array<{ filename: string; status: string; additions: number; deletions: number }>> {
    try {
      const { data } = await this.octokit.repos.compareCommits({
        owner,
        repo,
        base,
        head,
      });
      return data.files || [];
    } catch (error: any) {
      throw new Error(`Failed to compare commits: ${error?.message || error}`);
    }
  }

  /**
   * Validate GitHub access token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.octokit.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance for app-wide use
export const githubIntegration = new GitHubIntegration();