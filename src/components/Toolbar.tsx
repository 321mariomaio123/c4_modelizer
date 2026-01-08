import { FlatC4Model } from "@archivisio/c4-modelizer-sdk";
import { ToolbarIconButton } from "@components/common/ToolbarIconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SettingsIcon from "@mui/icons-material/Settings";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  AppBar,
  Chip,
  CircularProgress,
  Stack,
  Toolbar as MuiToolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled } from "@mui/system";
import PortalTarget from "@slots/PortalTarget";
import React, { forwardRef, useRef } from "react";
import { useTranslation } from "react-i18next";

const StyledAppBar = styled(AppBar)(() => ({
  background: "linear-gradient(90deg, #051937 0%, #004d7a 100%)",
  borderBottom: "1px solid rgba(81, 162, 255, 0.2)",
}));

const AppTitle = styled(Typography)(() => ({
  flexGrow: 1,
  fontWeight: 600,
  background: "linear-gradient(90deg, #51a2ff 0%, #8ed6ff 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: "0.5px",
}));

const HiddenInput = styled("input")(() => ({
  display: "none",
}));

export interface ToolbarProps {
  onAddSystem: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  currentProjectName?: string;
  currentModelName?: string;
  actionsDisabled?: boolean;
  saveStatus?: "idle" | "saving" | "error";
  model: FlatC4Model;
}

const Toolbar = forwardRef<HTMLButtonElement, ToolbarProps>(
  (
    {
      onAddSystem,
      onExport,
      onImport,
      onReset,
      onOpenProjects,
      onOpenSettings,
      currentProjectName,
      currentModelName,
      actionsDisabled = false,
      saveStatus = "idle",
      model,
    }: ToolbarProps,
    resetButtonRef: React.Ref<HTMLButtonElement>
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();
    const projectLabel = currentProjectName
      ? `${t("project")}: ${currentProjectName}`
      : t("no_project_selected");
    const modelLabel = currentModelName
      ? `${t("model")}: ${currentModelName}`
      : t("no_model_selected");
    const chipStyles = {
      bgcolor: "rgba(81, 162, 255, 0.15)",
      color: "#fff",
      borderColor: "rgba(81, 162, 255, 0.4)",
    };

    return (
      <StyledAppBar position="static" elevation={0}>
        <MuiToolbar>
          <AppTitle variant="h6">
            {t("app_title", { Level: model.viewLevel })}
          </AppTitle>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mr: 2, display: { xs: "none", md: "flex" } }}
          >
            <Tooltip title={projectLabel} arrow>
              <Chip size="small" label={projectLabel} variant="outlined" sx={chipStyles} />
            </Tooltip>
            <Tooltip title={modelLabel} arrow>
              <Chip size="small" label={modelLabel} variant="outlined" sx={chipStyles} />
            </Tooltip>
            {saveStatus === "saving" && <CircularProgress size={16} />}
            {saveStatus === "error" && (
              <Tooltip title={t("save_failed")} arrow>
                <ErrorOutlineIcon fontSize="small" color="error" />
              </Tooltip>
            )}
          </Stack>
          <PortalTarget id="toolbar-actions-before" />
          <Tooltip title={t("manage_projects")} arrow>
            <div>
              <ToolbarIconButton
                data-testid="toolbar-open-projects"
                onClick={onOpenProjects}
                aria-label={t("manage_projects")}
              >
                <FolderOpenIcon />
              </ToolbarIconButton>
            </div>
          </Tooltip>
          <Tooltip title={t("open_settings")} arrow>
            <div>
              <ToolbarIconButton
                data-testid="toolbar-open-settings"
                onClick={onOpenSettings}
                aria-label={t("open_settings")}
              >
                <SettingsIcon />
              </ToolbarIconButton>
            </div>
          </Tooltip>
          <Tooltip title={t("add_block")} arrow>
            <div>
              <ToolbarIconButton
                data-testid="toolbar-add-system"
                onClick={onAddSystem}
                aria-label={t("add_block")}
                disabled={actionsDisabled}
              >
                <AddIcon />
              </ToolbarIconButton>
            </div>
          </Tooltip>
          <Tooltip title={t("export_json")} arrow>
            <div>
              <ToolbarIconButton
                data-testid="toolbar-export-model"
                onClick={onExport}
                aria-label={t("export_json")}
                disabled={actionsDisabled}
              >
                <DownloadIcon />
              </ToolbarIconButton>
            </div>
          </Tooltip>
          <Tooltip title={t("import_json")} arrow>
            <div>
              <ToolbarIconButton
                data-testid="toolbar-import-model"
                onClick={() => fileInputRef.current?.click()}
                aria-label={t("import_json")}
                disabled={actionsDisabled}
              >
                <UploadFileIcon />
                <HiddenInput
                  type="file"
                  accept="application/json"
                  ref={fileInputRef}
                  data-testid="toolbar-file-input"
                  onChange={onImport}
                />
              </ToolbarIconButton>
            </div>
          </Tooltip>
          <Tooltip title={t("reset_store")} arrow>
            <div>
              <ToolbarIconButton
                data-testid="toolbar-reset-model"
                onClick={onReset}
                aria-label={t("reset_store")}
                ref={resetButtonRef as React.Ref<HTMLButtonElement>}
                disabled={actionsDisabled}
                sx={{ marginRight: 0 }}
              >
                <DeleteIcon />
              </ToolbarIconButton>
            </div>
          </Tooltip>
          <PortalTarget id="toolbar-actions-after" />
        </MuiToolbar>
      </StyledAppBar>
    );
  }
);

export default Toolbar;
