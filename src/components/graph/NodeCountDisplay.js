// src/components/graph/NodeCountDisplay.js

import React from "react";

/**
 * Displays the count of nodes and links in the graph
 *
 * @param {Object} props - Component properties
 * @param {Object} props.graphData - The graph data object containing nodes and links
 * @param {Boolean} props.deduplicateNodes - Whether node deduplication is enabled
 * @returns {JSX.Element} - The rendered component
 */
const NodeCountDisplay = ({ graphData, deduplicateNodes }) => {
  if (!graphData || !graphData.nodes) {
    return null;
  }

  const nodeCount = graphData.nodes.length;
  const linkCount = graphData.links.length;

  return (
    <div className="absolute bottom-4 right-4 bg-white border border-gray-300 rounded-md shadow-md p-3 z-10 text-sm text-gray-700">
      <div className="flex flex-col">
        <div className="mb-1">
          <span className="font-medium">Nodes:</span> {nodeCount}
        </div>
        <div className="mb-1">
          <span className="font-medium">Links:</span> {linkCount}
        </div>
        <div className="text-xs text-gray-500">
          {deduplicateNodes
            ? "Deduplication enabled"
            : "Deduplication disabled"}
        </div>
      </div>
    </div>
  );
};

export default NodeCountDisplay;
