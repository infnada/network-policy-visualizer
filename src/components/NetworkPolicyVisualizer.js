import React, { useState, useEffect, useMemo } from "react";
import PolicyDetails from "./PolicyDetails.js";
import GraphVisualization from "./graph/GraphVisualization.js";
import Sidebar from "./Sidebar.js";
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
  name: backoffice
  namespace: atani-broker
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/instance: backoffice
      app.kubernetes.io/name: backoffice
  policyTypes:
    - Ingress
    - Egress
  egress:
    # Allow outbound connections to PSQL3
    - to:
        - ipBlock:
            cidr: 10.30.64.48/32
      ports:
        - port: 5432
    # Allow outbound connections to clickhouse pods
    - to:
        - podSelector:
            matchLabels:
              clickhouse.altinity.com/app: chop
              clickhouse.altinity.com/chi: broker
              clickhouse.altinity.com/cluster: replicated
        - ipBlock:
            cidr: 172.20.0.0/16
      ports:
        - port: 15008
    # Allow outbound connections to kyc-private pods
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/instance: kyc-private
              app.kubernetes.io/name: kyc-private
      ports:
        - port: 15008
    # Allow outbound connections to waypoint pods
    - to:
        - namespaceSelector:
            matchExpressions:
              - key: kubernetes.io/metadata.name
                operator: In
                values:
                  - istio-gateway
          podSelector:
            matchLabels:
              gateway.istio.io/managed: istio.io-mesh-controller
              gateway.networking.k8s.io/gateway-name: internal-gateway
      ports:
        - port: 15008
    # Allow outbound connections to mongodb.
    - to:
        - namespaceSelector:
            matchExpressions:
              - key: kubernetes.io/metadata.name
                operator: In
                values:
                  - atani
          podSelector:
            matchLabels:
              app.kubernetes.io/name: percona-server-mongodb
              app.kubernetes.io/instance: mongodb-psmdb-db
      ports:
        - port: 15008
  ingress:
    # Allow inbound connections from Internal Services ALB users
    - from:
        - ipBlock:
            cidr: 10.30.64.128/28
        - ipBlock:
            cidr: 10.30.64.144/28
      ports:
        - port: 8000
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-api
  namespace: atani-broker
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/instance: api
      app.kubernetes.io/name: api
  policyTypes:
    - Ingress
    - Egress
  egress:
    # Allow outbound connections to redis
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/instance: redis
              app.kubernetes.io/name: redis
      ports:
        - port: 6379
    # Allow outbound connections to backoffice
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/instance: backoffice
              app.kubernetes.io/name: backoffice
      ports:
        - port: 8000
  ingress:
    # Allow inbound connections from frontend services
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/instance: frontend
              app.kubernetes.io/name: frontend
      ports:
        - port: 3000
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
