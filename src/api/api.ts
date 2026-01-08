import type {
  BackupPayload,
  ModelDetail,
  ModelSummary,
  ProjectSummary,
  ServiceStatus,
} from "@interfaces/projects";

const API_PREFIX = `${import.meta.env.VITE_API_BASE ?? ""}/api`;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const requestJson = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error || message;
    } catch {
      // ignore JSON parsing errors
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const requestBlob = async (path: string): Promise<Blob> => {
  const response = await fetch(`${API_PREFIX}${path}`);
  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error || message;
    } catch {
      // ignore JSON parsing errors
    }
    throw new ApiError(message, response.status);
  }
  return response.blob();
};

export const fetchStatus = () => requestJson<ServiceStatus>("/status");

export const fetchProjects = () => requestJson<ProjectSummary[]>("/projects");

export const createProject = (payload: {
  name: string;
  description?: string | null;
}) =>
  requestJson<ProjectSummary>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateProject = (
  projectId: string,
  payload: { name: string; description?: string | null }
) =>
  requestJson<ProjectSummary>(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteProject = (projectId: string) =>
  requestJson<void>(`/projects/${projectId}`, { method: "DELETE" });

export const fetchModels = (projectId: string) =>
  requestJson<ModelSummary[]>(`/projects/${projectId}/models`);

export const createModel = (
  projectId: string,
  payload: { name: string; description?: string | null; model?: unknown }
) =>
  requestJson<ModelSummary>(`/projects/${projectId}/models`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchModel = (modelId: string) =>
  requestJson<ModelDetail>(`/models/${modelId}`);

export const updateModel = (
  modelId: string,
  payload: { name?: string; description?: string | null; model?: unknown }
) =>
  requestJson<ModelDetail>(`/models/${modelId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteModel = (modelId: string) =>
  requestJson<void>(`/models/${modelId}`, { method: "DELETE" });

export const downloadBackup = () => requestBlob("/backup");

export const restoreBackup = (payload: BackupPayload) =>
  requestJson<{ status: string }>("/restore", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export { ApiError };
