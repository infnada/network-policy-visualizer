import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { KubeConfig, NetworkingV1Api } from "@kubernetes/client-node";
import cors from "cors";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kubernetes client setup
class KubernetesClient {
  constructor() {
    this.kc = new KubeConfig();
    this.k8sApi = null;
    this.isInitialized = false;
    this.initializationError = null;
  }

  async initialize() {
    try {
      console.log("🔗 Loading Kubernetes configuration...");

      if (process.env.KUBERNETES_SERVICE_HOST) {
        console.log("📦 Detected running inside Kubernetes cluster");
        this.kc.loadFromCluster();
      } else {
        console.log("💻 Loading from default kubeconfig locations");
        this.kc.loadFromDefault();
      }

      this.k8sApi = this.kc.makeApiClient(NetworkingV1Api);
      this.isInitialized = true;

      const currentContext = this.kc.getCurrentContext();
      console.log("✅ Kubernetes client initialized successfully");
      console.log("📍 Current Kubernetes context:", currentContext);

      return true;
    } catch (error) {
      this.initializationError = error;
      console.error(
        "❌ Failed to initialize Kubernetes client:",
        error.message,
      );
      console.error("Full error:", error);
      return false;
    }
  }

  getClient() {
    return this.k8sApi;
  }

  isReady() {
    return this.isInitialized && this.k8sApi !== null;
  }

  getInitializationError() {
    return this.initializationError;
  }
}

// Error handling utilities
class ApiErrorHandler {
  static getErrorDetails(error, context = "") {
    const baseContext = context ? `${context}: ` : "";

    const errorMap = {
      ECONNREFUSED: {
        message: "Cannot connect to Kubernetes cluster",
        details:
          "The server cannot reach the Kubernetes API. Please check if the cluster is running and accessible.",
      },
      403: {
        message: "Permission denied",
        details: `The service account does not have permission to access NetworkPolicies${context ? ` ${context}` : ""}. Please check RBAC configuration.`,
      },
      401: {
        message: "Authentication failed",
        details:
          "Invalid or expired credentials for accessing the Kubernetes API.",
      },
      404: {
        message: context.includes("namespace")
          ? "Namespace or resource not found"
          : "NetworkPolicy resource not found",
        details: context.includes("namespace")
          ? `The specified namespace was not found, or NetworkPolicy resources are not available.`
          : "The NetworkPolicy resource type is not available in this cluster or API version.",
      },
    };

    const errorKey = error.code || error.statusCode;
    const errorInfo = errorMap[errorKey];

    return {
      message: errorInfo?.message || error.message,
      details:
        errorInfo?.details ||
        `${baseContext}Unknown error occurred while fetching NetworkPolicies`,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  static validateApiResponse(response, context = "") {
    if (!response) {
      throw new Error(
        `No response from Kubernetes API${context ? ` ${context}` : ""}`,
      );
    }

    if (!response.items) {
      throw new Error(
        `Invalid response structure: missing items${context ? ` ${context}` : ""}`,
      );
    }

    if (!Array.isArray(response.items)) {
      throw new Error(
        `Invalid response structure: missing items array${context ? ` ${context}` : ""}`,
      );
    }

    return response.items;
  }
}

// API route handlers
class NetworkPolicyHandlers {
  constructor(kubernetesClient) {
    this.k8sClient = kubernetesClient;
  }

  checkClientReady() {
    if (!this.k8sClient.isReady()) {
      const initError = this.k8sClient.getInitializationError();
      throw {
        statusCode: 500,
        message: "Kubernetes client not initialized",
        details: initError
          ? `Configuration error: ${initError.message}`
          : "The server could not connect to the Kubernetes cluster. Please check server logs for configuration issues.",
      };
    }
  }

  async getAllNetworkPolicies(req, res) {
    console.log("🔍 API request received for /api/networkpolicies");

    try {
      this.checkClientReady();

      console.log("📡 Attempting to connect to Kubernetes...");
      const response = await this.k8sClient
        .getClient()
        .listNetworkPolicyForAllNamespaces();

      const items = ApiErrorHandler.validateApiResponse(
        response,
        "for all namespaces",
      );

      console.log(`✅ Success: Found ${items.length} NetworkPolicies`);
      res.json(items);
    } catch (error) {
      this.handleError(error, res, "fetching all NetworkPolicies");
    }
  }

  async getNamespacedNetworkPolicies(req, res) {
    const namespace = req.params.namespace;
    console.log(`🔍 Received request for namespace: ${namespace}`);

    try {
      this.checkClientReady();

      console.log(
        `📡 Attempting to list NetworkPolicies for namespace: ${namespace}`,
      );
      const response = await this.k8sClient
        .getClient()
        .listNamespacedNetworkPolicy({ namespace });

      const items = ApiErrorHandler.validateApiResponse(
        response,
        `for namespace ${namespace}`,
      );

      console.log(
        `✅ Successfully retrieved ${items.length} NetworkPolicies for ${namespace}`,
      );
      res.json(items);
    } catch (error) {
      this.handleError(
        error,
        res,
        `fetching NetworkPolicies for namespace ${namespace}`,
      );
    }
  }

  handleError(error, res, context) {
    console.error(`❌ Error ${context}:`, error.message || error);

    if (error.statusCode && error.message && error.details) {
      // Already formatted error from checkClientReady
      return res.status(error.statusCode).json({
        error: error.message,
        details: error.details,
      });
    }

    console.error("Full error details:", {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      body: error.body,
      response: error.response?.body,
    });

    const errorDetails = ApiErrorHandler.getErrorDetails(error, context);

    res.status(error.statusCode || 500).json({
      error: errorDetails.message,
      details: errorDetails.details,
      code: errorDetails.code,
      statusCode: errorDetails.statusCode,
    });
  }
}

// Static file serving configuration
const staticFileConfig = {
  setHeaders: (res, filePath) => {
    const mimeTypes = {
      ".css": "text/css",
      ".js": "application/javascript",
      ".html": "text/html",
      ".json": "application/json",
    };

    const ext = path.extname(filePath);
    if (mimeTypes[ext]) {
      res.setHeader("Content-Type", mimeTypes[ext]);
    }

    // Add cache headers for static assets
    if (/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year
    }
  },
};

// Main application setup
class NetworkPolicyVisualizerServer {
  constructor() {
    this.app = express();
    this.PORT = process.env.PORT || 3000;
    this.k8sClient = new KubernetesClient();
    this.handlers = new NetworkPolicyHandlers(this.k8sClient);
  }

  setupMiddleware() {
    // Enable CORS for development
    this.app.use(cors());

    // Static file serving
    this.app.use(
      express.static(path.join(__dirname, "dist"), staticFileConfig),
    );
  }

  setupRoutes() {
    // API routes
    this.app.get("/api/networkpolicies", (req, res) =>
      this.handlers.getAllNetworkPolicies(req, res),
    );

    this.app.get("/api/networkpolicies/:namespace", (req, res) =>
      this.handlers.getNamespacedNetworkPolicies(req, res),
    );

    // SPA fallback route
    this.app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  async start() {
    // Initialize Kubernetes client
    await this.k8sClient.initialize();

    // Setup middleware and routes
    this.setupMiddleware();
    this.setupRoutes();

    // Start server
    this.app.listen(this.PORT, () => {
      console.log(`🚀 Server running on port ${this.PORT}`);
      console.log(`📊 API endpoints available at:`);
      console.log(`   GET /api/networkpolicies`);
      console.log(`   GET /api/networkpolicies/:namespace`);
      console.log(
        `🔧 Kubernetes client status: ${this.k8sClient.isReady() ? "✅ Connected" : "❌ Not connected"}`,
      );

      if (!this.k8sClient.isReady()) {
        console.log(
          `💡 Tip: The application will still work with file uploads and sample data`,
        );
      }
    });
  }
}

// Start the server
const server = new NetworkPolicyVisualizerServer();
server.start().catch(console.error);
