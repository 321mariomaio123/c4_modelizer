import FolderIcon from "@mui/icons-material/Folder";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";

interface ModelEmptyStateProps {
  isLoading: boolean;
  onOpenProjects: () => void;
}

const ModelEmptyState: React.FC<ModelEmptyStateProps> = ({
  isLoading,
  onOpenProjects,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 2,
      }}
    >
      {isLoading ? (
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="subtitle1">{t("loading_model")}</Typography>
        </Stack>
      ) : (
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5">{t("model_empty_title")}</Typography>
          <Typography variant="body1" color="text.secondary">
            {t("model_empty_body")}
          </Typography>
          <Button
            variant="contained"
            startIcon={<FolderIcon />}
            onClick={onOpenProjects}
          >
            {t("manage_projects")}
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default ModelEmptyState;
