import React, { useState, useEffect, useMemo } from "react";
import PolicyDetails from "./PolicyDetails.js";
import GraphVisualization from "./graph/GraphVisualization.js";
import Sidebar from "./sidebar/Sidebar.js";
import ThemeToggle from "./ThemeToggle.js";
import CyberpunkTheme from "./CyberpunkTheme.js";
import { parseYaml, parseNetworkPolicy } from "../utils/parsers.js";
import { buildGraphData } from "../utils/enhancedParsers.js";

const NetworkPolicyVisualizer = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [allPolicies, setAllPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [showPolicyDetails, setShowPolicyDetails] = useState(null);
  // Add state for direction filter
  const [directionFilter, setDirectionFilter] = useState("all");
  // Add state for node deduplication
  const [deduplicateNodes, setDeduplicateNodes] = useState(true);
  // Add state for theme
  const [theme, setTheme] = useState("light");

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  // Memoize the graph data to prevent unnecessary recalculations
  // Enhanced to apply direction filtering at the graph level
  const memoizedGraphData = useMemo(() => {
    // Create graph data with deduplication based on user preference
    const baseGraphData = buildGraphData(filteredPolicies, deduplicateNodes);

    // If directionFilter is "all", return the full graph
    if (directionFilter === "all") {
      return baseGraphData;
    }

    // Filter links based on direction
    const filteredLinks = baseGraphData.links.filter(
      (link) => link.direction === directionFilter,
    );

    // Get unique node IDs that are still being used in the filtered links
    const nodeIdsInUse = new Set();
    filteredLinks.forEach((link) => {
      nodeIdsInUse.add(link.source);
      nodeIdsInUse.add(link.target);
    });

    // Filter nodes to only include those that are connected in the filtered links
    const filteredNodes = baseGraphData.nodes.filter(
      (node) =>
        nodeIdsInUse.has(node.id) ||
        (typeof node.id === "object" && nodeIdsInUse.has(node.id.id)),
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [filteredPolicies, directionFilter, deduplicateNodes]);

  // Only update graph data when the memoized value changes
  useEffect(() => {
    setGraphData(memoizedGraphData);
  }, [memoizedGraphData]);

  const handleFileUpload = async (event) => {
    setError(null);
    setLoading(true);

    const files = event.target.files;
    if (!files || files.length === 0) {
      setLoading(false);
      return;
    }

    const newPolicies = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const content = await readFileContent(file);

        // Parse content based on file type
        let documents;
        if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) {
          documents = parseYaml(content);
        } else if (file.name.endsWith(".json")) {
          // Handle single JSON or array of JSON objects
          const parsedJson = JSON.parse(content);
          documents = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
        } else {
          throw new Error(`Unsupported file format: ${file.name}`);
        }

        // Filter for NetworkPolicy kinds
        documents.forEach((doc) => {
          if (doc.kind === "NetworkPolicy") {
            const parsedPolicy = parseNetworkPolicy(doc);
            if (parsedPolicy) {
              newPolicies.push(parsedPolicy);
            }
          }
        });
      }

      if (newPolicies.length === 0) {
        setError(
          "No valid NetworkPolicy resources found in the uploaded files.",
        );
      } else {
        setAllPolicies(newPolicies);
        setFilteredPolicies(newPolicies);
      }
    } catch (err) {
      console.error("Error processing files:", err);
      setError(`Error processing files: ${err.message}`);
    }

    setLoading(false);
  };

  const handlePasteContent = () => {
    if (!pasteContent.trim()) {
      setError("Please paste some YAML content first");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const documents = parseYaml(pasteContent);

      const newPolicies = [];

      // Filter for NetworkPolicy kinds
      documents.forEach((doc) => {
        if (doc.kind === "NetworkPolicy") {
          const parsedPolicy = parseNetworkPolicy(doc);
          if (parsedPolicy) {
            newPolicies.push(parsedPolicy);
          }
        }
      });

      if (newPolicies.length === 0) {
        setError(
          "No valid NetworkPolicy resources found in the pasted content.",
        );
      } else {
        setAllPolicies(newPolicies);
        setFilteredPolicies(newPolicies);
      }
    } catch (err) {
      console.error("Error processing pasted content:", err);
      setError(`Error processing pasted content: ${err.message}`);
    }

    setLoading(false);
  };

  const getSampleYaml = () => {
    return `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-frontend
  namespace: ecommerce-prod
spec:
  podSelector:
    matchLabels:
      app: web-frontend
      tier: frontend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from load balancer
    - from:
        - ipBlock:
            cidr: 10.0.0.0/8
            except:
              - 10.0.1.0/24
      ports:
        - protocol: TCP
          port: 80
        - protocol: TCP
          port: 443
    # Allow monitoring from prometheus
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
  egress:
    # Allow connections to API gateway
    - to:
        - podSelector:
            matchLabels:
              app: api-gateway
              version: v2
      ports:
        - protocol: TCP
          port: 8080
    # Allow connections to external CDN
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-gateway
  namespace: ecommerce-prod
spec:
  podSelector:
    matchLabels:
      app: api-gateway
      version: v2
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from frontend apps
    - from:
        - podSelector:
            matchLabels:
              tier: frontend
      ports:
        - protocol: TCP
          port: 8080
    # Allow from mobile API namespace
    - from:
        - namespaceSelector:
            matchExpressions:
              - key: kubernetes.io/metadata.name
                operator: In
                values:
                  - mobile-api
                  - partner-api
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Connect to user service
    - to:
        - namespaceSelector:
            matchLabels:
              name: microservices
          podSelector:
            matchLabels:
              service: user-service
      ports:
        - protocol: TCP
          port: 3000
    # Connect to product catalog
    - to:
        - namespaceSelector:
            matchLabels:
              name: microservices
          podSelector:
            matchLabels:
              service: product-catalog
              environment: production
      ports:
        - protocol: TCP
          port: 3001
    # Connect to payment processor
    - to:
        - podSelector:
            matchLabels:
              app: payment-processor
              security-level: high
      ports:
        - protocol: TCP
          port: 8443
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-access
  namespace: microservices
spec:
  podSelector:
    matchLabels:
      app: postgresql
      role: primary
  policyTypes:
    - Ingress
  ingress:
    # Allow from specific microservices
    - from:
        - podSelector:
            matchLabels:
              service: user-service
        - podSelector:
            matchLabels:
              service: product-catalog
        - podSelector:
            matchLabels:
              service: order-service
      ports:
        - protocol: TCP
          port: 5432
    # Allow from backup service in different namespace
    - from:
        - namespaceSelector:
            matchLabels:
              name: backup-system
          podSelector:
            matchLabels:
              component: db-backup
      ports:
        - protocol: TCP
          port: 5432
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: redis-cache-policy
  namespace: microservices
spec:
  podSelector:
    matchLabels:
      app: redis
      tier: cache
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from API services
    - from:
        - namespaceSelector:
            matchLabels:
              environment: production
          podSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - api-gateway
                  - session-manager
                  - rate-limiter
      ports:
        - protocol: TCP
          port: 6379
  egress:
    # Allow DNS resolution
    - to: []
      ports:
        - protocol: UDP
          port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-default
  namespace: sandbox
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  # No ingress or egress rules = deny all
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: logging-policy
  namespace: monitoring
spec:
  podSelector:
    matchLabels:
      app: elasticsearch
      component: data
  policyTypes:
    - Ingress
  ingress:
    # Allow from log shippers
    - from:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              app: fluent-bit
      ports:
        - protocol: TCP
          port: 9200
    # Allow from kibana
    - from:
        - podSelector:
            matchLabels:
              app: kibana
      ports:
        - protocol: TCP
          port: 9200
        - protocol: TCP
          port: 9300
`;
  };

  const handleUseSampleData = () => {
    try {
      const documents = parseYaml(getSampleYaml());
      const samplePolicies = documents
        .filter((doc) => doc.kind === "NetworkPolicy")
        .map(parseNetworkPolicy)
        .filter(Boolean);

      setAllPolicies(samplePolicies);
      setFilteredPolicies(samplePolicies);
    } catch (err) {
      console.error("Error processing sample data:", err);
      setError(`Error processing sample data: ${err.message}`);
    }
  };

  // Function to handle direction filter changes from the Sidebar
  const handleDirectionFilterChange = (direction) => {
    setDirectionFilter(direction);
  };

  // Function to handle node deduplication changes
  const handleDeduplicateNodesChange = (deduplicate) => {
    setDeduplicateNodes(deduplicate);
  };

  // Apply theme class to body
  useEffect(() => {
    document.body.className = theme === "dark" ? "theme-dark" : "theme-light";
  }, [theme]);

  return (
    <div
      className={`flex flex-col h-screen themed-bg-primary ${theme === "dark" ? "theme-dark" : "theme-light"}`}
    >
      {/* Apply the CyberpunkTheme component */}
      <CyberpunkTheme isActive={theme === "dark"} />

      <header
        className={`${theme === "dark" ? "cyberpunk-header" : "bg-blue-600"} text-white p-4`}
      >
        <h1 className="text-2xl font-bold">
          Kubernetes NetworkPolicy Visualizer
        </h1>
      </header>

      <div className="flex-1 flex">
        <Sidebar
          policies={allPolicies}
          loading={loading}
          error={error}
          pasteContent={pasteContent}
          setPasteContent={setPasteContent}
          handleFileUpload={handleFileUpload}
          handleUseSampleData={handleUseSampleData}
          handlePasteContent={handlePasteContent}
          setShowPolicyDetails={setShowPolicyDetails}
          setFilteredPolicies={setFilteredPolicies}
          onDirectionFilterChange={handleDirectionFilterChange}
          directionFilter={directionFilter}
          deduplicateNodes={deduplicateNodes}
          onDeduplicateNodesChange={handleDeduplicateNodesChange}
          theme={theme}
          onPoliciesLoaded={(policies) => {
            setAllPolicies(policies);
            setFilteredPolicies(policies);
          }}
        />

        <GraphVisualization
          graphData={graphData}
          deduplicateNodes={deduplicateNodes}
          theme={theme}
        />

        {/* Theme toggle button */}
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>

      {showPolicyDetails && (
        <PolicyDetails
          policy={showPolicyDetails}
          onClose={() => setShowPolicyDetails(null)}
          theme={theme}
        />
      )}
    </div>
  );
};

export default NetworkPolicyVisualizer;
