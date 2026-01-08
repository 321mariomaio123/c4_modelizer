import type { FlatC4Model } from "@archivisio/c4-modelizer-sdk";

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  modelCount: number;
}

export interface ModelSummary {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  model?: FlatC4Model;
}

export interface ModelDetail extends ModelSummary {
  model: FlatC4Model;
}

export interface BackupPayload {
  backupVersion: number;
  exportedAt: string;
  projects: ProjectSummary[];
  models: ModelSummary[];
}

export interface ServiceStatus {
  db: {
    status: "ok" | "down";
    latencyMs?: number;
  };
}
