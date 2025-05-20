// src/components/PolicyDetails.js
import React from "react";

const PolicyDetails = ({ policy, onClose, theme = "light" }) => {
  if (!policy) return null;

  const formatLabels = (labels) => {
    if (!labels) return "None";
    return Object.entries(labels)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  };

  const formatExpressions = (expressions) => {
    if (!expressions) return "None";
    return expressions
      .map(
        (expr) =>
          `${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]`,
      )
      .join("\n");
  };

  const formatRule = (rule, direction) => {
    let result = "";

    if (direction === "ingress") {
      if (!rule.from || rule.from.length === 0) {
        result += "- From: Any Source\n";
      } else {
        rule.from.forEach((from, i) => {
          result += `- From (${i + 1}):\n`;
          if (from.podSelector) {
            result += `  Pod Selector:\n`;
            if (from.podSelector.matchLabels) {
              result += `    MatchLabels:\n`;
              result +=
                Object.entries(from.podSelector.matchLabels)
                  .map(([k, v]) => `      ${k}: ${v}`)
                  .join("\n") + "\n";
            }
            if (from.podSelector.matchExpressions) {
              result += `    MatchExpressions:\n`;
              result +=
                from.podSelector.matchExpressions
                  .map(
                    (expr) =>
                      `      ${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]`,
                  )
                  .join("\n") + "\n";
            }
          }
          if (from.namespaceSelector) {
            result += `  Namespace Selector:\n`;
            if (from.namespaceSelector.matchLabels) {
              result += `    MatchLabels:\n`;
              result +=
                Object.entries(from.namespaceSelector.matchLabels)
                  .map(([k, v]) => `      ${k}: ${v}`)
                  .join("\n") + "\n";
            }
            if (from.namespaceSelector.matchExpressions) {
              result += `    MatchExpressions:\n`;
              result +=
                from.namespaceSelector.matchExpressions
                  .map(
                    (expr) =>
                      `      ${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]`,
                  )
                  .join("\n") + "\n";
            }
          }
          if (from.ipBlock) {
            result += `  IP Block:\n`;
            result += `    CIDR: ${from.ipBlock.cidr}\n`;
            if (from.ipBlock.except && from.ipBlock.except.length > 0) {
              result += `    Except: ${from.ipBlock.except.join(", ")}\n`;
            }
          }
        });
      }
    } else {
      if (!rule.to || rule.to.length === 0) {
        result += "- To: Any Destination\n";
      } else {
        rule.to.forEach((to, i) => {
          result += `- To (${i + 1}):\n`;
          if (to.podSelector) {
            result += `  Pod Selector:\n`;
            if (to.podSelector.matchLabels) {
              result += `    MatchLabels:\n`;
              result +=
                Object.entries(to.podSelector.matchLabels)
                  .map(([k, v]) => `      ${k}: ${v}`)
                  .join("\n") + "\n";
            }
            if (to.podSelector.matchExpressions) {
              result += `    MatchExpressions:\n`;
              result +=
                to.podSelector.matchExpressions
                  .map(
                    (expr) =>
                      `      ${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]`,
                  )
                  .join("\n") + "\n";
            }
          }
          if (to.namespaceSelector) {
            result += `  Namespace Selector:\n`;
            if (to.namespaceSelector.matchLabels) {
              result += `    MatchLabels:\n`;
              result +=
                Object.entries(to.namespaceSelector.matchLabels)
                  .map(([k, v]) => `      ${k}: ${v}`)
                  .join("\n") + "\n";
            }
            if (to.namespaceSelector.matchExpressions) {
              result += `    MatchExpressions:\n`;
              result +=
                to.namespaceSelector.matchExpressions
                  .map(
                    (expr) =>
                      `      ${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]`,
                  )
                  .join("\n") + "\n";
            }
          }
          if (to.ipBlock) {
            result += `  IP Block:\n`;
            result += `    CIDR: ${to.ipBlock.cidr}\n`;
            if (to.ipBlock.except && to.ipBlock.except.length > 0) {
              result += `    Except: ${to.ipBlock.except.join(", ")}\n`;
            }
          }
        });
      }
    }

    if (rule.ports && rule.ports.length > 0) {
      result += "- Ports:\n";
      rule.ports.forEach((port) => {
        if (typeof port === "object") {
          let portText = "";
          if (port.port !== undefined) portText += `    Port: ${port.port}\n`;
          if (port.endPort !== undefined)
            portText += `    EndPort: ${port.endPort}\n`;
          if (port.protocol !== undefined)
            portText += `    Protocol: ${port.protocol}\n`;
          result += portText;
        } else {
          result += `    ${JSON.stringify(port)}\n`;
        }
      });
    } else {
      result += "- Ports: All Ports\n";
    }

    return result;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${
          theme === "dark"
            ? "bg-gray-900 border border-cyan-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            : "bg-white"
        } rounded-lg shadow-lg w-full max-w-4xl max-h-screen overflow-auto`}
      >
        <div
          className={`${
            theme === "dark"
              ? "cyberpunk-header text-white"
              : "bg-blue-600 text-white"
          } px-4 py-2 flex justify-between items-center`}
        >
          <h3 className="text-lg font-semibold">
            Policy Details: {policy.name}
          </h3>
          <button className="text-white hover:text-gray-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <h4
              className={`font-semibold ${
                theme === "dark" ? "text-cyan-400" : ""
              }`}
            >
              Metadata
            </h4>
            <div
              className={`${
                theme === "dark"
                  ? "bg-gray-800 border border-gray-700"
                  : "bg-gray-100"
              } p-2 rounded font-mono text-sm whitespace-pre-wrap ${
                theme === "dark" ? "text-gray-300" : ""
              }`}
            >
              Name: {policy.name}
              Namespace: {policy.namespace}
              Types: {policy.policyTypes?.join(", ") || "None"}
            </div>
          </div>

          <div className="mb-4">
            <h4
              className={`font-semibold ${
                theme === "dark" ? "text-cyan-400" : ""
              }`}
            >
              Pod Selector
            </h4>
            <div
              className={`${
                theme === "dark"
                  ? "bg-gray-800 border border-gray-700"
                  : "bg-gray-100"
              } p-2 rounded font-mono text-sm whitespace-pre-wrap ${
                theme === "dark" ? "text-gray-300" : ""
              }`}
            >
              {policy.podSelector?.matchLabels ? (
                <div>
                  <div>matchLabels:</div>
                  <div className="ml-4">
                    {formatLabels(policy.podSelector.matchLabels)}
                  </div>
                </div>
              ) : (
                "No matchLabels"
              )}

              {policy.podSelector?.matchExpressions ? (
                <div>
                  <div>matchExpressions:</div>
                  <div className="ml-4">
                    {formatExpressions(policy.podSelector.matchExpressions)}
                  </div>
                </div>
              ) : (
                "No matchExpressions"
              )}
            </div>
          </div>

          {policy.ingress && policy.ingress.length > 0 && (
            <div className="mb-4">
              <h4
                className={`font-semibold ${
                  theme === "dark" ? "text-cyan-400" : ""
                }`}
              >
                Ingress Rules
              </h4>
              <div
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-gray-100"
                } p-2 rounded font-mono text-sm whitespace-pre-wrap ${
                  theme === "dark" ? "text-gray-300" : ""
                }`}
              >
                {policy.ingress.map((rule, i) => (
                  <div key={`ingress-${i}`} className="mb-2">
                    <div
                      className={`font-semibold ${
                        theme === "dark" ? "text-cyan-300" : ""
                      }`}
                    >
                      Rule {i + 1}:
                    </div>
                    <div className="ml-2">{formatRule(rule, "ingress")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {policy.egress && policy.egress.length > 0 && (
            <div className="mb-4">
              <h4
                className={`font-semibold ${
                  theme === "dark" ? "text-cyan-400" : ""
                }`}
              >
                Egress Rules
              </h4>
              <div
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-gray-100"
                } p-2 rounded font-mono text-sm whitespace-pre-wrap ${
                  theme === "dark" ? "text-gray-300" : ""
                }`}
              >
                {policy.egress.map((rule, i) => (
                  <div key={`egress-${i}`} className="mb-2">
                    <div
                      className={`font-semibold ${
                        theme === "dark" ? "text-cyan-300" : ""
                      }`}
                    >
                      Rule {i + 1}:
                    </div>
                    <div className="ml-2">{formatRule(rule, "egress")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolicyDetails;
