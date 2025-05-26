import React from "react";
import ClusterIntegration from "./ClusterIntegration.js";

/**
 * Upload section component that handles file uploads, sample data, paste content, and cluster integration
 */
const UploadSection = ({
  loading,
  error,
  pasteContent,
  setPasteContent,
  handleFileUpload,
  handleUseSampleData,
  handlePasteContent,
  onPoliciesLoaded, // This will be passed from the parent
  theme = "light",
}) => {
  return (
    <div className="h-full overflow-auto">
      <h2 className="text-lg font-semibold mb-4">Load Policies</h2>

      {/* File Upload Section */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-2">Upload Files</h3>
        <div className="flex flex-col space-y-2">
          <label
            className={`cursor-pointer border-2 border-dashed ${
              theme === "dark"
                ? "border-cyan-700 hover:bg-gray-800 text-cyan-400"
                : "border-gray-400 hover:bg-gray-300"
            } rounded p-3 text-center transition`}
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
            className={`${
              theme === "dark"
                ? "cyberpunk-button"
                : "bg-blue-500 text-white hover:bg-blue-600"
            } p-2 rounded transition-colors`}
          >
            Use Sample Data
          </button>
        </div>
      </div>

      {/* Paste Content Section */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-2">Paste YAML/JSON</h3>
        <div className="flex flex-col space-y-2">
          <textarea
            className={`border p-2 rounded w-full h-24 text-xs ${
              theme === "dark" ? "cyberpunk-input" : "bg-white"
            }`}
            placeholder="Paste YAML or JSON content here"
            onChange={(e) => setPasteContent(e.target.value)}
            value={pasteContent}
          />
          <button
            onClick={handlePasteContent}
            className={`${
              theme === "dark"
                ? "cyberpunk-button"
                : "bg-blue-500 text-white hover:bg-blue-600"
            } p-2 rounded transition-colors`}
            disabled={!pasteContent}
          >
            Load Pasted Content
          </button>
        </div>
      </div>

      {/* Cluster Integration Section */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-2">
          Load from Kubernetes Cluster
        </h3>
        <div className="flex flex-col space-y-2">
          <p
            className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
          >
            Load NetworkPolicy resources directly from your Kubernetes cluster.
          </p>
          <ClusterIntegration
            onPoliciesLoaded={onPoliciesLoaded}
            theme={theme}
          />
          <div
            className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
          >
            Requires RBAC permissions to read NetworkPolicy resources.
          </div>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="text-center py-2 mt-2">
          <p>Loading...</p>
        </div>
      )}

      {error && (
        <div
          className={`${
            theme === "dark"
              ? "bg-red-900 border-red-700 text-red-200"
              : "bg-red-100 border-red-400 text-red-700"
          } border p-2 rounded mt-2`}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default UploadSection;
