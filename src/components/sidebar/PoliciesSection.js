import React from "react";

/**
 * Policies section component that displays the list of policies
 */
const PoliciesSection = ({
  localFilteredPolicies,
  totalPolicies,
  sortPolicies,
  setSortPolicies,
  setShowPolicyDetails,
  theme = "light",
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <h2 className="text-lg font-semibold">
          Policies ({localFilteredPolicies.length})
        </h2>
        <div className="flex items-center space-x-2">
          <button
            className={`text-xs px-2 py-0.5 rounded ${
              sortPolicies
                ? theme === "dark"
                  ? "bg-cyan-600 text-white"
                  : "bg-blue-500 text-white"
                : theme === "dark"
                  ? "bg-gray-800 text-gray-300"
                  : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setSortPolicies(!sortPolicies)}
            title={sortPolicies ? "Sorted alphabetically" : "Original order"}
          >
            {sortPolicies ? "Sorted" : "Unsorted"}
          </button>
        </div>
      </div>

      {localFilteredPolicies.length === 0 ? (
        <p
          className={`text-sm ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {totalPolicies === 0
            ? "No policies loaded"
            : "No policies match your filters"}
        </p>
      ) : (
        <div
          className={`flex-1 overflow-auto border rounded ${
            theme === "dark" ? "bg-gray-900 border-cyan-900" : "bg-white"
          }`}
          style={{ minHeight: 0 }}
        >
          <ul
            className={`divide-y ${
              theme === "dark" ? "divide-gray-800" : "divide-gray-200"
            }`}
          >
            {/* Apply sorting conditionally */}
            {(sortPolicies
              ? [...localFilteredPolicies].sort((a, b) =>
                  a.name.localeCompare(b.name),
                )
              : localFilteredPolicies
            ).map((policy, index) => (
              <li
                key={index}
                className={`p-2 ${
                  theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-medium text-sm truncate ${
                        theme === "dark" ? "text-gray-200" : ""
                      }`}
                      title={policy.name}
                    >
                      {policy.name}
                    </div>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      } truncate`}
                    >
                      {policy.namespace}
                    </div>
                  </div>
                  <button
                    className={`${
                      theme === "dark"
                        ? "text-cyan-400 hover:text-cyan-300 bg-gray-800 hover:bg-gray-700"
                        : "text-blue-500 hover:text-blue-700 bg-blue-50"
                    } text-xs px-2 py-1 rounded flex-shrink-0 ml-2`}
                    onClick={() => setShowPolicyDetails(policy)}
                  >
                    Details
                  </button>
                </div>
                <div
                  className={`text-xs ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {policy.policyTypes && policy.policyTypes.join(", ")}
                </div>
                {policy.podSelectorLabels && (
                  <div
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    } truncate`}
                    title={policy.podSelectorLabels}
                  >
                    Labels: {policy.podSelectorLabels}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PoliciesSection;
