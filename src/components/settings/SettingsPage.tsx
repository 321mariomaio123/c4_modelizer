import ConfirmDialog from "@components/common/ConfirmDialog";
import { downloadBackup, fetchStatus, restoreBackup } from "@/api/api";
import { useProjects } from "@contexts/ProjectContext";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import StorageIcon from "@mui/icons-material/Storage";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import type { BackupPayload, ServiceStatus } from "@interfaces/projects";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { refreshProjects } = useProjects();
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setStatus(data);
      setStatusError(null);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Status unavailable.");
      setStatus({ db: { status: "down" } });
    }
  }, [fetchStatus]);

  useEffect(() => {
    void loadStatus();
    const interval = window.setInterval(loadStatus, 15000);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const handleBackup = async () => {
    setIsBackingUp(true);
    setNotice(null);
    try {
      const blob = await downloadBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "c4-modelizer-backup.json";
      link.click();
      URL.revokeObjectURL(url);
      setNotice({ type: "success", message: t("backup_success") });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : t("backup_failed"),
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setRestoreFile(file);
    setConfirmRestore(true);
  };

  const handleRestoreConfirm = async () => {
    if (!restoreFile) return;
    setIsRestoring(true);
    setNotice(null);
    try {
      const text = await restoreFile.text();
      const payload = JSON.parse(text) as BackupPayload;
      await restoreBackup(payload);
      await refreshProjects();
      setNotice({ type: "success", message: t("restore_success") });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : t("restore_failed"),
      });
    } finally {
      setIsRestoring(false);
      setConfirmRestore(false);
      setRestoreFile(null);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0a1929", color: "#fff" }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "#051937" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">{t("settings_title")}</Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "rgba(19, 47, 76, 0.9)",
              border: "1px solid rgba(81, 162, 255, 0.2)",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <StorageIcon fontSize="small" />
              <Typography variant="h6">{t("database_status")}</Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={
                  status?.db.status === "ok" ? t("status_ok") : t("status_down")
                }
                color={status?.db.status === "ok" ? "success" : "error"}
              />
              {status?.db.latencyMs !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  {t("latency_ms", { value: status.db.latencyMs })}
                </Typography>
              )}
              {statusError && (
                <Typography variant="body2" color="error">
                  {statusError}
                </Typography>
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "rgba(19, 47, 76, 0.9)",
              border: "1px solid rgba(81, 162, 255, 0.2)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t("backup_restore")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("restore_warning")}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<CloudDownloadIcon />}
                onClick={handleBackup}
                disabled={isBackingUp}
              >
                {isBackingUp ? t("backup_in_progress") : t("backup_database")}
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                component="label"
                disabled={isRestoring}
              >
                {isRestoring ? t("restore_in_progress") : t("restore_database")}
                <input
                  hidden
                  type="file"
                  accept="application/json"
                  onChange={handleRestoreFile}
                />
              </Button>
              {isRestoring && <CircularProgress size={24} />}
            </Stack>
          </Box>

          {notice && (
            <Alert severity={notice.type} onClose={() => setNotice(null)}>
              {notice.message}
            </Alert>
          )}
        </Stack>
      </Container>

      <ConfirmDialog
        open={confirmRestore}
        title={t("restore_confirm_title")}
        content={t("restore_confirm_body")}
        onCancel={() => {
          setConfirmRestore(false);
          setRestoreFile(null);
        }}
        onConfirm={handleRestoreConfirm}
        confirmText={t("restore_database")}
        cancelText={t("cancel")}
      />
    </Box>
  );
};

export default SettingsPage;
