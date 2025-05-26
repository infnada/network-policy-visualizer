import React, { useState } from "react";
import { parseNetworkPolicy } from "../../utils/parsers.js";

/**
 * Component for handling loading network policies directly from the Kubernetes cluster
 *
 * @param {Object} props - Component properties
 * @param {Function} props.onPoliciesLoaded - Callback when policies are loaded from the cluster
 * @param {String} props.theme - Current theme ('light' or 'dark')
 * @returns {JSX.Element} - The rendered component
 */
const ClusterIntegration = ({ onPoliciesLoaded, theme = "light" }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [namespace, setNamespace] = useState("");

  const loadFromCluster = async () => {
    setLoading(true);
    setError(null);

    try {
      // Determine the endpoint based on namespace selection
      const endpoint = namespace
        ? `/api/networkpolicies/${namespace}`
        : "/api/networkpolicies";

      const response = await fetch(endpoint);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details ||
            errorData.error ||
            `Failed to load policies: ${response.statusText}`,
        );
      }

      const rawPolicies = await response.json();

      if (Array.isArray(rawPolicies) && rawPolicies.length > 0) {
        const parsedPolicies = rawPolicies
          .map((rawPolicy) => {
            try {
              // The cluster returns raw Kubernetes NetworkPolicy objects
              // We need to parse them the same way as file uploads
              return parseNetworkPolicy(rawPolicy);
            } catch (parseError) {
              console.error(
                "Error parsing policy from cluster:",
                parseError,
                rawPolicy,
              );
              return null;
            }
          })
          .filter(Boolean); // Remove any null entries from failed parsing

        if (parsedPolicies.length > 0) {
          console.log(
            "Successfully parsed policies from cluster:",
            parsedPolicies,
          );
          onPoliciesLoaded(parsedPolicies);
        } else {
          setError(
            "No valid network policies could be parsed from the cluster",
          );
        }
      } else {
        setError(
          "No network policies found in the cluster" +
            (namespace ? ` for namespace ${namespace}` : ""),
        );
      }
    } catch (err) {
      console.error("Error loading policies from cluster:", err);
      setError(`Error loading policies: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2 items-center">
          <input
            type="text"
            placeholder="Namespace (optional)"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className={`border p-2 rounded flex-grow text-sm ${
              theme === "dark" ? "cyberpunk-input" : "bg-white"
            }`}
          />
          <button
            onClick={loadFromCluster}
            disabled={loading}
            className={`${
              theme === "dark"
                ? "cyberpunk-button"
                : "bg-green-500 text-white hover:bg-green-600"
            } p-2 rounded transition-colors flex-shrink-0`}
          >
            {loading
              ? "Loading..."
              : namespace
                ? `Load from ${namespace}`
                : "Load from Cluster"}
          </button>
        </div>

        {error && (
          <div
            className={`${
              theme === "dark"
                ? "bg-red-900 border-red-700 text-red-200"
                : "bg-red-100 border-red-400 text-red-700"
            } border p-2 rounded mt-2 text-sm`}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClusterIntegration;
