import ConfirmDialog from "@components/common/ConfirmDialog";
import { useProjects } from "@contexts/ProjectContext";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FolderIcon from "@mui/icons-material/Folder";
import LayersIcon from "@mui/icons-material/Layers";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ModelSummary, ProjectSummary } from "@interfaces/projects";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import EntityFormDialog from "./EntityFormDialog";

interface ProjectManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

type DeleteTarget =
  | { type: "project"; item: ProjectSummary }
  | { type: "model"; item: ModelSummary };

const ProjectManagerDialog: React.FC<ProjectManagerDialogProps> = ({
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const {
    projects,
    models,
    activeProjectId,
    activeModelId,
    isLoadingProjects,
    isLoadingModels,
    createProject,
    updateProject,
    deleteProject,
    createModel,
    updateModel,
    deleteModel,
    selectProject,
    selectModel,
  } = useProjects();

  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [modelFormOpen, setModelFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(
    null
  );
  const [editingModel, setEditingModel] = useState<ModelSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    if (open) return;
    setProjectFormOpen(false);
    setModelFormOpen(false);
    setEditingProject(null);
    setEditingModel(null);
    setDeleteTarget(null);
  }, [open]);

  const activeProject = useMemo(
    () => projects.find((item) => item.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const handleProjectSubmit = async (name: string, description: string | null) => {
    if (editingProject) {
      await updateProject(editingProject.id, { name, description });
    } else {
      await createProject({ name, description });
    }
    setProjectFormOpen(false);
    setEditingProject(null);
  };

  const handleModelSubmit = async (name: string, description: string | null) => {
    if (!activeProjectId) return;
    if (editingModel) {
      await updateModel(editingModel.id, { name, description });
    } else {
      await createModel(activeProjectId, { name, description });
    }
    setModelFormOpen(false);
    setEditingModel(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "project") {
      await deleteProject(deleteTarget.item.id);
    } else {
      await deleteModel(deleteTarget.item.id);
    }
    setDeleteTarget(null);
  };

  const handleSelectModel = async (modelId: string) => {
    await selectModel(modelId);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>{t("projects_models_title")}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
            }}
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <FolderIcon fontSize="small" />
                <Typography variant="h6">{t("projects")}</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingProject(null);
                    setProjectFormOpen(true);
                  }}
                >
                  {t("create_project")}
                </Button>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {isLoadingProjects ? (
                <Stack alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </Stack>
              ) : (
                <List>
                  {projects.map((project) => (
                    <ListItem
                      key={project.id}
                      disablePadding
                      secondaryAction={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            size="small"
                            label={`${project.modelCount} ${t("models")}`}
                          />
                          <Tooltip title={t("edit_project")} arrow>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingProject(project);
                                setProjectFormOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("delete")} arrow>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setDeleteTarget({ type: "project", item: project })
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                    >
                      <ListItemButton
                        selected={project.id === activeProjectId}
                        onClick={() => selectProject(project.id)}
                      >
                        <ListItemText
                          primary={project.name}
                          secondary={project.description || t("project_no_description")}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                  {projects.length === 0 && (
                    <Typography color="text.secondary" sx={{ px: 2, py: 1 }}>
                      {t("no_projects")}
                    </Typography>
                  )}
                </List>
              )}
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <LayersIcon fontSize="small" />
                <Typography variant="h6">{t("models")}</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingModel(null);
                    setModelFormOpen(true);
                  }}
                  disabled={!activeProjectId}
                >
                  {t("create_model")}
                </Button>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {activeProject ? (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t("active_project_label", { name: activeProject.name })}
                  </Typography>
                  {isLoadingModels ? (
                    <Stack alignItems="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} />
                    </Stack>
                  ) : (
                    <List>
                      {models.map((model) => (
                        <ListItem
                          key={model.id}
                          disablePadding
                          secondaryAction={
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title={t("edit_model")} arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingModel(model);
                                    setModelFormOpen(true);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t("delete")} arrow>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setDeleteTarget({ type: "model", item: model })
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          }
                        >
                          <ListItemButton
                            selected={model.id === activeModelId}
                            onClick={() => handleSelectModel(model.id)}
                          >
                            <ListItemText
                              primary={model.name}
                              secondary={model.description || t("model_no_description")}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                      {models.length === 0 && (
                        <Typography color="text.secondary" sx={{ px: 2, py: 1 }}>
                          {t("no_models")}
                        </Typography>
                      )}
                    </List>
                  )}
                </>
              ) : (
                <Typography color="text.secondary" sx={{ px: 2, py: 1 }}>
                  {t("select_project_to_manage_models")}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("close")}</Button>
        </DialogActions>
      </Dialog>

      <EntityFormDialog
        open={projectFormOpen}
        title={editingProject ? t("edit_project") : t("create_project")}
        nameLabel={t("project_name")}
        descriptionLabel={t("project_description")}
        initialName={editingProject?.name ?? ""}
        initialDescription={editingProject?.description ?? ""}
        onSave={handleProjectSubmit}
        onClose={() => {
          setProjectFormOpen(false);
          setEditingProject(null);
        }}
      />

      <EntityFormDialog
        open={modelFormOpen}
        title={editingModel ? t("edit_model") : t("create_model")}
        nameLabel={t("model_name")}
        descriptionLabel={t("model_description")}
        initialName={editingModel?.name ?? ""}
        initialDescription={editingModel?.description ?? ""}
        onSave={handleModelSubmit}
        onClose={() => {
          setModelFormOpen(false);
          setEditingModel(null);
        }}
      />

      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title={t("confirm_delete")}
          content={
            deleteTarget.type === "project"
              ? t("delete_project_confirmation", { name: deleteTarget.item.name })
              : t("delete_model_confirmation", { name: deleteTarget.item.name })
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          confirmText={t("delete")}
          cancelText={t("cancel")}
        />
      )}
    </>
  );
};

export default ProjectManagerDialog;
