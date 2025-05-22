const express = require("express");
const path = require("path");
const k8s = require("@kubernetes/client-node");
const cors = require("cors");

// Initialize the Kubernetes client
const kc = new k8s.KubeConfig();
// When running inside a cluster, this will automatically use the service account
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.NetworkingV1Api);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for development
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "dist")));

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

// All other GET requests not handled before will return the React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
