// src/components/graph/GraphControls.js
// Components for graph controls and UI elements with theme support

import React from "react";

/**
 * Renders control buttons for visualization type and layout reset
 * @param {Object} props - Component props
 * @param {String} props.visualizationType - Current visualization type
 * @param {Function} props.setVisualizationType - Set visualization type function
 * @param {Function} props.resetLayout - Function to reset graph layout
 * @param {String} props.theme - Current theme ('light' or 'dark')
 * @returns {React.Component}
 */
export const GraphControlPanel = ({
  visualizationType,
  setVisualizationType,
  resetLayout,
  theme = "light",
}) => {
  return (
    <div
      className={`absolute top-4 right-4 ${
        theme === "dark" ? "graph-control-panel" : "bg-white"
      } rounded shadow-lg p-2 z-10`}
    >
      <div className="flex flex-col space-y-2">
        <div
          className={`mb-1 text-sm font-medium ${
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Visualization Type
        </div>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded ${
              visualizationType === "enhanced"
                ? theme === "dark"
                  ? "bg-cyan-600 text-white"
                  : "bg-blue-500 text-white"
                : theme === "dark"
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
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
                ? theme === "dark"
                  ? "bg-cyan-600 text-white"
                  : "bg-blue-500 text-white"
                : theme === "dark"
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setVisualizationType("classic")}
            aria-label="Switch to classic visualization"
          >
            Classic
          </button>
        </div>
        <button
          className={`${
            theme === "dark"
              ? "bg-cyan-700 hover:bg-cyan-600 text-white shadow shadow-cyan-900/50"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          } px-3 py-1 text-sm rounded transition-colors`}
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
 * @param {String} props.theme - Current theme ('light' or 'dark')
 * @returns {React.Component}
 */
export const InfoPanel = ({ visualizationType, theme = "light" }) => {
  return (
    <div
      className={`absolute bottom-4 left-4 ${
        theme === "dark"
          ? "bg-gray-900 bg-opacity-80 border border-cyan-900 shadow-lg shadow-cyan-900/20"
          : "bg-white bg-opacity-80 shadow-lg"
      } rounded p-2 z-10 max-w-md`}
    >
      <div
        className={`text-xs ${
          theme === "dark" ? "text-gray-300" : "text-gray-700"
        }`}
      >
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
 * @param {String} props.theme - Current theme ('light' or 'dark')
 * @returns {React.Component}
 */
export const EmptyState = ({ theme = "light" }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <p
          className={`text-xl ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          } mb-4`}
        >
          No network policies loaded
        </p>
        <p className={theme === "dark" ? "text-gray-500" : "text-gray-500"}>
          Upload YAML/JSON files containing NetworkPolicy resources or use the
          sample data
        </p>
      </div>
    </div>
  );
};
