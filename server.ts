import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeSpreadsheet, googleDb } from "./server-db";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON bodyParser with higher bounds to allow full table bulk pushes
  app.use(express.json({ limit: '20mb' }));

  // Initialize and load the Google Sheets database cache on server start
  await initializeSpreadsheet();

  // 📡 API endpoints FIRST to execute before asset serving

  // Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // DB Load API - Load all data tables at once
  app.get("/api/db/load-all", (req, res) => {
    try {
      const data = googleDb.getCache();
      res.json({ success: true, database: data });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || e });
    }
  });

  // DB Save API - Save specific table to spreadsheet
  app.post("/api/db/save", async (req, res) => {
    try {
      const { table, data } = req.body;
      if (!table || !Array.isArray(data)) {
        return res.status(400).json({ success: false, error: "Invalid payload params" });
      }

      await googleDb.setTable(table, data);
      res.json({ success: true, table });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || e });
    }
  });

  // Vite development middleware vs. static build runner
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support SPA router rewrite fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 EduQuest server booted successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
