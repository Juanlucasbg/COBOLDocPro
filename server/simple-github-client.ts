/**
 * Simple GitHub client that works without API tokens by using raw.githubusercontent.com
 * This avoids rate limiting issues for public repositories
 */

export interface GitHubFile {
  name: string;
  path: string;
  content: string;
  size: number;
}

export class SimpleGitHubClient {
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
   * Fetch file content directly from raw.githubusercontent.com
   */
  async fetchRawFile(owner: string, repo: string, branch: string, path: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
    }
    
    return response.text();
  }

  /**
   * Fetch all COBOL files from a repository using GitHub's tree API (no auth required for public repos)
   */
  async fetchAllCobolFiles(owner: string, repo: string, branch: string = 'main'): Promise<GitHubFile[]> {
    const files: GitHubFile[] = [];
    
    try {
      // Try to get the repository tree from GitHub API (no auth needed for public repos)
      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
      const response = await fetch(treeUrl);
      
      if (!response.ok) {
        console.log(`GitHub API unavailable, trying alternative approach...`);
        // Fallback to common COBOL file locations
        return this.fetchCommonCobolFiles(owner, repo, branch);
      }
      
      const data = await response.json();
      
      // Filter for COBOL files
      const cobolPaths = data.tree.filter((item: any) => 
        item.type === 'blob' && 
        item.path.match(/\.(cbl|cob|cpy|jcl)$/i)
      );
      
      console.log(`Found ${cobolPaths.length} COBOL files in ${owner}/${repo}`);
      
      // Fetch content for each file
      for (const file of cobolPaths) {
        try {
          const content = await this.fetchRawFile(owner, repo, branch, file.path);
          files.push({
            name: file.path.split('/').pop() || file.path,
            path: file.path,
            content,
            size: file.size || content.length,
          });
        } catch (error) {
          console.error(`Failed to fetch ${file.path}:`, error);
        }
      }
      
    } catch (error) {
      console.error(`Error accessing repository ${owner}/${repo}:`, error);
      throw new Error(`Repository not accessible: ${error}`);
    }
    
    return files;
  }

  /**
   * Fallback method to try common COBOL file locations
   */
  private async fetchCommonCobolFiles(owner: string, repo: string, branch: string): Promise<GitHubFile[]> {
    const commonPaths = [
      'src',
      'source', 
      'cobol',
      'programs',
      'cbl',
      'copybooks',
      'copy',
    ];
    
    const files: GitHubFile[] = [];
    
    for (const basePath of commonPaths) {
      try {
        // Try to fetch some common file extensions from these paths
        const testFiles = [
          `${basePath}/HELLO.CBL`,
          `${basePath}/MAIN.COB`,
          `${basePath}/TEST.CBL`,
          `${basePath}/hello.cbl`,
          `${basePath}/main.cob`,
          `${basePath}/test.cbl`,
          `HELLO.CBL`,
          `MAIN.COB`,
          `TEST.CBL`,
          `hello.cbl`,
          `main.cob`,
          `test.cbl`,
          `README.md`,
          `readme.txt`,
        ];
        
        for (const testFile of testFiles) {
          try {
            const content = await this.fetchRawFile(owner, repo, branch, testFile);
            if (testFile.match(/\.(cbl|cob|cpy|jcl)$/i)) {
              files.push({
                name: testFile.split('/').pop() || testFile,
                path: testFile,
                content,
                size: content.length,
              });
            }
          } catch {
            // File doesn't exist, continue
          }
        }
      } catch {
        // Path doesn't exist, continue
      }
    }
    
    if (files.length === 0) {
      throw new Error('No COBOL files found in repository. Please ensure the repository contains .cbl, .cob, .cpy, or .jcl files.');
    }
    
    return files;
  }

  /**
   * Check if repository exists and is accessible
   */
  async validateRepository(owner: string, repo: string): Promise<{ exists: boolean; defaultBranch?: string }> {
    try {
      // Try to access the repository without authentication
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return { 
          exists: true, 
          defaultBranch: data.default_branch 
        };
      }
      
      return { exists: false };
    } catch (error) {
      return { exists: false };
    }
  }
}