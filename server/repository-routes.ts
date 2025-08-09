import type { Express } from "express";
import { storage } from "./storage";
import { GitHubIntegration } from "./github-integration";
import { CobolParser } from "./cobol-parser";
import { insertRepositorySchema, insertCodeFileSchema } from "@shared/schema";
import { z } from "zod";

export function registerRepositoryRoutes(app: Express) {
  // Get all repositories
  app.get("/api/repositories", async (req, res) => {
    try {
      const repositories = await storage.getAllRepositories();
      res.json(repositories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  // Get single repository
  app.get("/api/repositories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      res.json(repository);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repository" });
    }
  });

  // Connect to GitHub repository
  app.post("/api/repositories/connect", async (req, res) => {
    try {
      const connectSchema = z.object({
        githubUrl: z.string().url(),
        accessToken: z.string().optional(),
        branch: z.string().optional().default("main"),
      });

      const { githubUrl, accessToken, branch } = connectSchema.parse(req.body);
      
      // Initialize GitHub integration
      const github = new GitHubIntegration(accessToken);
      
      // Parse GitHub URL
      const { owner, repo } = github.parseGitHubUrl(githubUrl);
      
      // Validate repository access
      const repoData = await github.getRepository(owner, repo);
      
      // Get latest commit
      const latestCommit = await github.getLatestCommit(owner, repo, branch || repoData.default_branch);
      
      // Create repository record
      const repository = await storage.createRepository({
        userId: 1, // TODO: Get from session
        githubUrl,
        owner,
        name: repo,
        branch: branch || repoData.default_branch,
        lastSyncedCommit: latestCommit,
        syncStatus: "pending",
        accessToken: accessToken || null,
      });
      
      res.json(repository);
    } catch (error: any) {
      console.error("Failed to connect repository:", error);
      res.status(400).json({ message: error?.message || "Failed to connect to repository" });
    }
  });

  // Sync repository
  app.post("/api/repositories/:id/sync", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      // Update sync status
      await storage.updateRepository(id, { syncStatus: "syncing" });
      
      // Initialize GitHub integration
      const github = new GitHubIntegration(repository.accessToken || undefined);
      
      // Fetch all COBOL files
      const files = await github.fetchAllCobolFiles(
        repository.owner,
        repository.name,
        repository.branch,
        repository.id
      );
      
      // Parse and store files
      const parser = new CobolParser();
      for (const file of files) {
        try {
          // Create code file record
          const codeFile = await storage.createCodeFile(file as any);
          
          // Parse COBOL and create program record
          const parsedProgram = parser.parse(file.content || '');
          const program = await storage.createProgram({
            name: parsedProgram.programName || file.fileName || '',
            filename: file.fileName || '',
            sourceCode: file.content || '',
            linesOfCode: (file.content || '').split('\n').length,
            status: 'pending',
          });
          
          // Link code file to program
          await storage.updateCodeFile(codeFile.id, { programId: program.id });
          
          // Extract data elements
          if (parsedProgram.dataElements) {
            for (const element of parsedProgram.dataElements) {
              await storage.createDataElement({
                programId: program.id,
                name: element.name,
                picture: element.picture || null,
                level: element.level || null,
                usage: element.usage || null,
                description: element.description || null,
                parentElement: element.parent || null,
                usedInPrograms: null,
              });
            }
          }
        } catch (error: any) {
          console.error(`Failed to process file ${file.fileName}:`, error);
        }
      }
      
      // Get latest commit
      const latestCommit = await github.getLatestCommit(
        repository.owner,
        repository.name,
        repository.branch
      );
      
      // Update repository status
      await storage.updateRepository(id, {
        syncStatus: "completed",
        lastSyncedCommit: latestCommit,
        updatedAt: new Date(),
      });
      
      res.json({ message: "Repository synced successfully", filesProcessed: files.length });
    } catch (error: any) {
      console.error("Failed to sync repository:", error);
      
      // Update repository status to failed
      if (req.params.id) {
        await storage.updateRepository(parseInt(req.params.id), {
          syncStatus: "failed",
        });
      }
      
      res.status(500).json({ message: error?.message || "Failed to sync repository" });
    }
  });

  // Get repository files
  app.get("/api/repositories/:id/files", async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      const files = await storage.getCodeFilesByRepository(repositoryId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repository files" });
    }
  });

  // Delete repository
  app.delete("/api/repositories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRepository(id);
      res.json({ message: "Repository deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete repository" });
    }
  });

  // Create webhook
  app.post("/api/repositories/:id/webhook", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      const webhookUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/webhooks/github`;
      const secret = process.env.WEBHOOK_SECRET || 'cobol-clarity-webhook-secret';
      
      const github = new GitHubIntegration(repository.accessToken || undefined);
      const webhookId = await github.createWebhook(
        repository.owner,
        repository.name,
        webhookUrl,
        secret
      );
      
      if (webhookId) {
        await storage.updateRepository(id, { webhookId: webhookId.toString() });
        res.json({ message: "Webhook created successfully", webhookId });
      } else {
        res.status(400).json({ message: "Failed to create webhook" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to create webhook" });
    }
  });

  // GitHub webhook handler
  app.post("/api/webhooks/github", async (req, res) => {
    try {
      const event = req.headers['x-github-event'];
      const payload = req.body;
      
      if (event === 'push') {
        // Find repository by URL
        const repositories = await storage.getAllRepositories();
        const repository = repositories.find(r => 
          r.githubUrl.includes(`${payload.repository.owner.login}/${payload.repository.name}`)
        );
        
        if (repository) {
          // Trigger sync in background
          setTimeout(async () => {
            try {
              // Sync repository
              const github = new GitHubIntegration(repository.accessToken || undefined);
              const changedFiles = await github.getChangedFiles(
                repository.owner,
                repository.name,
                repository.lastSyncedCommit || '',
                payload.after
              );
              
              // Process only changed COBOL files
              for (const file of changedFiles) {
                if (file.filename.match(/\.(cbl|cob|cpy|jcl)$/i)) {
                  // Fetch and update file content
                  const content = await github.getFileContent(
                    repository.owner,
                    repository.name,
                    file.filename,
                    payload.after
                  );
                  
                  // Update or create code file
                  const existingFiles = await storage.getCodeFilesByRepository(repository.id);
                  const existingFile = existingFiles.find(f => f.filePath === file.filename);
                  
                  if (existingFile) {
                    await storage.updateCodeFile(existingFile.id, {
                      content,
                      version: payload.after,
                      lastModified: new Date(),
                    });
                  }
                }
              }
              
              // Update repository commit
              await storage.updateRepository(repository.id, {
                lastSyncedCommit: payload.after,
                updatedAt: new Date(),
              });
            } catch (error) {
              console.error("Failed to process webhook:", error);
            }
          }, 0);
        }
      }
      
      res.json({ message: "Webhook processed" });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });
}