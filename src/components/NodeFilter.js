import React from "react";

/**
 * NodeFilter component for controlling node deduplication in the graph
 *
 * @param {Object} props - Component properties
 * @param {boolean} props.deduplicateNodes - Current node deduplication state
 * @param {Function} props.onDeduplicateNodesChange - Handler for deduplication toggle
 * @param {String} props.theme - Current theme ('light' or 'dark')
 * @returns {JSX.Element} - The rendered component
 */
const NodeFilter = ({
  deduplicateNodes = true,
  onDeduplicateNodesChange,
  theme = "light",
}) => {
  return (
    <div className="mb-4">
      <label
        className={`block text-sm font-medium ${
          theme === "dark" ? "text-gray-300" : "text-gray-700"
        } mb-1`}
      >
        Node Display Options
      </label>

      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          id="deduplicate-nodes"
          checked={deduplicateNodes}
          onChange={(e) => onDeduplicateNodesChange(e.target.checked)}
          className={`h-4 w-4 ${
            theme === "dark"
              ? "text-cyan-500 focus:ring-cyan-600 border-gray-700 bg-gray-800"
              : "text-blue-600 focus:ring-blue-500 border-gray-300"
          } rounded`}
        />
        <label
          htmlFor="deduplicate-nodes"
          className={`ml-2 text-sm ${
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Deduplicate nodes with same selectors
        </label>
      </div>

      <div
        className={`text-xs ${
          theme === "dark" ? "text-gray-400" : "text-gray-500"
        } ml-6`}
      >
        {deduplicateNodes
          ? "Showing one node per unique selector (multiple ports shown in tooltips)"
          : "Showing separate nodes for each policy/port combination"}
      </div>
    </div>
  );
};

export default NodeFilter;
