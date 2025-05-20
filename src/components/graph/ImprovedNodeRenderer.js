// src/components/graph/ImprovedNodeRenderer.js with fixed namespace extraction

import React from "react";

/**
 * Helper function to extract namespace name from selector
 * @param {Object} namespaceSelector - The namespace selector object
 * @returns {String|null} - Extracted namespace name or null if not found
 */
const extractNamespaceFromSelector = (namespaceSelector) => {
  if (!namespaceSelector) return null;

  // Try to extract from matchLabels
  if (namespaceSelector.matchLabels) {
    // Look for common namespace label keys
    const namespaceKeys = [
      "kubernetes.io/metadata.name",
      "name",
      "k8s-app",
      "app.kubernetes.io/name",
      "app",
    ];

    for (const key of namespaceKeys) {
      if (namespaceSelector.matchLabels[key]) {
        return namespaceSelector.matchLabels[key];
      }
    }
  }

  // Try to extract from matchExpressions
  if (
    namespaceSelector.matchExpressions &&
    namespaceSelector.matchExpressions.length > 0
  ) {
    // Look specifically for kubernetes.io/metadata.name with In operator
    const metadataExpr = namespaceSelector.matchExpressions.find(
      (expr) =>
        expr.key === "kubernetes.io/metadata.name" &&
        expr.operator === "In" &&
        Array.isArray(expr.values) &&
        expr.values.length > 0,
    );

    if (metadataExpr) {
      return metadataExpr.values[0];
    }

    // If not found, try any expressions with 'In' operator and a name-related key
    const namespaceExpr = namespaceSelector.matchExpressions.find(
      (expr) =>
        (expr.key.includes("name") || expr.key.includes("app")) &&
        expr.operator === "In" &&
        Array.isArray(expr.values) &&
        expr.values.length > 0,
    );

    if (namespaceExpr) {
      return namespaceExpr.values[0];
    }
  }

  return null;
};

/**
 * Helper function to extract a label for pod selectors
 * @param {Object} podSelector - The pod selector object
 * @returns {String} - Extracted label or default text
 */
const extractPodLabel = (podSelector) => {
  if (!podSelector) return "Pod";

  if (podSelector.matchLabels) {
    // Try common label keys
    const labelKeys = [
      "app",
      "app.kubernetes.io/name",
      "k8s-app",
      "name",
      "component",
    ];

    for (const key of labelKeys) {
      if (podSelector.matchLabels[key]) {
        return podSelector.matchLabels[key];
      }
    }

    // If no common keys found, use the first label
    const keys = Object.keys(podSelector.matchLabels);
    if (keys.length > 0) {
      return `${keys[0]}: ${podSelector.matchLabels[keys[0]]}`;
    }
  }

  return "Pod";
};

/**
 * Improved node renderer for D3 integration that creates a better visual structure with theme support
 *
 * @param {Object} node - The node data object
 * @param {D3Selection} container - The D3 selection for the node container
 * @param {Boolean} isMultiPolicy - Whether the node represents multiple policies
 * @param {String} theme - Current theme ('light' or 'dark')
 * @returns {void} - Renders the node directly using D3
 */
export const createImprovedNode = (
  node,
  container,
  isMultiPolicy,
  theme = "light",
) => {
  // Create group for the node
  const nodeG = container;

  // Calculate node dimensions based on label
  const labelWidth = Math.min(Math.max(node.label.length * 7, 80), 150); // Adaptive width based on label length
  const boxWidth = labelWidth + 20; // Add padding
  const boxHeight = 40; // Fixed height

  // Create border box for the entire node
  nodeG
    .append("rect")
    .attr("width", boxWidth)
    .attr("height", boxHeight)
    .attr("x", -boxWidth / 2)
    .attr("y", -boxHeight / 2)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", theme === "dark" ? "#1a2235" : "#ffffff")
    .attr(
      "stroke",
      isMultiPolicy
        ? theme === "dark"
          ? "#f59e0b"
          : "#ff9900"
        : theme === "dark"
          ? "#4b5563"
          : "#666666",
    )
    .attr("stroke-width", isMultiPolicy ? 2 : 1)
    .attr("stroke-opacity", 0.8)
    .attr("fill-opacity", theme === "dark" ? 0.8 : 0.9);

  // Determine icon type and color based on node type
  let iconType = "circle";
  let iconColor = theme === "dark" ? "var(--node-pod)" : "#66aaff"; // Default pod color
  let extractedNamespace = null;

  if (node.type === "pod") {
    iconType = "circle";
    iconColor = theme === "dark" ? "var(--node-pod)" : "#66aaff";
    if (node.details && node.details.namespace) {
      extractedNamespace = node.details.namespace;
    }
  } else if (node.type === "namespace") {
    iconType = "rect";
    iconColor = theme === "dark" ? "var(--node-namespace)" : "#44cc44";
  } else if (node.type === "ipBlock") {
    iconType = "triangle";
    iconColor = theme === "dark" ? "var(--node-ipblock)" : "#ffaa44";
  } else if (node.type === "combined") {
    iconType = "circle";
    iconColor = theme === "dark" ? "var(--node-combined)" : "#9966cc";

    // Extract namespace if available
    if (node.details && node.details.namespace) {
      extractedNamespace = extractNamespaceFromSelector(node.details.namespace);
    }
  } else if (node.type === "anywhere") {
    iconType = "circle";
    iconColor = theme === "dark" ? "#374151" : "#dddddd";
  }

  // Add appropriate icon
  if (iconType === "circle") {
    nodeG
      .append("circle")
      .attr("r", 10)
      .attr("cx", 0)
      .attr("cy", -10)
      .attr("fill", iconColor)
      .attr("stroke", theme === "dark" ? "#111827" : "#333333")
      .attr("stroke-width", 1);
  } else if (iconType === "rect") {
    nodeG
      .append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("x", -9)
      .attr("y", -19)
      .attr("fill", iconColor)
      .attr("stroke", theme === "dark" ? "#111827" : "#333333")
      .attr("stroke-width", 1);
  } else if (iconType === "triangle") {
    nodeG
      .append("polygon")
      .attr("points", "0,-20 10,-5 -10,-5")
      .attr("fill", iconColor)
      .attr("stroke", theme === "dark" ? "#111827" : "#333333")
      .attr("stroke-width", 1);
  } else if (iconType === "diamond") {
    nodeG
      .append("polygon")
      .attr("points", "0,-20 10,-10 0,0 -10,-10")
      .attr("fill", iconColor)
      .attr("stroke", theme === "dark" ? "#111827" : "#333333")
      .attr("stroke-width", 1);
  }

  // Add policy count badge for multi-policy nodes
  if (isMultiPolicy) {
    nodeG
      .append("circle")
      .attr("r", 7)
      .attr("cx", 10)
      .attr("cy", -15)
      .attr("fill", theme === "dark" ? "#f59e0b" : "#ff9900")
      .attr("stroke", theme === "dark" ? "#0f172a" : "#ffffff")
      .attr("stroke-width", 1);

    nodeG
      .append("text")
      .attr("x", 10)
      .attr("y", -12)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", theme === "dark" ? "#0f172a" : "#ffffff")
      .text(node.policies.length);
  }

  // Add node label
  nodeG
    .append("text")
    .attr("x", 0)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .attr("fill", theme === "dark" ? "#e2f3f5" : "#333333")
    .text(() => {
      // For combined nodes with pod selectors, show the pod labels
      if (node.type === "combined" && node.details && node.details.pod) {
        const podLabel = extractPodLabel(node.details.pod);
        const maxLength = 25;
        return podLabel.length > maxLength
          ? podLabel.substring(0, maxLength) + "..."
          : podLabel;
      }

      // Default labeling
      const maxLength = 25;
      return node.label.length > maxLength
        ? node.label.substring(0, maxLength) + "..."
        : node.label;
    });

  // Add namespace label for pod nodes or combined nodes with namespace info
  if (
    (node.type === "pod" || node.type === "combined") &&
    (extractedNamespace || (node.details && node.details.namespace))
  ) {
    nodeG
      .append("text")
      .attr("x", 0)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "8px")
      .attr("font-style", "italic")
      .attr("fill", theme === "dark" ? "#94a3b8" : "#666666")
      .text(
        `(${
          extractedNamespace ||
          (typeof node.details.namespace === "string"
            ? node.details.namespace
            : "namespace")
        })`,
      );
  }
};
