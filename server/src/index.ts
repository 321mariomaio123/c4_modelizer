import express, { type NextFunction, type Request, type Response } from "express";
import { Pool } from "pg";
import { createUuid } from "./uuid.js";

type ViewLevel = "system" | "container" | "component" | "code";

interface FlatC4Model {
  systems: unknown[];
  containers: unknown[];
  components: unknown[];
  codeElements: unknown[];
  viewLevel: ViewLevel;
  activeSystemId?: string;
  activeContainerId?: string;
  activeComponentId?: string;
}

type QueryResult<Row> = { rows: Row[]; rowCount?: number };
type PoolQuery = <Row = unknown>(
  text: string,
  params?: unknown[]
) => Promise<QueryResult<Row>>;

interface PoolClientLike {
  query: PoolQuery;
  release: () => void;
}

export interface PoolLike {
  query: PoolQuery;
  connect: () => Promise<PoolClientLike>;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  model_count?: string | number | null;
  modelCount?: string | number | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  modelCount: number;
}

interface ModelRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  model_data?: unknown;
}

interface ModelSummary {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  model?: unknown;
}

interface RestoreProject {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface RestoreModel {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  model?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export const createEmptyModel = (): FlatC4Model => ({
  systems: [],
  containers: [],
  components: [],
  codeElements: [],
  viewLevel: "system",
});

const parseJson = (value: unknown): unknown => {
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
};

const parseCount = (value: string | number | null | undefined): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const mapProjectRow = (row: ProjectRow): ProjectSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  modelCount: parseCount(row.model_count ?? row.modelCount),
});

const mapModelRow = (row: ModelRow): ModelSummary => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  model: row.model_data ? parseJson(row.model_data) : undefined,
});

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

const asyncHandler = (handler: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};

export const ensureSchema = async (pool: PoolLike) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS models (
      id uuid PRIMARY KEY,
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      model_data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_models_project_id ON models(project_id);
  `);
};

export const createApp = ({ pool }: { pool: PoolLike }) => {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid JSON payload." });
      return;
    }
    next(err);
  });

  app.get(
    "/api/status",
    asyncHandler(async (_req, res) => {
      const start = Date.now();
      await pool.query("SELECT 1");
      res.json({
        db: {
          status: "ok",
          latencyMs: Date.now() - start,
        },
      });
    })
  );

  app.get(
    "/api/projects",
    asyncHandler(async (_req, res) => {
      const result = await pool.query<ProjectRow>(`
        SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
               COUNT(m.id) AS model_count
        FROM projects p
        LEFT JOIN models m ON m.project_id = p.id
        GROUP BY p.id
        ORDER BY p.updated_at DESC
      `);
      res.json(result.rows.map(mapProjectRow));
    })
  );

  app.post(
    "/api/projects",
    asyncHandler(async (req, res) => {
      const { name, description } = req.body ?? {};
      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Project name is required." });
        return;
      }
      const id = createUuid();
      const result = await pool.query<ProjectRow>(
        `
          INSERT INTO projects (id, name, description)
          VALUES ($1, $2, $3)
          RETURNING id, name, description, created_at, updated_at
        `,
        [id, name.trim(), description ?? null]
      );
      res.status(201).json(mapProjectRow(result.rows[0]));
    })
  );

  app.put(
    "/api/projects/:projectId",
    asyncHandler(async (req, res) => {
      const { projectId } = req.params;
      const { name, description } = req.body ?? {};
      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Project name is required." });
        return;
      }
      const result = await pool.query<ProjectRow>(
        `
          UPDATE projects
          SET name = $2, description = $3, updated_at = now()
          WHERE id = $1
          RETURNING id, name, description, created_at, updated_at
        `,
        [projectId, name.trim(), description ?? null]
      );
      if (result.rowCount === 0) {
        res.status(404).json({ error: "Project not found." });
        return;
      }
      res.json(mapProjectRow(result.rows[0]));
    })
  );

  app.delete(
    "/api/projects/:projectId",
    asyncHandler(async (req, res) => {
      const { projectId } = req.params;
      const result = await pool.query("DELETE FROM projects WHERE id = $1", [
        projectId,
      ]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: "Project not found." });
        return;
      }
      res.status(204).send();
    })
  );

  app.get(
    "/api/projects/:projectId/models",
    asyncHandler(async (req, res) => {
      const { projectId } = req.params;
      const result = await pool.query<ModelRow>(
        `
          SELECT id, project_id, name, description, created_at, updated_at
          FROM models
          WHERE project_id = $1
          ORDER BY updated_at DESC
        `,
        [projectId]
      );
      res.json(result.rows.map(mapModelRow));
    })
  );

  app.post(
    "/api/projects/:projectId/models",
    asyncHandler(async (req, res) => {
      const { projectId } = req.params;
      const { name, description, model } = req.body ?? {};
      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Model name is required." });
        return;
      }
      const id = createUuid();
      const modelData = model ?? createEmptyModel();
      const result = await pool.query<ModelRow>(
        `
          INSERT INTO models (id, project_id, name, description, model_data)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          RETURNING id, project_id, name, description, created_at, updated_at, model_data
        `,
        [id, projectId, name.trim(), description ?? null, JSON.stringify(modelData)]
      );
      res.status(201).json(mapModelRow(result.rows[0]));
    })
  );

  app.get(
    "/api/models/:modelId",
    asyncHandler(async (req, res) => {
      const { modelId } = req.params;
      const result = await pool.query<ModelRow>(
        `
          SELECT id, project_id, name, description, created_at, updated_at, model_data
          FROM models
          WHERE id = $1
        `,
        [modelId]
      );
      if (result.rowCount === 0) {
        res.status(404).json({ error: "Model not found." });
        return;
      }
      res.json(mapModelRow(result.rows[0]));
    })
  );

  app.put(
    "/api/models/:modelId",
    asyncHandler(async (req, res) => {
      const { modelId } = req.params;
      const { name, description, model } = req.body ?? {};
      const updates: string[] = [];
      const values: Array<string | null> = [modelId];
      let index = 2;

      if (typeof name === "string") {
        updates.push(`name = $${index}`);
        values.push(name.trim());
        index += 1;
      }
      if (typeof description !== "undefined") {
        updates.push(`description = $${index}`);
        values.push(description ?? null);
        index += 1;
      }
      if (typeof model !== "undefined") {
        updates.push(`model_data = $${index}::jsonb`);
        values.push(JSON.stringify(model));
        index += 1;
      }

      if (updates.length === 0) {
        res.status(400).json({ error: "No fields to update." });
        return;
      }

      updates.push("updated_at = now()");
      const result = await pool.query<ModelRow>(
        `
          UPDATE models
          SET ${updates.join(", ")}
          WHERE id = $1
          RETURNING id, project_id, name, description, created_at, updated_at, model_data
        `,
        values
      );
      if (result.rowCount === 0) {
        res.status(404).json({ error: "Model not found." });
        return;
      }
      res.json(mapModelRow(result.rows[0]));
    })
  );

  app.delete(
    "/api/models/:modelId",
    asyncHandler(async (req, res) => {
      const { modelId } = req.params;
      const result = await pool.query("DELETE FROM models WHERE id = $1", [
        modelId,
      ]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: "Model not found." });
        return;
      }
      res.status(204).send();
    })
  );

  app.get(
    "/api/backup",
    asyncHandler(async (_req, res) => {
      const projectsResult = await pool.query<ProjectRow>(
        "SELECT id, name, description, created_at, updated_at FROM projects"
      );
      const modelsResult = await pool.query<ModelRow>(
        "SELECT id, project_id, name, description, created_at, updated_at, model_data FROM models"
      );

      const backup = {
        backupVersion: 1,
        exportedAt: new Date().toISOString(),
        projects: projectsResult.rows.map(mapProjectRow),
        models: modelsResult.rows.map(mapModelRow),
      };

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=c4-modelizer-backup.json"
      );
      res.setHeader("Cache-Control", "no-store");
      res.type("application/json").send(JSON.stringify(backup, null, 2));
    })
  );

  app.post(
    "/api/restore",
    asyncHandler(async (req, res) => {
      const { projects, models } = req.body ?? {};
      if (!Array.isArray(projects) || !Array.isArray(models)) {
        res.status(400).json({ error: "Invalid backup payload." });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM models");
        await client.query("DELETE FROM projects");

        for (const project of projects as RestoreProject[]) {
          await client.query(
            `
              INSERT INTO projects (id, name, description, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5)
            `,
            [
              project.id,
              project.name,
              project.description ?? null,
              project.createdAt ?? new Date().toISOString(),
              project.updatedAt ?? new Date().toISOString(),
            ]
          );
        }

        for (const model of models as RestoreModel[]) {
          await client.query(
            `
              INSERT INTO models (id, project_id, name, description, model_data, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
            `,
            [
              model.id,
              model.projectId,
              model.name,
              model.description ?? null,
              JSON.stringify(model.model ?? createEmptyModel()),
              model.createdAt ?? new Date().toISOString(),
              model.updatedAt ?? new Date().toISOString(),
            ]
          );
        }

        await client.query("COMMIT");
        res.json({ status: "ok", projects: projects.length, models: models.length });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })
  );

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
};

export const createPool = (): PoolLike =>
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const mainUrl = process.argv[1]
  ? new URL(process.argv[1], "file://").href
  : null;

if (mainUrl && import.meta.url === mainUrl) {
  const pool = createPool();
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const app = createApp({ pool });

  ensureSchema(pool)
    .then(() => {
      app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`API listening on port ${port}`);
      });
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Failed to initialize schema:", error);
      process.exit(1);
    });
}
