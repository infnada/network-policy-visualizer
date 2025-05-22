import React, { useState, useEffect, useMemo, useCallback } from "react";
import NodeFilter from "./NodeFilter.js";
import ClusterIntegration from "./ClusterIntegration.js";

const Sidebar = ({
  policies,
  loading,
  error,
  pasteContent,
  setPasteContent,
  handleFileUpload,
  handleUseSampleData,
  handlePasteContent,
  setShowPolicyDetails,
  setFilteredPolicies,
  onDirectionFilterChange,
  directionFilter = "all",
  deduplicateNodes = true,
  onDeduplicateNodesChange,
  theme = "light",
  graphData = null, // Optional graph data for additional combined selector extraction
}) => {
  const [filters, setFilters] = useState({
    namespaces: [],
    pods: [],
    labels: "",
  });

  // Available options for filters
  const [availableNamespaces, setAvailableNamespaces] = useState([]);
  const [availablePods, setAvailablePods] = useState([]);
  const [localFilteredPolicies, setLocalFilteredPolicies] = useState([]);

  // UI state
  const [expandedSection, setExpandedSection] = useState("upload");
  const [namespaceDropdownOpen, setNamespaceDropdownOpen] = useState(false);
  const [podDropdownOpen, setPodDropdownOpen] = useState(false);

  // Sorting state - default to sorted alphabetically
  const [sortNamespaces, setSortNamespaces] = useState(true);
  const [sortPods, setSortPods] = useState(true);
  const [sortPolicies, setSortPolicies] = useState(true);

  // Track combined selectors
  const [combinedNamespaces, setCombinedNamespaces] = useState(new Set());
  const [combinedPods, setCombinedPods] = useState(new Set());

  // Helper function to sort arrays alphabetically
  const sortAlphabetically = (items) => {
    return [...items].sort((a, b) => a.localeCompare(b));
  };

  // Helper function to extract namespace names from namespace selectors
  const extractNamespaceFromSelector = (namespaceSelector) => {
    if (!namespaceSelector) return null;

    // Extract from matchLabels
    if (namespaceSelector.matchLabels) {
      const namespaceKeys = [
        "kubernetes.io/metadata.name",
        "name",
        "k8s-app",
        "app.kubernetes.io/name",
        "app",
      ];

      for (const key of namespaceKeys) {
        if (namespaceSelector.matchLabels[key]) {
          return namespaceSelector.matchLabels[key];
        }
      }
    }

    // Extract from matchExpressions
    if (
      namespaceSelector.matchExpressions &&
      Array.isArray(namespaceSelector.matchExpressions) &&
      namespaceSelector.matchExpressions.length > 0
    ) {
      // Look specifically for kubernetes.io/metadata.name with In operator
      const metadataExpr = namespaceSelector.matchExpressions.find(
        (expr) =>
          expr.key === "kubernetes.io/metadata.name" &&
          expr.operator === "In" &&
          Array.isArray(expr.values) &&
          expr.values.length > 0,
      );

      if (metadataExpr) {
        return metadataExpr.values[0];
      }

      // If not found, try any expressions with 'In' operator and a name-related key
      const namespaceExpr = namespaceSelector.matchExpressions.find(
        (expr) =>
          (expr.key.includes("name") || expr.key.includes("app")) &&
          expr.operator === "In" &&
          Array.isArray(expr.values) &&
          expr.values.length > 0,
      );

      if (namespaceExpr) {
        return namespaceExpr.values[0];
      }
    }

    return null;
  };

  // Helper function to extract pod names from pod selectors
  const extractPodFromSelector = (podSelector) => {
    if (!podSelector || !podSelector.matchLabels) return null;

    // Try to find app name or similar from labels
    const appKeys = [
      "app",
      "app.kubernetes.io/name",
      "k8s-app",
      "name",
      "component",
      "app.kubernetes.io/instance",
      "app.kubernetes.io/component",
    ];

    for (const key of appKeys) {
      if (podSelector.matchLabels[key]) {
        return podSelector.matchLabels[key];
      }
    }

    return null;
  };

  // Extract available filter options from policies
  useEffect(() => {
    // Extract namespaces from policies metadata
    const namespaces = new Set(policies.map((p) => p.namespace));

    // Extract pod selector names
    const pods = new Set();

    // Track which items come from combined selectors
    const combinedNs = new Set();
    const combinedPd = new Set();

    // Process every policy to find all pods and namespaces
    policies.forEach((policy) => {
      // Extract from policy's pod selector
      if (policy.podSelector?.matchLabels) {
        const podName = extractPodFromSelector(policy.podSelector);
        if (podName) pods.add(podName);
      }

      // Process ingress rules for combined selectors and more pods/namespaces
      if (policy.ingress && Array.isArray(policy.ingress)) {
        policy.ingress.forEach((rule) => {
          if (rule.from && Array.isArray(rule.from)) {
            rule.from.forEach((from) => {
              // Extract pods from pod selectors
              if (from.podSelector) {
                const podName = extractPodFromSelector(from.podSelector);
                if (podName) pods.add(podName);
              }

              // Extract namespaces from namespace selectors
              if (from.namespaceSelector) {
                const namespaceName = extractNamespaceFromSelector(
                  from.namespaceSelector,
                );
                if (namespaceName) namespaces.add(namespaceName);
              }

              // For combined selectors, extract both pod and namespace
              if (from.podSelector && from.namespaceSelector) {
                const podName = extractPodFromSelector(from.podSelector);
                const namespaceName = extractNamespaceFromSelector(
                  from.namespaceSelector,
                );

                if (podName) {
                  pods.add(podName);
                  combinedPd.add(podName);
                }
                if (namespaceName) {
                  namespaces.add(namespaceName);
                  combinedNs.add(namespaceName);
                }
              }
            });
          }
        });
      }

      // Process egress rules for combined selectors and more pods/namespaces
      if (policy.egress && Array.isArray(policy.egress)) {
        policy.egress.forEach((rule) => {
          if (rule.to && Array.isArray(rule.to)) {
            rule.to.forEach((to) => {
              // Extract pods from pod selectors
              if (to.podSelector) {
                const podName = extractPodFromSelector(to.podSelector);
                if (podName) pods.add(podName);
              }

              // Extract namespaces from namespace selectors
              if (to.namespaceSelector) {
                const namespaceName = extractNamespaceFromSelector(
                  to.namespaceSelector,
                );
                if (namespaceName) namespaces.add(namespaceName);
              }

              // For combined selectors, extract both pod and namespace
              if (to.podSelector && to.namespaceSelector) {
                const podName = extractPodFromSelector(to.podSelector);
                const namespaceName = extractNamespaceFromSelector(
                  to.namespaceSelector,
                );

                if (podName) {
                  pods.add(podName);
                  combinedPd.add(podName);
                }
                if (namespaceName) {
                  namespaces.add(namespaceName);
                  combinedNs.add(namespaceName);
                }
              }
            });
          }
        });
      }
    });

    // Process the pre-built graph data if available
    if (graphData && graphData.nodes) {
      graphData.nodes.forEach((node) => {
        if (node.type === "combined" && node.details) {
          // Extract namespace from combined node details
          if (node.details.namespace) {
            const namespaceName = extractNamespaceFromSelector(
              node.details.namespace,
            );
            if (namespaceName) {
              namespaces.add(namespaceName);
              combinedNs.add(namespaceName);
            }
          }

          // Extract pod from combined node details
          if (node.details.pod) {
            const podName = extractPodFromSelector(node.details.pod);
            if (podName) {
              pods.add(podName);
              combinedPd.add(podName);
            }
          }
        }
      });
    }

    // Update state with all found namespaces and pods
    setAvailableNamespaces(Array.from(namespaces));
    setAvailablePods(Array.from(pods));

    // Update combined tracking state
    setCombinedNamespaces(combinedNs);
    setCombinedPods(combinedPd);

    // Initialize filtered policies
    setLocalFilteredPolicies(policies);
  }, [policies, graphData]);

  // Memoize the filtered policies
  const filteredPoliciesMemo = useMemo(() => {
    let filtered = [...policies];

    // Helper function to check if a policy uses a specific namespace
    // in any of its rules (including combined selectors)
    const policyUsesNamespace = (policy, targetNamespace) => {
      // Check if the policy itself is in the target namespace
      if (policy.namespace === targetNamespace) return true;

      // Check ingress rules for namespace selectors
      if (policy.ingress && Array.isArray(policy.ingress)) {
        for (const rule of policy.ingress) {
          if (!rule.from || !Array.isArray(rule.from)) continue;

          for (const from of rule.from) {
            // Check namespace selectors
            if (from.namespaceSelector) {
              const namespaceName = extractNamespaceFromSelector(
                from.namespaceSelector,
              );
              if (namespaceName === targetNamespace) return true;
            }
          }
        }
      }

      // Check egress rules for namespace selectors
      if (policy.egress && Array.isArray(policy.egress)) {
        for (const rule of policy.egress) {
          if (!rule.to || !Array.isArray(rule.to)) continue;

          for (const to of rule.to) {
            // Check namespace selectors
            if (to.namespaceSelector) {
              const namespaceName = extractNamespaceFromSelector(
                to.namespaceSelector,
              );
              if (namespaceName === targetNamespace) return true;
            }
          }
        }
      }

      return false;
    };

    // Helper function to check if a policy uses a specific pod
    // in any of its rules (including combined selectors)
    const policyUsesPod = (policy, targetPod) => {
      // Check policy's main pod selector
      if (policy.podSelector?.matchLabels) {
        const podValues = Object.values(policy.podSelector.matchLabels);
        if (podValues.includes(targetPod)) return true;
      }

      // Check ingress rules for pod selectors
      if (policy.ingress && Array.isArray(policy.ingress)) {
        for (const rule of policy.ingress) {
          if (!rule.from || !Array.isArray(rule.from)) continue;

          for (const from of rule.from) {
            // Check pod selectors
            if (from.podSelector?.matchLabels) {
              const podValues = Object.values(from.podSelector.matchLabels);
              if (podValues.includes(targetPod)) return true;
            }
          }
        }
      }

      // Check egress rules for pod selectors
      if (policy.egress && Array.isArray(policy.egress)) {
        for (const rule of policy.egress) {
          if (!rule.to || !Array.isArray(rule.to)) continue;

          for (const to of rule.to) {
            // Check pod selectors
            if (to.podSelector?.matchLabels) {
              const podValues = Object.values(to.podSelector.matchLabels);
              if (podValues.includes(targetPod)) return true;
            }
          }
        }
      }

      return false;
    };

    // Apply namespace filter
    if (filters.namespaces.length > 0) {
      filtered = filtered.filter((policy) => {
        // Check if the policy is in any of the selected namespaces
        // or if it uses any of the selected namespaces in its rules
        return filters.namespaces.some((namespace) =>
          policyUsesNamespace(policy, namespace),
        );
      });
    }

    // Apply pod filter
    if (filters.pods.length > 0) {
      filtered = filtered.filter((policy) => {
        // Check if the policy uses any of the selected pods
        return filters.pods.some((pod) => policyUsesPod(policy, pod));
      });
    }

    // Apply label filter
    if (filters.labels) {
      filtered = filtered.filter((policy) => {
        // Check main pod selector labels
        if (policy.podSelector?.matchLabels) {
          const allLabels = Object.entries(policy.podSelector.matchLabels)
            .map(([key, value]) => `${key}:${value}`)
            .join(" ")
            .toLowerCase();

          if (allLabels.includes(filters.labels.toLowerCase())) {
            return true;
          }
        }

        // Check ingress rule selectors
        if (policy.ingress && Array.isArray(policy.ingress)) {
          for (const rule of policy.ingress) {
            if (!rule.from || !Array.isArray(rule.from)) continue;

            for (const from of rule.from) {
              if (from.podSelector?.matchLabels) {
                const allLabels = Object.entries(from.podSelector.matchLabels)
                  .map(([key, value]) => `${key}:${value}`)
                  .join(" ")
                  .toLowerCase();

                if (allLabels.includes(filters.labels.toLowerCase())) {
                  return true;
                }
              }
            }
          }
        }

        // Check egress rule selectors
        if (policy.egress && Array.isArray(policy.egress)) {
          for (const rule of policy.egress) {
            if (!rule.to || !Array.isArray(rule.to)) continue;

            for (const to of rule.to) {
              if (to.podSelector?.matchLabels) {
                const allLabels = Object.entries(to.podSelector.matchLabels)
                  .map(([key, value]) => `${key}:${value}`)
                  .join(" ")
                  .toLowerCase();

                if (allLabels.includes(filters.labels.toLowerCase())) {
                  return true;
                }
              }
            }
          }
        }

        return false;
      });
    }

    return filtered;
  }, [policies, filters]);

  // Update local state and propagate changes to parent
  useEffect(() => {
    setLocalFilteredPolicies(filteredPoliciesMemo);
    setFilteredPolicies(filteredPoliciesMemo);
  }, [filteredPoliciesMemo, setFilteredPolicies]);

  // Filter callbacks
  const toggleNamespace = useCallback((namespace) => {
    setFilters((prev) => {
      const namespaces = prev.namespaces.includes(namespace)
        ? prev.namespaces.filter((ns) => ns !== namespace)
        : [...prev.namespaces, namespace];

      return { ...prev, namespaces };
    });
  }, []);

  const togglePod = useCallback((pod) => {
    setFilters((prev) => {
      const pods = prev.pods.includes(pod)
        ? prev.pods.filter((p) => p !== pod)
        : [...prev.pods, pod];

      return { ...prev, pods };
    });
  }, []);

  const handleLabelFilterChange = useCallback((e) => {
    setFilters((prev) => ({
      ...prev,
      labels: e.target.value,
    }));
  }, []);

  const handleDirectionFilterChange = useCallback(
    (direction) => {
      if (onDirectionFilterChange) {
        onDirectionFilterChange(direction);
      }
    },
    [onDirectionFilterChange],
  );

  const handleDeduplicateNodesChange = useCallback(
    (deduplicate) => {
      if (onDeduplicateNodesChange) {
        onDeduplicateNodesChange(deduplicate);
      }
    },
    [onDeduplicateNodesChange],
  );

  const clearFilters = useCallback(() => {
    setFilters({
      namespaces: [],
      pods: [],
      labels: "",
    });
    // Reset direction filter to "all"
    if (onDirectionFilterChange) {
      onDirectionFilterChange("all");
    }
    // Do not reset node deduplication - it's a view preference, not a filter
  }, [onDirectionFilterChange]);

  const toggleSection = useCallback(
    (section) => {
      setExpandedSection(section === expandedSection ? null : section);
    },
    [expandedSection],
  );

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        namespaceDropdownOpen &&
        !event.target.closest(".namespace-dropdown")
      ) {
        setNamespaceDropdownOpen(false);
      }
      if (podDropdownOpen && !event.target.closest(".pod-dropdown")) {
        setPodDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [namespaceDropdownOpen, podDropdownOpen]);

  return (
    <div
      className={`w-72 ${
        theme === "dark" ? "cyberpunk-sidebar text-gray-100" : "bg-gray-200"
      } p-4 flex flex-col`}
      style={{ height: "100%", overflow: "hidden" }}
    >
      {/* Section Toggle Buttons */}
      <div className="flex space-x-1 mb-4">
        <button
          className={`flex-1 px-2 py-1 text-xs rounded-t-md ${
            expandedSection === "upload"
              ? theme === "dark"
                ? "bg-cyan-600 text-white"
                : "bg-blue-500 text-white"
              : theme === "dark"
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-gray-300"
          }`}
          onClick={() => toggleSection("upload")}
        >
          Upload
        </button>
        <button
          className={`flex-1 px-2 py-1 text-xs rounded-t-md ${
            expandedSection === "filters"
              ? theme === "dark"
                ? "bg-cyan-600 text-white"
                : "bg-blue-500 text-white"
              : theme === "dark"
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-gray-300"
          }`}
          onClick={() => toggleSection("filters")}
        >
          Filters
        </button>
        <button
          className={`flex-1 px-2 py-1 text-xs rounded-t-md ${
            expandedSection === "policies"
              ? theme === "dark"
                ? "bg-cyan-600 text-white"
                : "bg-blue-500 text-white"
              : theme === "dark"
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-gray-300"
          }`}
          onClick={() => toggleSection("policies")}
        >
          Policies
        </button>
        <button
          className={`flex-1 px-2 py-1 text-xs rounded-t-md ${
            expandedSection === "cluster"
              ? theme === "dark"
                ? "bg-cyan-600 text-white"
                : "bg-green-500 text-white"
              : theme === "dark"
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-gray-300"
          }`}
          onClick={() => toggleSection("cluster")}
        >
          Cluster
        </button>
      </div>

      {/* Legend - Always Visible */}
      <div
        className={`mb-4 p-2 ${
          theme === "dark" ? "cyberpunk-card" : "bg-white rounded shadow-sm"
        } flex-shrink-0`}
      >
        <h2 className="text-sm font-semibold mb-2">Legend</h2>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
            <span>Pods</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Namespaces</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-3 h-3 bg-orange-400 mr-2"
              style={{
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              }}
            ></div>
            <span>IP Blocks</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-3 h-3 bg-purple-500 mr-2"
              style={{
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              }}
            ></div>
            <span>Combined Selectors</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 border-t-2 border-red-500 mr-2"></div>
            <span>Ingress Rules</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 border-t-2 border-green-400 mr-2"></div>
            <span>Egress Rules</span>
          </div>
        </div>
      </div>

      {/* Expandable Sections Container */}
      <div className="flex-1 overflow-hidden">
        {/* Upload Section */}
        {expandedSection === "upload" && (
          <div className="h-full overflow-auto">
            <h2 className="text-lg font-semibold mb-2">Upload Policies</h2>
            <div className="flex flex-col space-y-2">
              <label
                className={`cursor-pointer border-2 border-dashed ${
                  theme === "dark"
                    ? "border-cyan-700 hover:bg-gray-800 text-cyan-400"
                    : "border-gray-400 hover:bg-gray-300"
                } rounded p-3 text-center transition`}
                htmlFor="file-upload"
              >
                <span className="block text-sm">
                  Click to upload YAML/JSON files
                </span>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".yaml,.yml,.json"
                />
              </label>
              <button
                onClick={handleUseSampleData}
                className={`${
                  theme === "dark"
                    ? "cyberpunk-button"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                } p-2 rounded transition-colors`}
              >
                Use Sample Data
              </button>
              <textarea
                className={`border p-2 rounded w-full h-24 text-xs mt-2 ${
                  theme === "dark" ? "cyberpunk-input" : "bg-white"
                }`}
                placeholder="Or paste YAML here and press Load"
                onChange={(e) => setPasteContent(e.target.value)}
                value={pasteContent}
              ></textarea>
              <button
                onClick={handlePasteContent}
                className={`${
                  theme === "dark"
                    ? "cyberpunk-button"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                } p-2 rounded transition-colors`}
                disabled={!pasteContent}
              >
                Load Pasted Content
              </button>
            </div>
            {loading && (
              <div className="text-center py-2 mt-2">
                <p>Loading...</p>
              </div>
            )}

            {error && (
              <div
                className={`${
                  theme === "dark"
                    ? "bg-red-900 border-red-700 text-red-200"
                    : "bg-red-100 border-red-400 text-red-700"
                } border p-2 rounded mt-2`}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* Filters Section */}
        {expandedSection === "filters" && (
          <div className="h-full overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                onClick={clearFilters}
                className={`text-xs ${
                  theme === "dark"
                    ? "text-cyan-400 hover:text-cyan-300"
                    : "text-blue-600"
                } hover:underline`}
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3">
              {/* Node Deduplication Filter */}
              <NodeFilter
                deduplicateNodes={deduplicateNodes}
                onDeduplicateNodesChange={handleDeduplicateNodesChange}
                theme={theme}
              />

              {/* Traffic Direction Filter */}
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  } mb-1`}
                >
                  Traffic Direction
                </label>
                <div className="flex space-x-1 w-full">
                  <button
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      directionFilter === "all"
                        ? theme === "dark"
                          ? "bg-cyan-600 text-white"
                          : "bg-blue-500 text-white"
                        : theme === "dark"
                          ? "bg-gray-800 text-gray-300"
                          : "bg-gray-300"
                    }`}
                    onClick={() => handleDirectionFilterChange("all")}
                  >
                    All
                  </button>
                  <button
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      directionFilter === "ingress"
                        ? theme === "dark"
                          ? "bg-red-700 text-white"
                          : "bg-red-500 text-white"
                        : theme === "dark"
                          ? "bg-gray-800 text-gray-300"
                          : "bg-gray-300"
                    }`}
                    onClick={() => handleDirectionFilterChange("ingress")}
                  >
                    Ingress
                  </button>
                  <button
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      directionFilter === "egress"
                        ? theme === "dark"
                          ? "bg-green-700 text-white"
                          : "bg-green-500 text-white"
                        : theme === "dark"
                          ? "bg-gray-800 text-gray-300"
                          : "bg-gray-300"
                    }`}
                    onClick={() => handleDirectionFilterChange("egress")}
                  >
                    Egress
                  </button>
                </div>
              </div>

              {/* Namespace Multi-select Dropdown with Sort Button */}
              <div className="relative namespace-dropdown">
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  } mb-1 flex justify-between items-center`}
                >
                  <span>Namespaces</span>
                  <div className="flex items-center">
                    <button
                      className={`text-xs px-2 py-0.5 rounded ${
                        sortNamespaces
                          ? theme === "dark"
                            ? "bg-cyan-600 text-white"
                            : "bg-blue-500 text-white"
                          : theme === "dark"
                            ? "bg-gray-800 text-gray-300"
                            : "bg-gray-200 text-gray-700"
                      }`}
                      onClick={() => setSortNamespaces(!sortNamespaces)}
                      title={
                        sortNamespaces
                          ? "Sorted alphabetically"
                          : "Original order"
                      }
                    >
                      {sortNamespaces ? "Sorted" : "Unsorted"}
                    </button>
                  </div>
                </label>
                <div
                  className={`flex items-center justify-between p-2 border rounded ${
                    theme === "dark"
                      ? "cyberpunk-input cursor-pointer"
                      : "bg-white cursor-pointer"
                  }`}
                  onClick={() =>
                    setNamespaceDropdownOpen(!namespaceDropdownOpen)
                  }
                >
                  <span className="text-sm truncate">
                    {filters.namespaces.length
                      ? `${filters.namespaces.length} selected`
                      : "All Namespaces"}
                  </span>
                  <svg
                    className={`h-4 w-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {namespaceDropdownOpen && (
                  <div
                    className={`absolute z-10 mt-1 w-full ${
                      theme === "dark"
                        ? "bg-gray-900 border border-cyan-800"
                        : "bg-white border"
                    } rounded shadow-lg max-h-60 overflow-auto`}
                  >
                    {availableNamespaces.length === 0 ? (
                      <div
                        className={`p-2 text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        No namespaces available
                      </div>
                    ) : (
                      <div className="p-1">
                        {/* Apply sorting conditionally */}
                        {(sortNamespaces
                          ? sortAlphabetically(availableNamespaces)
                          : availableNamespaces
                        ).map((namespace) => (
                          <div
                            key={namespace}
                            className={`flex items-center p-2 ${
                              theme === "dark"
                                ? "hover:bg-gray-800"
                                : "hover:bg-gray-100"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNamespace(namespace);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={filters.namespaces.includes(namespace)}
                              onChange={() => {}}
                              className={`mr-2 ${
                                theme === "dark"
                                  ? "text-cyan-500 focus:ring-cyan-600 border-gray-700 bg-gray-800"
                                  : "text-blue-600 focus:ring-blue-500 border-gray-300"
                              }`}
                            />
                            <span
                              className={`text-sm flex items-center ${
                                theme === "dark" ? "text-gray-300" : ""
                              }`}
                            >
                              {namespace}
                              {combinedNamespaces.has(namespace) && (
                                <span
                                  className={`ml-1 text-xs px-1 ${
                                    theme === "dark"
                                      ? "bg-purple-900 text-purple-300"
                                      : "bg-purple-100 text-purple-800"
                                  } rounded`}
                                  title="Used in combined selectors"
                                >
                                  combined
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pod Multi-select Dropdown with Sort Button */}
              <div className="relative pod-dropdown">
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  } mb-1 flex justify-between items-center`}
                >
                  <span>Pod Selectors</span>
                  <div className="flex items-center">
                    <button
                      className={`text-xs px-2 py-0.5 rounded ${
                        sortPods
                          ? theme === "dark"
                            ? "bg-cyan-600 text-white"
                            : "bg-blue-500 text-white"
                          : theme === "dark"
                            ? "bg-gray-800 text-gray-300"
                            : "bg-gray-200 text-gray-700"
                      }`}
                      onClick={() => setSortPods(!sortPods)}
                      title={
                        sortPods ? "Sorted alphabetically" : "Original order"
                      }
                    >
                      {sortPods ? "Sorted" : "Unsorted"}
                    </button>
                  </div>
                </label>
                <div
                  className={`flex items-center justify-between p-2 border rounded ${
                    theme === "dark"
                      ? "cyberpunk-input cursor-pointer"
                      : "bg-white cursor-pointer"
                  }`}
                  onClick={() => setPodDropdownOpen(!podDropdownOpen)}
                >
                  <span className="text-sm truncate">
                    {filters.pods.length
                      ? `${filters.pods.length} selected`
                      : "All Pods"}
                  </span>
                  <svg
                    className={`h-4 w-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
                {podDropdownOpen && (
                  <div
                    className={`absolute z-10 mt-1 w-full ${
                      theme === "dark"
                        ? "bg-gray-900 border border-cyan-800"
                        : "bg-white border"
                    } rounded shadow-lg max-h-60 overflow-auto`}
                  >
                    {availablePods.length === 0 ? (
                      <div
                        className={`p-2 text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        No pods available
                      </div>
                    ) : (
                      <div className="p-1">
                        {/* Apply sorting conditionally */}
                        {(sortPods
                          ? sortAlphabetically(availablePods)
                          : availablePods
                        ).map((pod) => (
                          <div
                            key={pod}
                            className={`flex items-center p-2 ${
                              theme === "dark"
                                ? "hover:bg-gray-800"
                                : "hover:bg-gray-100"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePod(pod);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={filters.pods.includes(pod)}
                              onChange={() => {}}
                              className={`mr-2 ${
                                theme === "dark"
                                  ? "text-cyan-500 focus:ring-cyan-600 border-gray-700 bg-gray-800"
                                  : "text-blue-600 focus:ring-blue-500 border-gray-300"
                              }`}
                            />
                            <span
                              className={`text-sm flex items-center ${
                                theme === "dark" ? "text-gray-300" : ""
                              }`}
                            >
                              {pod}
                              {combinedPods.has(pod) && (
                                <span
                                  className={`ml-1 text-xs px-1 ${
                                    theme === "dark"
                                      ? "bg-purple-900 text-purple-300"
                                      : "bg-purple-100 text-purple-800"
                                  } rounded`}
                                  title="Used in combined selectors"
                                >
                                  combined
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Label Text Filter */}
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  } mb-1`}
                >
                  Label Search
                </label>
                <input
                  type="text"
                  value={filters.labels}
                  onChange={handleLabelFilterChange}
                  placeholder="Filter by label key or value"
                  className={`p-2 block w-full rounded border shadow-sm ${
                    theme === "dark"
                      ? "cyberpunk-input"
                      : "focus:border-blue-500 focus:ring-blue-500"
                  } text-sm`}
                />
              </div>
            </div>

            <div
              className={`mt-3 text-xs ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {localFilteredPolicies.length} of {policies.length} policies shown
            </div>
          </div>
        )}

        {/* Policies Section with Sort Button */}
        {expandedSection === "policies" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
              <h2 className="text-lg font-semibold">
                Policies ({localFilteredPolicies.length})
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  className={`text-xs px-2 py-0.5 rounded ${
                    sortPolicies
                      ? theme === "dark"
                        ? "bg-cyan-600 text-white"
                        : "bg-blue-500 text-white"
                      : theme === "dark"
                        ? "bg-gray-800 text-gray-300"
                        : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => setSortPolicies(!sortPolicies)}
                  title={
                    sortPolicies ? "Sorted alphabetically" : "Original order"
                  }
                >
                  {sortPolicies ? "Sorted" : "Unsorted"}
                </button>
              </div>
            </div>

            {localFilteredPolicies.length === 0 ? (
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {policies.length === 0
                  ? "No policies loaded"
                  : "No policies match your filters"}
              </p>
            ) : (
              <div
                className={`flex-1 overflow-auto border rounded ${
                  theme === "dark" ? "bg-gray-900 border-cyan-900" : "bg-white"
                }`}
                style={{ minHeight: 0 }}
              >
                <ul
                  className={`divide-y ${
                    theme === "dark" ? "divide-gray-800" : "divide-gray-200"
                  }`}
                >
                  {/* Apply sorting conditionally */}
                  {(sortPolicies
                    ? [...localFilteredPolicies].sort((a, b) =>
                        a.name.localeCompare(b.name),
                      )
                    : localFilteredPolicies
                  ).map((policy, index) => (
                    <li
                      key={index}
                      className={`p-2 ${
                        theme === "dark"
                          ? "hover:bg-gray-800"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium text-sm truncate ${
                              theme === "dark" ? "text-gray-200" : ""
                            }`}
                            title={policy.name}
                          >
                            {policy.name}
                          </div>
                          <div
                            className={`text-xs ${
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600"
                            } truncate`}
                          >
                            {policy.namespace}
                          </div>
                        </div>
                        <button
                          className={`${
                            theme === "dark"
                              ? "text-cyan-400 hover:text-cyan-300 bg-gray-800 hover:bg-gray-700"
                              : "text-blue-500 hover:text-blue-700 bg-blue-50"
                          } text-xs px-2 py-1 rounded flex-shrink-0 ml-2`}
                          onClick={() => setShowPolicyDetails(policy)}
                        >
                          Details
                        </button>
                      </div>
                      <div
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {policy.policyTypes && policy.policyTypes.join(", ")}
                      </div>
                      {policy.podSelectorLabels && (
                        <div
                          className={`text-xs ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          } truncate`}
                          title={policy.podSelectorLabels}
                        >
                          Labels: {policy.podSelectorLabels}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {expandedSection === "cluster" && (
          <div className="h-full overflow-auto">
            <h2 className="text-lg font-semibold mb-2">Load from Kubernetes</h2>
            <div className="flex flex-col space-y-2">
              <p
                className={theme === "dark" ? "text-gray-300" : "text-gray-600"}
              >
                Load NetworkPolicy resources directly from your Kubernetes
                cluster.
              </p>
              <ClusterIntegration
                onPoliciesLoaded={(policies) => {
                  setAllPolicies(policies);
                  setFilteredPolicies(policies);
                }}
                theme={theme}
              />
              <div
                className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mt-2`}
              >
                Requires RBAC permissions to read NetworkPolicy resources.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tips - Always visible at bottom */}
      <div
        className={`mt-2 text-xs ${
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        } flex-shrink-0`}
      >
        <p>Tip: Hover over nodes for details, drag to rearrange</p>
      </div>
    </div>
  );
};

export default Sidebar;
