import React, { useState, useEffect, useMemo, useCallback } from "react";
import NodeFilter from "./NodeFilter"; // Import the new NodeFilter component

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

  // Extract available filter options from policies
  useEffect(() => {
    const namespaces = [...new Set(policies.map((p) => p.namespace))];
    setAvailableNamespaces(namespaces);

    // Extract unique pod names from selectors
    const pods = new Set();
    policies.forEach((p) => {
      if (p.podSelector?.matchLabels) {
        // Try to find app name or similar from labels
        const appLabels = Object.entries(p.podSelector.matchLabels)
          .filter(([key]) => key.includes("app") || key.includes("name"))
          .map(([_, value]) => value);

        appLabels.forEach((app) => pods.add(app));
      }
    });
    setAvailablePods(Array.from(pods));

    // Initialize filtered policies
    setLocalFilteredPolicies(policies);
  }, [policies]);

  // Memoize the filtered policies
  const filteredPoliciesMemo = useMemo(() => {
    let filtered = [...policies];

    if (filters.namespaces.length > 0) {
      filtered = filtered.filter((p) =>
        filters.namespaces.includes(p.namespace),
      );
    }

    if (filters.pods.length > 0) {
      filtered = filtered.filter((p) => {
        // Check if any labels in podSelector match selected pods
        if (p.podSelector?.matchLabels) {
          const podLabels = Object.values(p.podSelector.matchLabels);
          return filters.pods.some((pod) => podLabels.includes(pod));
        }
        return false;
      });
    }

    if (filters.labels) {
      filtered = filtered.filter((p) => {
        // Check if any label key or value matches the filter
        if (p.podSelector?.matchLabels) {
          const allLabels = Object.entries(p.podSelector.matchLabels)
            .map(([key, value]) => `${key}:${value}`)
            .join(" ")
            .toLowerCase();

          return allLabels.includes(filters.labels.toLowerCase());
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
      className="w-72 bg-gray-200 p-4 flex flex-col"
      style={{ height: "100%", overflow: "hidden" }}
    >
      {/* Section Toggle Buttons */}
      <div className="flex space-x-1 mb-4">
        <button
          className={`flex-1 px-2 py-1 text-xs rounded-t-md ${expandedSection === "upload" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
          onClick={() => toggleSection("upload")}
        >
          Upload
        </button>
        <button
          className={`flex-1 px-2 py-1 text-xs rounded-t-md ${expandedSection === "filters" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
          onClick={() => toggleSection("filters")}
        >
          Filters
        </button>
        <button
          className={`flex-1 px-2 py-1 text-xs rounded-t-md ${expandedSection === "policies" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
          onClick={() => toggleSection("policies")}
        >
          Policies
        </button>
      </div>

      {/* Legend - Always Visible */}
      <div className="mb-4 p-2 bg-white rounded shadow-sm flex-shrink-0">
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
                className="cursor-pointer border-2 border-dashed border-gray-400 rounded p-3 text-center hover:bg-gray-300 transition"
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
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Use Sample Data
              </button>
              <textarea
                className="border p-2 rounded w-full h-24 text-xs mt-2"
                placeholder="Or paste YAML here and press Load"
                onChange={(e) => setPasteContent(e.target.value)}
                value={pasteContent}
              ></textarea>
              <button
                onClick={handlePasteContent}
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
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
              <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded mt-2">
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
                className="text-xs text-blue-600 hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3">
              {/* Node Deduplication Filter */}
              <NodeFilter
                deduplicateNodes={deduplicateNodes}
                onDeduplicateNodesChange={handleDeduplicateNodesChange}
              />

              {/* Traffic Direction Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Traffic Direction
                </label>
                <div className="flex space-x-1 w-full">
                  <button
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      directionFilter === "all"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300"
                    }`}
                    onClick={() => handleDirectionFilterChange("all")}
                  >
                    All
                  </button>
                  <button
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      directionFilter === "ingress"
                        ? "bg-red-500 text-white"
                        : "bg-gray-300"
                    }`}
                    onClick={() => handleDirectionFilterChange("ingress")}
                  >
                    Ingress
                  </button>
                  <button
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      directionFilter === "egress"
                        ? "bg-green-500 text-white"
                        : "bg-gray-300"
                    }`}
                    onClick={() => handleDirectionFilterChange("egress")}
                  >
                    Egress
                  </button>
                </div>
              </div>

              {/* Namespace Multi-select Dropdown */}
              <div className="relative namespace-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Namespaces
                </label>
                <div
                  className="flex items-center justify-between p-2 border rounded bg-white cursor-pointer"
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
                    className="h-4 w-4 text-gray-500"
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
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto">
                    {availableNamespaces.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No namespaces available
                      </div>
                    ) : (
                      <div className="p-1">
                        {availableNamespaces.map((namespace) => (
                          <div
                            key={namespace}
                            className="flex items-center p-2 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNamespace(namespace);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={filters.namespaces.includes(namespace)}
                              onChange={() => {}}
                              className="mr-2"
                            />
                            <span className="text-sm">{namespace}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pod Multi-select Dropdown */}
              <div className="relative pod-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pod Selectors
                </label>
                <div
                  className="flex items-center justify-between p-2 border rounded bg-white cursor-pointer"
                  onClick={() => setPodDropdownOpen(!podDropdownOpen)}
                >
                  <span className="text-sm truncate">
                    {filters.pods.length
                      ? `${filters.pods.length} selected`
                      : "All Pods"}
                  </span>
                  <svg
                    className="h-4 w-4 text-gray-500"
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
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto">
                    {availablePods.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No pods available
                      </div>
                    ) : (
                      <div className="p-1">
                        {availablePods.map((pod) => (
                          <div
                            key={pod}
                            className="flex items-center p-2 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePod(pod);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={filters.pods.includes(pod)}
                              onChange={() => {}}
                              className="mr-2"
                            />
                            <span className="text-sm">{pod}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Label Text Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label Search
                </label>
                <input
                  type="text"
                  value={filters.labels}
                  onChange={handleLabelFilterChange}
                  placeholder="Filter by label key or value"
                  className="p-2 block w-full rounded border shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              {localFilteredPolicies.length} of {policies.length} policies shown
            </div>
          </div>
        )}

        {/* Policies Section */}
        {expandedSection === "policies" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <h2 className="text-lg font-semibold mb-2 flex-shrink-0">
              Policies ({localFilteredPolicies.length})
            </h2>

            {localFilteredPolicies.length === 0 ? (
              <p className="text-sm text-gray-600">
                {policies.length === 0
                  ? "No policies loaded"
                  : "No policies match your filters"}
              </p>
            ) : (
              <div
                className="flex-1 overflow-auto border rounded bg-white"
                style={{ minHeight: 0 }}
              >
                <ul className="divide-y divide-gray-200">
                  {localFilteredPolicies.map((policy, index) => (
                    <li key={index} className="p-2 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium text-sm truncate"
                            title={policy.name}
                          >
                            {policy.name}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {policy.namespace}
                          </div>
                        </div>
                        <button
                          className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 bg-blue-50 rounded flex-shrink-0 ml-2"
                          onClick={() => setShowPolicyDetails(policy)}
                        >
                          Details
                        </button>
                      </div>
                      <div className="text-xs text-gray-600">
                        {policy.policyTypes && policy.policyTypes.join(", ")}
                      </div>
                      {policy.podSelectorLabels && (
                        <div
                          className="text-xs text-gray-600 truncate"
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
      </div>

      {/* Tips - Always visible at bottom */}
      <div className="mt-2 text-xs text-gray-600 flex-shrink-0">
        <p>Tip: Hover over nodes for details, drag to rearrange</p>
      </div>
    </div>
  );
};

export default Sidebar;
