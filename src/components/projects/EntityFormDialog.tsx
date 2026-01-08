import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface EntityFormDialogProps {
  open: boolean;
  title: string;
  nameLabel: string;
  descriptionLabel: string;
  initialName?: string;
  initialDescription?: string | null;
  onSave: (name: string, description: string | null) => void;
  onClose: () => void;
}

const EntityFormDialog: React.FC<EntityFormDialogProps> = ({
  open,
  title,
  nameLabel,
  descriptionLabel,
  initialName = "",
  initialDescription = "",
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription(initialDescription ?? "");
  }, [open, initialName, initialDescription]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedDescription = description.trim();
    onSave(trimmedName, trimmedDescription ? trimmedDescription : null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
        <TextField
          label={nameLabel}
          value={name}
          onChange={(event) => setName(event.target.value)}
          fullWidth
          autoFocus
        />
        <TextField
          label={descriptionLabel}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          fullWidth
          multiline
          minRows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button onClick={handleSave} variant="contained" disabled={!name.trim()}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EntityFormDialog;
