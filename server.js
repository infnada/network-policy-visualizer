import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { KubeConfig, NetworkingV1Api } from "@kubernetes/client-node";
import cors from "cors";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Kubernetes client
const kc = new KubeConfig();
// When running inside a cluster, this will automatically use the service account
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(NetworkingV1Api);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for development
app.use(cors());

app.use(
  express.static(path.join(__dirname, "dist"), {
    // Set proper MIME types for static files
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      } else if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      } else if (filePath.endsWith(".html")) {
        res.setHeader("Content-Type", "text/html");
      } else if (filePath.endsWith(".json")) {
        res.setHeader("Content-Type", "application/json");
      }

      // Add cache headers for static assets
      if (filePath.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year
      }
    },
  }),
);

// API endpoint to get all network policies from the cluster
app.get("/api/networkpolicies", async (req, res) => {
  try {
    const response = await k8sApi.listNetworkPolicyForAllNamespaces();
    res.json(response.body.items);
  } catch (error) {
    console.error("Error fetching network policies:", error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get network policies for a specific namespace
app.get("/api/networkpolicies/:namespace", async (req, res) => {
  try {
    const namespace = req.params.namespace;
    const response = await k8sApi.listNamespacedNetworkPolicy(namespace);
    res.json(response.body.items);
  } catch (error) {
    console.error(
      `Error fetching network policies for namespace ${req.params.namespace}:`,
      error,
    );
    res.status(500).json({ error: error.message });
  }
});

// CRITICAL FIX: Handle SPA routing - this must come AFTER API routes
app.get("*", (req, res) => {
  // Don't interfere with API routes
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
