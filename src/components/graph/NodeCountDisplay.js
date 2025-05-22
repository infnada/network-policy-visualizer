import React from "react";

/**
 * Displays the count of nodes and links in the graph
 *
 * @param {Object} props - Component properties
 * @param {Object} props.graphData - The graph data object containing nodes and links
 * @param {Boolean} props.deduplicateNodes - Whether node deduplication is enabled
 * @param {String} props.theme - Current theme ('light' or 'dark')
 * @returns {JSX.Element} - The rendered component
 */
const NodeCountDisplay = ({ graphData, deduplicateNodes, theme = "light" }) => {
  if (!graphData || !graphData.nodes) {
    return null;
  }

  const nodeCount = graphData.nodes.length;
  const linkCount = graphData.links.length;

  return (
    <div
      className={`absolute bottom-4 right-4 ${
        theme === "dark"
          ? "bg-gray-900 border border-cyan-900 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          : "bg-white border border-gray-300 shadow-md"
      } rounded-md p-3 z-10 text-sm ${
        theme === "dark" ? "text-gray-300" : "text-gray-700"
      }`}
    >
      <div className="flex flex-col">
        <div className="mb-1">
          <span className="font-medium">Nodes:</span> {nodeCount}
        </div>
        <div className="mb-1">
          <span className="font-medium">Links:</span> {linkCount}
        </div>
        <div
          className={`text-xs ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {deduplicateNodes
            ? "Deduplication enabled"
            : "Deduplication disabled"}
        </div>
      </div>
    </div>
  );
};

export default NodeCountDisplay;
