import type { FlatC4Model } from "@archivisio/c4-modelizer-sdk";
import { useFlatC4Store } from "@archivisio/c4-modelizer-sdk";
import {
  ApiError,
  createModel,
  createProject,
  deleteModel,
  deleteProject,
  fetchModel,
  fetchModels,
  fetchProjects,
  updateModel,
  updateProject,
} from "@/api/api";
import type { ModelSummary, ProjectSummary } from "@interfaces/projects";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SaveStatus = "idle" | "saving" | "error";

interface ProjectContextValue {
  projects: ProjectSummary[];
  models: ModelSummary[];
  activeProjectId: string | null;
  activeModelId: string | null;
  activeProject: ProjectSummary | null;
  activeModel: ModelSummary | null;
  isLoadingProjects: boolean;
  isLoadingModels: boolean;
  isLoadingModel: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  error: string | null;
  refreshProjects: () => Promise<void>;
  refreshModels: (projectId?: string) => Promise<void>;
  selectProject: (projectId: string | null) => Promise<void>;
  selectModel: (modelId: string | null) => Promise<void>;
  createProject: (payload: { name: string; description?: string | null }) => Promise<ProjectSummary | null>;
  updateProject: (projectId: string, payload: { name: string; description?: string | null }) => Promise<ProjectSummary | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
  createModel: (projectId: string, payload: { name: string; description?: string | null }) => Promise<ModelSummary | null>;
  updateModel: (modelId: string, payload: { name: string; description?: string | null }) => Promise<ModelSummary | null>;
  deleteModel: (modelId: string) => Promise<boolean>;
  saveCurrentModel: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const STORAGE_PROJECT_ID = "c4.activeProjectId";
const STORAGE_MODEL_ID = "c4.activeModelId";

const createEmptyModel = (): FlatC4Model => ({
  systems: [],
  containers: [],
  components: [],
  codeElements: [],
  viewLevel: "system",
});

const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error.";
};

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const setModel = useFlatC4Store((state) => state.setModel);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    localStorage.getItem(STORAGE_PROJECT_ID)
  );
  const [activeModelId, setActiveModelId] = useState<string | null>(
    localStorage.getItem(STORAGE_MODEL_ID)
  );
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeProjectIdRef = useRef(activeProjectId);
  const activeModelIdRef = useRef(activeModelId);
  const isHydratingRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const loadTokenRef = useRef(0);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    activeModelIdRef.current = activeModelId;
  }, [activeModelId]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem(STORAGE_PROJECT_ID, activeProjectId);
    } else {
      localStorage.removeItem(STORAGE_PROJECT_ID);
    }
    if (activeModelId) {
      localStorage.setItem(STORAGE_MODEL_ID, activeModelId);
    } else {
      localStorage.removeItem(STORAGE_MODEL_ID);
    }
  }, [activeProjectId, activeModelId]);

  const refreshProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingProjects(false);
    }
  }, [fetchProjects]);

  const refreshModels = useCallback(async (projectId?: string) => {
    const id = projectId ?? activeProjectIdRef.current;
    if (!id) {
      setModels([]);
      setIsLoadingModels(false);
      return;
    }
    setIsLoadingModels(true);
    setError(null);
    try {
      const data = await fetchModels(id);
      setModels(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingModels(false);
    }
  }, [fetchModels]);

  const loadModel = useCallback(
    async (modelId: string) => {
      const token = loadTokenRef.current + 1;
      loadTokenRef.current = token;
      setIsLoadingModel(true);
      isHydratingRef.current = true;
      try {
        const data = await fetchModel(modelId);
        if (loadTokenRef.current !== token) return;
        setModel(data.model ?? createEmptyModel());
        setSaveStatus("idle");
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        if (loadTokenRef.current === token) {
          isHydratingRef.current = false;
          setIsLoadingModel(false);
        }
      }
    },
    [fetchModel, setModel]
  );

  const saveModelNow = useCallback(async (modelData: FlatC4Model) => {
    const modelId = activeModelIdRef.current;
    if (!modelId) return;
    setError(null);
    setSaveStatus("saving");
    try {
      await updateModel(modelId, { model: modelData });
      setSaveStatus("idle");
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveStatus("error");
      setError(getErrorMessage(err));
    }
  }, [updateModel]);

  const queueSave = useCallback(
    (modelData: FlatC4Model) => {
      if (!activeModelIdRef.current) return;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        void saveModelNow(modelData);
      }, 600);
    },
    [saveModelNow]
  );

  const saveCurrentModel = useCallback(async () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const modelId = activeModelIdRef.current;
    if (!modelId) return;
    const modelData = useFlatC4Store.getState().model;
    await saveModelNow(modelData);
  }, [saveModelNow]);

  const selectProject = useCallback(
    async (projectId: string | null) => {
      if (projectId === activeProjectIdRef.current) return;
      await saveCurrentModel();
      setActiveProjectId(projectId);
      setActiveModelId(null);
      setModels([]);
    },
    [saveCurrentModel]
  );

  const selectModel = useCallback(
    async (modelId: string | null) => {
      if (modelId === activeModelIdRef.current) return;
      await saveCurrentModel();
      setActiveModelId(modelId);
    },
    [saveCurrentModel]
  );

  const handleCreateProject = useCallback(
    async (payload: { name: string; description?: string | null }) => {
      setError(null);
      try {
        const project = await createProject(payload);
        setProjects((prev) => [project, ...prev]);
        setActiveProjectId(project.id);
        setActiveModelId(null);
        return project;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      }
    },
    [createProject]
  );

  const handleUpdateProject = useCallback(
    async (
      projectId: string,
      payload: { name: string; description?: string | null }
    ) => {
      setError(null);
      try {
        const project = await updateProject(projectId, payload);
        setProjects((prev) =>
          prev.map((item) => (item.id === project.id ? project : item))
        );
        return project;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      }
    },
    [updateProject]
  );

  const handleDeleteProject = useCallback(async (projectId: string) => {
    setError(null);
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((item) => item.id !== projectId));
      if (activeProjectIdRef.current === projectId) {
        setActiveProjectId(null);
        setActiveModelId(null);
        setModels([]);
        setModel(createEmptyModel());
      }
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    }
  }, [deleteProject, setModel]);

  const handleCreateModel = useCallback(
    async (projectId: string, payload: { name: string; description?: string | null }) => {
      setError(null);
      try {
        const model = await createModel(projectId, payload);
        setModels((prev) => [model, ...prev]);
        setProjects((prev) =>
          prev.map((item) =>
            item.id === projectId
              ? { ...item, modelCount: item.modelCount + 1 }
              : item
          )
        );
        setActiveProjectId(projectId);
        setActiveModelId(model.id);
        return model;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      }
    },
    [createModel]
  );

  const handleUpdateModel = useCallback(
    async (
      modelId: string,
      payload: { name: string; description?: string | null }
    ) => {
      setError(null);
      try {
        const model = await updateModel(modelId, payload);
        setModels((prev) =>
          prev.map((item) => (item.id === model.id ? model : item))
        );
        return model;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      }
    },
    [updateModel]
  );

  const handleDeleteModel = useCallback(async (modelId: string) => {
    setError(null);
    try {
      const projectId = models.find((item) => item.id === modelId)?.projectId;
      await deleteModel(modelId);
      setModels((prev) => prev.filter((item) => item.id !== modelId));
      if (projectId) {
        setProjects((prev) =>
          prev.map((item) =>
            item.id === projectId
              ? { ...item, modelCount: Math.max(0, item.modelCount - 1) }
              : item
          )
        );
      }
      if (activeModelIdRef.current === modelId) {
        setActiveModelId(null);
        setModel(createEmptyModel());
      }
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    }
  }, [deleteModel, models, setModel]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (isLoadingProjects) return;
    if (projects.length === 0) {
      setActiveProjectId(null);
      setActiveModelId(null);
      setModel(createEmptyModel());
      return;
    }
    if (!activeProjectIdRef.current) {
      setActiveProjectId(projects[0].id);
      return;
    }
    if (!projects.find((item) => item.id === activeProjectIdRef.current)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, isLoadingProjects, setModel]);

  useEffect(() => {
    if (!activeProjectId) {
      setModels([]);
      setActiveModelId(null);
      setModel(createEmptyModel());
      return;
    }
    void refreshModels(activeProjectId);
  }, [activeProjectId, refreshModels, setModel]);

  useEffect(() => {
    if (isLoadingModels || !activeProjectId) return;
    if (models.length === 0) {
      setActiveModelId(null);
      setModel(createEmptyModel());
      return;
    }
    if (!activeModelIdRef.current) {
      setActiveModelId(models[0].id);
      return;
    }
    if (!models.find((item) => item.id === activeModelIdRef.current)) {
      setActiveModelId(models[0].id);
    }
  }, [models, isLoadingModels, activeProjectId, setModel]);

  useEffect(() => {
    if (!activeModelId) return;
    void loadModel(activeModelId);
  }, [activeModelId, loadModel]);

  useEffect(() => {
    if (!activeModelId) {
      setSaveStatus("idle");
    }
  }, [activeModelId]);

  useEffect(() => {
    if (!activeModelId) return;
    const unsubscribe = useFlatC4Store.subscribe(
      (state) => state.model,
      (model) => {
        if (isHydratingRef.current) return;
        queueSave(model);
      }
    );
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [activeModelId, queueSave]);

  const activeProject = useMemo(
    () => projects.find((item) => item.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const activeModel = useMemo(
    () => models.find((item) => item.id === activeModelId) ?? null,
    [models, activeModelId]
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      models,
      activeProjectId,
      activeModelId,
      activeProject,
      activeModel,
      isLoadingProjects,
      isLoadingModels,
      isLoadingModel,
      saveStatus,
      lastSavedAt,
      error,
      refreshProjects,
      refreshModels,
      selectProject,
      selectModel,
      createProject: handleCreateProject,
      updateProject: handleUpdateProject,
      deleteProject: handleDeleteProject,
      createModel: handleCreateModel,
      updateModel: handleUpdateModel,
      deleteModel: handleDeleteModel,
      saveCurrentModel,
    }),
    [
      projects,
      models,
      activeProjectId,
      activeModelId,
      activeProject,
      activeModel,
      isLoadingProjects,
      isLoadingModels,
      isLoadingModel,
      saveStatus,
      lastSavedAt,
      error,
      refreshProjects,
      refreshModels,
      selectProject,
      selectModel,
      handleCreateProject,
      handleUpdateProject,
      handleDeleteProject,
      handleCreateModel,
      handleUpdateModel,
      handleDeleteModel,
      saveCurrentModel,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};
