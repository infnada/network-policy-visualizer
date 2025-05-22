// Updated GraphControlPanel component with additional re-arrange option for classic view

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
  // Function to re-arrange nodes randomly (only for classic view)
  const shuffleNodes = () => {
    if (visualizationType === "classic") {
      // Trigger layout reset with a higher alpha value for more movement
      resetLayout({ shuffleNodes: true });
    }
  };

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

        {/* Show Re-arrange button only in classic view */}
        {visualizationType === "classic" && (
          <button
            className={`${
              theme === "dark"
                ? "bg-purple-700 hover:bg-purple-600 text-white shadow shadow-purple-900/50"
                : "bg-purple-500 hover:bg-purple-400 text-white"
            } px-3 py-1 text-sm rounded transition-colors`}
            onClick={shuffleNodes}
            aria-label="Re-arrange nodes"
          >
            Re-arrange Nodes
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Renders an information panel with tips based on current visualization type
 * @param {Object} props - Component props
 * @param {String} props.visualizationType - Current visualization type
 * @param {String} props.theme - Current theme ('light' or 'dark')
 * @param {String} props.additionalInfo - Optional additional information to display
 * @returns {React.Component}
 */
export const InfoPanel = ({
  visualizationType,
  theme = "light",
  additionalInfo = "",
}) => {
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
            : "Classic View: Traditional visualization with straight lines and improved spacing"}
        </p>
        <p>
          Tip:{" "}
          {visualizationType === "enhanced"
            ? "Nodes stay where you drag them. Hover for details."
            : "Drag nodes to arrange. Use 'Re-arrange Nodes' button if nodes overlap."}
        </p>
        {additionalInfo && (
          <p className="mt-1 text-xs italic">{additionalInfo}</p>
        )}
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
