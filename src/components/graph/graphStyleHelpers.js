/**
 * Extracts namespace name from selector for tooltip display
 * This function handles both matchLabels and matchExpressions
 */
const extractNamespaceForTooltip = (namespaceSelector) => {
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
    Array.isArray(namespaceSelector.matchExpressions) &&
    namespaceSelector.matchExpressions.length > 0
  ) {
    // First, look specifically for kubernetes.io/metadata.name with In operator
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
 * Generates a path for a link between nodes
 * @param {Object} link - The link data with source and target nodes
 * @param {String} visualizationType - 'enhanced' or 'classic'
 * @returns {String} - SVG path command
 */
export const createLinkPath = (link, visualizationType) => {
  // Safely access source and target coordinates
  // Defensive coding to prevent NaN errors
  const d = link;

  // Make sure source and target objects exist
  if (!d.source || !d.target) {
    console.error("Invalid link: missing source or target", d);
    return "M0,0 L0,0"; // Return dummy path to avoid rendering errors
  }

  // Make sure coordinates exist and are valid numbers
  const sourceX = typeof d.source.x === "number" ? d.source.x : 0;
  const sourceY = typeof d.source.y === "number" ? d.source.y : 0;
  const targetX = typeof d.target.x === "number" ? d.target.x : 0;
  const targetY = typeof d.target.y === "number" ? d.target.y : 0;

  // Check for NaN values which can cause rendering errors
  if (isNaN(sourceX) || isNaN(sourceY) || isNaN(targetX) || isNaN(targetY)) {
    console.error("Invalid coordinates in link path", {
      link: d,
      coords: { sourceX, sourceY, targetX, targetY },
    });
    return "M0,0 L0,0"; // Return dummy path to avoid rendering errors
  }

  if (visualizationType === "enhanced") {
    // Curved paths for enhanced view
    // Direct distance between nodes
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const dr = Math.sqrt(dx * dx + dy * dy);

    // If distance is too small, just draw a straight line
    if (dr < 1) {
      return `M${sourceX},${sourceY} L${targetX},${targetY}`;
    }

    // Make the curve larger for cross-policy links and when nodes are closer
    const curve = d.crossPolicy ? dr * 0.7 : dr * 0.3;

    // For very close nodes, increase the curve more
    const curveFactor = Math.max(0.3, Math.min(1, dr / 150));
    const curveHeight = curve * curveFactor;

    // Calculate the midpoint
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    // Calculate the perpendicular offset for the control point
    const perpX = (-dy / dr) * curveHeight;
    const perpY = (dx / dr) * curveHeight;

    // Control point is perpendicular to the line between nodes
    const controlX = midX + perpX;
    const controlY = midY + perpY;

    // Final check for NaN in calculated values
    if (isNaN(controlX) || isNaN(controlY)) {
      console.error("Invalid control point in curved path", {
        link: d,
        calculated: { midX, midY, perpX, perpY, controlX, controlY },
      });
      return `M${sourceX},${sourceY} L${targetX},${targetY}`;
    }

    return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
  } else {
    // Straight lines for classic view
    return `M${sourceX},${sourceY} L${targetX},${targetY}`;
  }
};

/**
 * Gets color for a link based on its properties and theme
 * @param {Object} link - The link data
 * @param {String} theme - Current theme ('light' or 'dark')
 * @returns {String} - CSS color
 */
export const getLinkColor = (link, theme = "light") => {
  if (theme === "dark") {
    if (link.crossPolicy) {
      return link.direction === "ingress" ? "#e11d48" : "#059669"; // Red and green for dark theme
    }
    if (link.direction === "ingress") return "#f43f5e"; // Lighter red for dark theme
    if (link.direction === "egress") return "#10b981"; // Lighter green for dark theme
    return "#64748b"; // Gray for dark theme
  } else {
    // Original light theme colors
    if (link.crossPolicy) {
      return link.direction === "ingress" ? "#ff3366" : "#33ff66";
    }
    if (link.direction === "ingress") return "#ff6666";
    if (link.direction === "egress") return "#66ff66";
    return "#aaaaaa";
  }
};

/**
 * Gets stroke opacity for a link
 * @param {Object} link - The link data
 * @param {Boolean} isHighlighted - Whether the link is highlighted
 * @returns {Number} - Opacity value (0-1)
 */
export const getLinkOpacity = (link, isHighlighted = false) => {
  if (isHighlighted) {
    return 1;
  }
  return link.crossPolicy ? 0.7 : 0.5;
};

/**
 * Gets stroke width for a link
 * @param {Object} link - The link data
 * @param {Boolean} isHighlighted - Whether the link is highlighted
 * @returns {Number} - Width in pixels
 */
export const getLinkWidth = (link, isHighlighted = false) => {
  if (isHighlighted) {
    return link.crossPolicy ? 4 : 3;
  }
  return link.crossPolicy ? 2 : 1.5;
};

/**
 * Gets node stroke color based on its properties and theme
 * @param {Object} node - The node data
 * @param {String} theme - Current theme ('light' or 'dark')
 * @returns {String} - CSS color
 */
export const getNodeStrokeColor = (node, theme = "light") => {
  const isMultiPolicy = node.policies && node.policies.length > 1;

  if (theme === "dark") {
    return isMultiPolicy ? "#f59e0b" : "#4b5563"; // Amber for multi-policy, gray for normal
  } else {
    return isMultiPolicy ? "#ff9900" : "#666666"; // Original colors
  }
};

/**
 * Prepares tooltip content for a node with improved namespace extraction and theme support
 * @param {Object} node - The node data
 * @param {String} theme - Current theme ('light' or 'dark')
 * @returns {String} - HTML content for tooltip
 */
export const getNodeTooltipContent = (node, theme = "light") => {
  const textColor = theme === "dark" ? "#e2f3f5" : "#333333";
  const labelColor = theme === "dark" ? "#06b6d4" : "#666666";
  const sectionBgColor = theme === "dark" ? "#1e293b" : "#f3f4f6";
  const borderColor = theme === "dark" ? "#1e40af" : "#e5e7eb";

  let tooltipContent = `<div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; border-bottom: 1px solid ${borderColor}; padding-bottom: 5px; color: ${theme === "dark" ? "#06b6d4" : "#2563eb"};">${node.label}</div>`;

  // Add node type
  tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600; color: ${labelColor};">Type:</span> <span style="color: ${textColor};">${node.type}</span></div>`;

  // Add namespace for pod nodes
  if (node.type === "pod" && node.details && node.details.namespace) {
    tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600; color: ${labelColor};">Namespace:</span> <span style="color: ${textColor};">${node.details.namespace}</span></div>`;
  }

  // Add selector details
  if (node.type === "pod" && node.details && node.details.podSelector) {
    let selectorText = "";

    if (node.details.podSelector.matchLabels) {
      selectorText += `<div style="margin-left: 10px; margin-bottom: 5px; background-color: ${sectionBgColor}; padding: 4px; border-radius: 3px;"><span style="text-decoration: underline; color: ${labelColor};">Match Labels:</span><br/>`;
      selectorText += Object.entries(node.details.podSelector.matchLabels)
        .map(
          ([key, value]) =>
            `<div style="margin-left: 15px; color: ${textColor};">${key}: ${value}</div>`,
        )
        .join("");
      selectorText += `</div>`;
    }

    if (node.details.podSelector.matchExpressions) {
      selectorText += `<div style="margin-left: 10px; background-color: ${sectionBgColor}; padding: 4px; border-radius: 3px;"><span style="text-decoration: underline; color: ${labelColor};">Match Expressions:</span><br/>`;
      selectorText += node.details.podSelector.matchExpressions
        .map(
          (expr) =>
            `<div style="margin-left: 15px; color: ${textColor};">${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]</div>`,
        )
        .join("");
      selectorText += `</div>`;
    }

    if (selectorText) {
      tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600; color: ${labelColor};">Selector:</span><br/>${selectorText}</div>`;
    }
  }

  // Add CIDR for IP blocks
  if (node.type === "ipBlock" && node.details) {
    tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600; color: ${labelColor};">CIDR:</span> <span style="color: ${textColor};">${node.details.cidr || "Unknown"}</span></div>`;

    if (node.details.except && node.details.except.length > 0) {
      tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600; color: ${labelColor};">Except:</span> <span style="color: ${textColor};">${node.details.except.join(", ")}</span></div>`;
    }
  }

  // Improved combined selector info
  if (node.type === "combined") {
    tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600; color: ${theme === "dark" ? "#8b5cf6" : "#9333ea"};">Combined Namespace+Pod Selector</span></div>`;

    // Extract namespace information with improved method
    let extractedNamespace = null;
    if (node.details && node.details.namespace) {
      extractedNamespace = extractNamespaceForTooltip(node.details.namespace);

      if (extractedNamespace) {
        tooltipContent += `<div style="margin-bottom: 5px;"><span style="font-weight: 600; color: ${labelColor};">Namespace:</span> <span style="color: ${textColor};">${extractedNamespace}</span></div>`;
      }

      // Show namespace selector details
      tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600; color: ${labelColor};">Namespace Selector:</span><br/>`;
      if (node.details.namespace.matchLabels) {
        tooltipContent += `<div style="margin-left: 10px; margin-bottom: 5px; background-color: ${sectionBgColor}; padding: 4px; border-radius: 3px;"><span style="text-decoration: underline; color: ${labelColor};">Match Labels:</span><br/>`;
        tooltipContent += Object.entries(node.details.namespace.matchLabels)
          .map(
            ([key, value]) =>
              `<div style="margin-left: 15px; color: ${textColor};">${key}: ${value}</div>`,
          )
          .join("");
        tooltipContent += `</div>`;
      }

      if (node.details.namespace.matchExpressions) {
        tooltipContent += `<div style="margin-left: 10px; background-color: ${sectionBgColor}; padding: 4px; border-radius: 3px;"><span style="text-decoration: underline; color: ${labelColor};">Match Expressions:</span><br/>`;
        tooltipContent += node.details.namespace.matchExpressions
          .map(
            (expr) =>
              `<div style="margin-left: 15px; color: ${textColor};">${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]</div>`,
          )
          .join("");
        tooltipContent += `</div>`;
      }
      tooltipContent += `</div>`;
    }

    // Show pod selector details
    if (node.details && node.details.pod) {
      tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600; color: ${labelColor};">Pod Selector:</span><br/>`;
      if (node.details.pod.matchLabels) {
        tooltipContent += `<div style="margin-left: 10px; margin-bottom: 5px; background-color: ${sectionBgColor}; padding: 4px; border-radius: 3px;"><span style="text-decoration: underline; color: ${labelColor};">Match Labels:</span><br/>`;
        tooltipContent += Object.entries(node.details.pod.matchLabels)
          .map(
            ([key, value]) =>
              `<div style="margin-left: 15px; color: ${textColor};">${key}: ${value}</div>`,
          )
          .join("");
        tooltipContent += `</div>`;
      }

      if (node.details.pod.matchExpressions) {
        tooltipContent += `<div style="margin-left: 10px; background-color: ${sectionBgColor}; padding: 4px; border-radius: 3px;"><span style="text-decoration: underline; color: ${labelColor};">Match Expressions:</span><br/>`;
        tooltipContent += node.details.pod.matchExpressions
          .map(
            (expr) =>
              `<div style="margin-left: 15px; color: ${textColor};">${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]</div>`,
          )
          .join("");
        tooltipContent += `</div>`;
      }
      tooltipContent += `</div>`;
    }
  }

  // Add policies that reference this node
  if (node.policies && node.policies.length > 0) {
    tooltipContent += `<div style="margin-top: 10px; border-top: 1px solid ${borderColor}; padding-top: 5px;">
      <span style="font-weight: 600; color: ${labelColor};">Referenced by policies:</span><br/>
      ${node.policies.map((p) => `<div style="margin-left: 10px; color: ${textColor};">• ${p}</div>`).join("")}
    </div>`;
  }

  return tooltipContent;
};

/**
 * Prepares tooltip content for a link, supporting multiple ports per policy
 * @param {Object} link - The link data
 * @param {Function} getPortsText - Function to format ports
 * @param {String} theme - Current theme ('light' or 'dark')
 * @returns {String} - HTML content for tooltip
 */
export const getLinkTooltipContent = (link, getPortsText, theme = "light") => {
  const textColor = theme === "dark" ? "#e2f3f5" : "#333333";
  const labelColor = theme === "dark" ? "#06b6d4" : "#666666";
  const borderColor = theme === "dark" ? "#1e40af" : "#e5e7eb";
  const sectionBgColor = theme === "dark" ? "#1e293b" : "#f3f4f6";

  let tooltipContent = `<div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; border-bottom: 1px solid ${borderColor}; padding-bottom: 5px; color: ${theme === "dark" ? "#06b6d4" : "#2563eb"};">
    ${link.policy}
  </div>`;

  // Direction with theme-specific colors
  const directionColor =
    link.direction === "ingress"
      ? theme === "dark"
        ? "#f43f5e"
        : "#ff3366"
      : theme === "dark"
        ? "#10b981"
        : "#33cc66";

  tooltipContent += `<div style="margin-bottom: 8px;">
    <span style="font-weight: 600; color: ${labelColor};">Direction:</span> 
    <span style="color: ${directionColor}; font-weight: 500;">
      ${link.direction.charAt(0).toUpperCase() + link.direction.slice(1)}
    </span>
  </div>`;

  // Handle different ports per policy
  if (link.detailedPorts && link.portDetails) {
    tooltipContent += `<div style="margin-bottom: 8px;">
      <span style="font-weight: 600; color: ${labelColor};">Ports by Policy:</span>
      <div style="margin-left: 10px; margin-top: 5px; background-color: ${sectionBgColor}; padding: 4px; border-radius: 3px;">
        ${link.portDetails
          .split("\n")
          .map(
            (line) =>
              `<div style="margin-bottom: 3px; color: ${textColor};">• ${line}</div>`,
          )
          .join("")}
      </div>
    </div>`;
  } else {
    // Format ports for better display (single port set)
    const ports = getPortsText(link.ports);
    tooltipContent += `<div style="margin-bottom: 8px;">
      <span style="font-weight: 600; color: ${labelColor};">Ports:</span> <span style="color: ${textColor};">${ports}</span>
    </div>`;
  }

  if (link.crossPolicy) {
    tooltipContent += `<div style="margin-top: 8px; color: ${theme === "dark" ? "#f59e0b" : "#ff9900"}; font-weight: 600; text-align: center; padding: 2px; background-color: ${theme === "dark" ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 153, 0, 0.1)"}; border-radius: 3px;">
      Cross-Policy Connection
    </div>`;
  }

  if (link.combinedSelector) {
    tooltipContent += `<div style="margin-top: 8px; color: ${theme === "dark" ? "#8b5cf6" : "#9966cc"}; font-weight: 600; text-align: center; padding: 2px; background-color: ${theme === "dark" ? "rgba(139, 92, 246, 0.1)" : "rgba(153, 102, 204, 0.1)"}; border-radius: 3px;">
      Combined namespace+pod selector
    </div>`;
  }

  return tooltipContent;
};
