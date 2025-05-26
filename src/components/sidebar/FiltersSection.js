import React from "react";
import NodeFilter from "./NodeFilter.js";

/**
 * Filters section component that handles all filtering options
 */
const FiltersSection = ({
  filters,
  availableNamespaces,
  availablePods,
  combinedNamespaces,
  combinedPods,
  sortNamespaces,
  setSortNamespaces,
  sortPods,
  setSortPods,
  namespaceDropdownOpen,
  setNamespaceDropdownOpen,
  podDropdownOpen,
  setPodDropdownOpen,
  toggleNamespace,
  togglePod,
  handleLabelFilterChange,
  clearFilters,
  directionFilter,
  onDirectionFilterChange,
  deduplicateNodes,
  onDeduplicateNodesChange,
  localFilteredPolicies,
  totalPolicies,
  theme = "light",
}) => {
  // Helper function to sort arrays alphabetically
  const sortAlphabetically = (items) => {
    return [...items].sort((a, b) => a.localeCompare(b));
  };

  return (
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
          onDeduplicateNodesChange={onDeduplicateNodesChange}
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
              onClick={() => onDirectionFilterChange("all")}
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
              onClick={() => onDirectionFilterChange("ingress")}
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
              onClick={() => onDirectionFilterChange("egress")}
            >
              Egress
            </button>
          </div>
        </div>

        {/* Namespace Multi-select Dropdown */}
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
                  sortNamespaces ? "Sorted alphabetically" : "Original order"
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
            onClick={() => setNamespaceDropdownOpen(!namespaceDropdownOpen)}
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

        {/* Pod Multi-select Dropdown */}
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
                title={sortPods ? "Sorted alphabetically" : "Original order"}
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
        {localFilteredPolicies} of {totalPolicies} policies shown
      </div>
    </div>
  );
};

export default FiltersSection;
