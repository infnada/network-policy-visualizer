import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for development
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "dist")));

// Initialize Kubernetes client with better error handling
let k8sApi = null;
let k8sInitialized = false;

async function initializeK8s() {
  try {
    const k8s = await import("@kubernetes/client-node");
    const kc = new k8s.KubeConfig();
    
    // Try to load from default (works in cluster or with kubeconfig)
    try {
      kc.loadFromDefault();
      k8sApi = kc.makeApiClient(k8s.NetworkingV1Api);
      k8sInitialized = true;
      console.log("✓ Kubernetes client initialized successfully");
    } catch (loadError) {
      console.warn("⚠ Could not load Kubernetes config:", loadError.message);
      console.log("💡 The app will work without cluster integration (file upload only)");
    }
  } catch (importError) {
    console.error("✗ Failed to import Kubernetes client:", importError.message);
  }
}

// API endpoint to get all network policies from the cluster
app.get("/api/networkpolicies", async (req, res) => {
  if (!k8sInitialized || !k8sApi) {
    return res.status(503).json({ 
      error: "Kubernetes client not available. Please check cluster connection or use file upload instead." 
    });
  }

  try {
    const response = await k8sApi.listNetworkPolicyForAllNamespaces();
    res.json(response.body.items);
  } catch (error) {
    console.error("Error fetching network policies:", error.message);
    res.status(500).json({ 
      error: `Failed to fetch network policies: ${error.message}` 
    });
  }
});

// API endpoint to get network policies for a specific namespace
app.get("/api/networkpolicies/:namespace", async (req, res) => {
  if (!k8sInitialized || !k8sApi) {
    return res.status(503).json({ 
      error: "Kubernetes client not available. Please check cluster connection or use file upload instead." 
    });
  }

  try {
    const namespace = req.params.namespace;
    if (!namespace || namespace.trim() === '') {
      return res.status(400).json({ error: "Namespace parameter is required" });
    }

    const response = await k8sApi.listNamespacedNetworkPolicy(namespace);
    res.json(response.body.items);
  } catch (error) {
    console.error(
      `Error fetching network policies for namespace ${req.params.namespace}:`,
      error.message,
    );
    res.status(500).json({ 
      error: `Failed to fetch network policies for namespace ${req.params.namespace}: ${error.message}` 
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    kubernetes: k8sInitialized ? "connected" : "not available",
    timestamp: new Date().toISOString(),
  });
});

// All other GET requests not handled before will return the React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Initialize Kubernetes and start server
async function startServer() {
  console.log("🚀 Starting NetworkPolicy Visualizer...");
  
  // Initialize Kubernetes client (non-blocking)
  await initializeK8s();
  
  // Start server regardless of Kubernetes connection
  app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📊 Open http://localhost:${PORT} to view the application`);
    
    if (k8sInitialized) {
      console.log("🔗 Kubernetes integration: ENABLED");
      console.log("💡 You can load policies directly from your cluster");
    } else {
      console.log("📁 Kubernetes integration: DISABLED");
      console.log("💡 Use file upload or paste functionality to load policies");
    }
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
