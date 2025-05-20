import React from "react";

/**
 * NodeFilter component for controlling node deduplication in the graph
 *
 * @param {Object} props - Component properties
 * @param {boolean} props.deduplicateNodes - Current node deduplication state
 * @param {Function} props.onDeduplicateNodesChange - Handler for deduplication toggle
 * @returns {JSX.Element} - The rendered component
 */
const NodeFilter = ({ deduplicateNodes = true, onDeduplicateNodesChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Node Display Options
      </label>

      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          id="deduplicate-nodes"
          checked={deduplicateNodes}
          onChange={(e) => onDeduplicateNodesChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="deduplicate-nodes"
          className="ml-2 text-sm text-gray-700"
        >
          Deduplicate nodes with same selectors
        </label>
      </div>

      <div className="text-xs text-gray-500 ml-6">
        {deduplicateNodes
          ? "Showing one node per unique selector (multiple ports shown in tooltips)"
          : "Showing separate nodes for each policy/port combination"}
      </div>
    </div>
  );
};

export default NodeFilter;
