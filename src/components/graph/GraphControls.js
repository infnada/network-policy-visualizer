// src/components/graph/GraphControls.js
// Components for graph controls and UI elements

import React from "react";

/**
 * Renders control buttons for visualization type and layout reset
 * @param {Object} props - Component props
 * @param {String} props.visualizationType - Current visualization type
 * @param {Function} props.setVisualizationType - Set visualization type function
 * @param {Function} props.resetLayout - Function to reset graph layout
 * @returns {React.Component}
 */
export const GraphControlPanel = ({
  visualizationType,
  setVisualizationType,
  resetLayout,
}) => {
  return (
    <div className="absolute top-4 right-4 bg-white rounded shadow-lg p-2 z-10">
      <div className="flex flex-col space-y-2">
        <div className="mb-1 text-sm font-medium text-gray-700">
          Visualization Type
        </div>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded ${
              visualizationType === "enhanced"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setVisualizationType("enhanced")}
            aria-label="Switch to enhanced visualization"
          >
            Enhanced
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${
              visualizationType === "classic"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setVisualizationType("classic")}
            aria-label="Switch to classic visualization"
          >
            Classic
          </button>
        </div>
        <button
          className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600"
          onClick={resetLayout}
          aria-label="Reset graph layout"
        >
          Reset Layout
        </button>
      </div>
    </div>
  );
};

/**
 * Renders an information panel with tips based on current visualization type
 * @param {Object} props - Component props
 * @param {String} props.visualizationType - Current visualization type
 * @returns {React.Component}
 */
export const InfoPanel = ({ visualizationType }) => {
  return (
    <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 rounded shadow-lg p-2 z-10 max-w-md">
      <div className="text-xs text-gray-700">
        <p className="font-medium">
          {visualizationType === "enhanced"
            ? "Enhanced View: Curved lines, namespace clustering, better spacing"
            : "Classic View: Original visualization with straight lines"}
        </p>
        <p>
          Tip:{" "}
          {visualizationType === "enhanced"
            ? "Nodes stay where you drag them. Hover for details."
            : "Drag nodes to arrange, double-click to reset position."}
        </p>
      </div>
    </div>
  );
};

/**
 * Renders a message when no network policies are loaded
 * @returns {React.Component}
 */
export const EmptyState = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <p className="text-xl text-gray-600 mb-4">No network policies loaded</p>
        <p className="text-gray-500">
          Upload YAML/JSON files containing NetworkPolicy resources or use the
          sample data
        </p>
      </div>
    </div>
  );
};
