import React, { useState, useEffect, useMemo, useCallback } from "react";
import UploadSection from "./UploadSection.js";
import FiltersSection from "./FiltersSection.js";
import PoliciesSection from "./PoliciesSection.js";

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
  graphData = null,
  onPoliciesLoaded, // This replaces setAllPolicies and should be passed from parent
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

  // Sorting state
  const [sortNamespaces, setSortNamespaces] = useState(true);
  const [sortPods, setSortPods] = useState(true);
  const [sortPolicies, setSortPolicies] = useState(true);

  // Track combined selectors
  const [combinedNamespaces, setCombinedNamespaces] = useState(new Set());
  const [combinedPods, setCombinedPods] = useState(new Set());

  // Helper function to extract namespace names from namespace selectors
  const extractNamespaceFromSelector = (namespaceSelector) => {
    if (!namespaceSelector) return null;

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

    if (
      namespaceSelector.matchExpressions &&
      Array.isArray(namespaceSelector.matchExpressions) &&
      namespaceSelector.matchExpressions.length > 0
    ) {
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
    const namespaces = new Set(policies.map((p) => p.namespace));
    const pods = new Set();
    const combinedNs = new Set();
    const combinedPd = new Set();

    policies.forEach((policy) => {
      if (policy.podSelector?.matchLabels) {
        const podName = extractPodFromSelector(policy.podSelector);
        if (podName) pods.add(podName);
      }

      // Process ingress and egress rules
      [...(policy.ingress || []), ...(policy.egress || [])].forEach((rule) => {
        const targets = rule.from || rule.to || [];
        targets.forEach((target) => {
          if (target.podSelector) {
            const podName = extractPodFromSelector(target.podSelector);
            if (podName) pods.add(podName);
          }

          if (target.namespaceSelector) {
            const namespaceName = extractNamespaceFromSelector(
              target.namespaceSelector,
            );
            if (namespaceName) namespaces.add(namespaceName);
          }

          if (target.podSelector && target.namespaceSelector) {
            const podName = extractPodFromSelector(target.podSelector);
            const namespaceName = extractNamespaceFromSelector(
              target.namespaceSelector,
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
      });
    });

    // Process the pre-built graph data if available
    if (graphData && graphData.nodes) {
      graphData.nodes.forEach((node) => {
        if (node.type === "combined" && node.details) {
          if (node.details.namespace) {
            const namespaceName = extractNamespaceFromSelector(
              node.details.namespace,
            );
            if (namespaceName) {
              namespaces.add(namespaceName);
              combinedNs.add(namespaceName);
            }
          }

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

    setAvailableNamespaces(Array.from(namespaces));
    setAvailablePods(Array.from(pods));
    setCombinedNamespaces(combinedNs);
    setCombinedPods(combinedPd);
    setLocalFilteredPolicies(policies);
  }, [policies, graphData]);

  // Memoize the filtered policies
  const filteredPoliciesMemo = useMemo(() => {
    let filtered = [...policies];

    const policyUsesNamespace = (policy, targetNamespace) => {
      if (policy.namespace === targetNamespace) return true;

      const allRules = [...(policy.ingress || []), ...(policy.egress || [])];
      return allRules.some((rule) => {
        const targets = rule.from || rule.to || [];
        return targets.some((target) => {
          if (target.namespaceSelector) {
            const namespaceName = extractNamespaceFromSelector(
              target.namespaceSelector,
            );
            return namespaceName === targetNamespace;
          }
          return false;
        });
      });
    };

    const policyUsesPod = (policy, targetPod) => {
      if (policy.podSelector?.matchLabels) {
        const podValues = Object.values(policy.podSelector.matchLabels);
        if (podValues.includes(targetPod)) return true;
      }

      const allRules = [...(policy.ingress || []), ...(policy.egress || [])];
      return allRules.some((rule) => {
        const targets = rule.from || rule.to || [];
        return targets.some((target) => {
          if (target.podSelector?.matchLabels) {
            const podValues = Object.values(target.podSelector.matchLabels);
            return podValues.includes(targetPod);
          }
          return false;
        });
      });
    };

    if (filters.namespaces.length > 0) {
      filtered = filtered.filter((policy) =>
        filters.namespaces.some((namespace) =>
          policyUsesNamespace(policy, namespace),
        ),
      );
    }

    if (filters.pods.length > 0) {
      filtered = filtered.filter((policy) =>
        filters.pods.some((pod) => policyUsesPod(policy, pod)),
      );
    }

    if (filters.labels) {
      filtered = filtered.filter((policy) => {
        const checkLabels = (selector) => {
          if (selector?.matchLabels) {
            const allLabels = Object.entries(selector.matchLabels)
              .map(([key, value]) => `${key}:${value}`)
              .join(" ")
              .toLowerCase();
            return allLabels.includes(filters.labels.toLowerCase());
          }
          return false;
        };

        if (checkLabels(policy.podSelector)) return true;

        const allRules = [...(policy.ingress || []), ...(policy.egress || [])];
        return allRules.some((rule) => {
          const targets = rule.from || rule.to || [];
          return targets.some((target) => checkLabels(target.podSelector));
        });
      });
    }

    return filtered;
  }, [policies, filters]);

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

  const clearFilters = useCallback(() => {
    setFilters({
      namespaces: [],
      pods: [],
      labels: "",
    });
    if (onDirectionFilterChange) {
      onDirectionFilterChange("all");
    }
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
          Load
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
          <UploadSection
            loading={loading}
            error={error}
            pasteContent={pasteContent}
            setPasteContent={setPasteContent}
            handleFileUpload={handleFileUpload}
            handleUseSampleData={handleUseSampleData}
            handlePasteContent={handlePasteContent}
            onPoliciesLoaded={onPoliciesLoaded}
            theme={theme}
          />
        )}

        {/* Filters Section */}
        {expandedSection === "filters" && (
          <FiltersSection
            filters={filters}
            availableNamespaces={availableNamespaces}
            availablePods={availablePods}
            combinedNamespaces={combinedNamespaces}
            combinedPods={combinedPods}
            sortNamespaces={sortNamespaces}
            setSortNamespaces={setSortNamespaces}
            sortPods={sortPods}
            setSortPods={setSortPods}
            namespaceDropdownOpen={namespaceDropdownOpen}
            setNamespaceDropdownOpen={setNamespaceDropdownOpen}
            podDropdownOpen={podDropdownOpen}
            setPodDropdownOpen={setPodDropdownOpen}
            toggleNamespace={toggleNamespace}
            togglePod={togglePod}
            handleLabelFilterChange={handleLabelFilterChange}
            clearFilters={clearFilters}
            directionFilter={directionFilter}
            onDirectionFilterChange={onDirectionFilterChange}
            deduplicateNodes={deduplicateNodes}
            onDeduplicateNodesChange={onDeduplicateNodesChange}
            localFilteredPolicies={localFilteredPolicies.length}
            totalPolicies={policies.length}
            theme={theme}
          />
        )}

        {/* Policies Section */}
        {expandedSection === "policies" && (
          <PoliciesSection
            localFilteredPolicies={localFilteredPolicies}
            totalPolicies={policies.length}
            sortPolicies={sortPolicies}
            setSortPolicies={setSortPolicies}
            setShowPolicyDetails={setShowPolicyDetails}
            theme={theme}
          />
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
