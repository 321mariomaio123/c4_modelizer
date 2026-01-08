import assert from "node:assert/strict";
import test from "node:test";
import { createApp, createEmptyModel } from "../src/index.js";

const createMockPool = () => {
  const queryCalls = [];
  const queue = [];
  const pool = {
    queryCalls,
    queue,
    query: async (...args) => {
      queryCalls.push(args);
      return queue.length ? queue.shift() : { rows: [] };
    },
    connect: async () => ({
      queryCalls: [],
      query: async () => ({}),
      release: () => {},
    }),
  };
  return pool;
};

const startServer = async (pool) => {
  const app = createApp({ pool });
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
};

test("returns status ok when database responds", async () => {
  const pool = createMockPool();
  pool.queue.push({});

  const { server, baseUrl } = await startServer(pool);
  try {
    const response = await fetch(`${baseUrl}/api/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.db.status, "ok");
    assert.deepEqual(pool.queryCalls[0], ["SELECT 1"]);
  } finally {
    server.close();
  }
});

test("rejects project creation without name", async () => {
  const pool = createMockPool();
  const { server, baseUrl } = await startServer(pool);
  try {
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Project name is required.");
    assert.equal(pool.queryCalls.length, 0);
  } finally {
    server.close();
  }
});

test("creates a project", async () => {
  const pool = createMockPool();
  pool.queue.push({
    rows: [
      {
        id: "proj-1",
        name: "Core Platform",
        description: null,
        created_at: "2026-01-01T10:00:00.000Z",
        updated_at: "2026-01-01T10:00:00.000Z",
      },
    ],
  });

  const { server, baseUrl } = await startServer(pool);
  try {
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Core Platform" }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.deepEqual(body, {
      id: "proj-1",
      name: "Core Platform",
      description: null,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
      modelCount: 0,
    });
  } finally {
    server.close();
  }
});

test("lists projects with model counts", async () => {
  const pool = createMockPool();
  pool.queue.push({
    rows: [
      {
        id: "proj-1",
        name: "Core Platform",
        description: "Primary systems",
        created_at: "2026-01-01T10:00:00.000Z",
        updated_at: "2026-01-02T10:00:00.000Z",
        model_count: "2",
      },
    ],
  });

  const { server, baseUrl } = await startServer(pool);
  try {
    const response = await fetch(`${baseUrl}/api/projects`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body[0].modelCount, 2);
  } finally {
    server.close();
  }
});

test("rejects model creation without name", async () => {
  const pool = createMockPool();
  const { server, baseUrl } = await startServer(pool);
  try {
    const response = await fetch(`${baseUrl}/api/projects/proj-1/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Model name is required.");
  } finally {
    server.close();
  }
});

test("restores backup data", async () => {
  const pool = createMockPool();
  const clientCalls = [];
  const client = {
    query: async (...args) => {
      clientCalls.push(args);
      return {};
    },
    release: () => {
      client.released = true;
    },
    released: false,
  };
  pool.connect = async () => client;

  const { server, baseUrl } = await startServer(pool);
  try {
    const response = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projects: [
          {
            id: "proj-1",
            name: "Core",
            description: null,
            createdAt: "2026-01-01T10:00:00.000Z",
            updatedAt: "2026-01-01T10:00:00.000Z",
          },
        ],
        models: [
          {
            id: "model-1",
            projectId: "proj-1",
            name: "System View",
            description: null,
            model: createEmptyModel(),
            createdAt: "2026-01-01T10:00:00.000Z",
            updatedAt: "2026-01-01T10:00:00.000Z",
          },
        ],
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.deepEqual(clientCalls[0], ["BEGIN"]);
    assert.deepEqual(clientCalls[1], ["DELETE FROM models"]);
    assert.deepEqual(clientCalls[2], ["DELETE FROM projects"]);
    assert.deepEqual(clientCalls[clientCalls.length - 1], ["COMMIT"]);
    assert.equal(client.released, true);
  } finally {
    server.close();
  }
});
