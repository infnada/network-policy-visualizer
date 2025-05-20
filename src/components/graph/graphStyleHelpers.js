// src/components/graph/graphStyleHelpers.js
// Helper functions for styling graph elements

/**
 * Generates a path for a link between nodes
 * @param {Object} link - The link data with source and target nodes
 * @param {String} visualizationType - 'enhanced' or 'classic'
 * @returns {String} - SVG path command
 */
export const createLinkPath = (link, visualizationType) => {
  const d = link;
  if (visualizationType === "enhanced") {
    // Curved paths for enhanced view
    const sourceX = d.source.x;
    const sourceY = d.source.y;
    const targetX = d.target.x;
    const targetY = d.target.y;

    // Direct distance between nodes
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const dr = Math.sqrt(dx * dx + dy * dy);

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

    return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
  } else {
    // Straight lines for classic view
    return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
  }
};

/**
 * Gets color for a link based on its properties
 * @param {Object} link - The link data
 * @returns {String} - CSS color
 */
export const getLinkColor = (link) => {
  if (link.crossPolicy) {
    return link.direction === "ingress" ? "#ff3366" : "#33ff66";
  }
  if (link.direction === "ingress") return "#ff6666";
  if (link.direction === "egress") return "#66ff66";
  return "#aaaaaa";
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
 * Gets node stroke color based on its properties
 * @param {Object} node - The node data
 * @returns {String} - CSS color
 */
export const getNodeStrokeColor = (node) => {
  const isMultiPolicy = node.policies && node.policies.length > 1;
  return isMultiPolicy ? "#ff9900" : "#fff";
};

/**
 * Prepares tooltip content for a node
 * @param {Object} node - The node data
 * @returns {String} - HTML content for tooltip
 */
export const getNodeTooltipContent = (node) => {
  let tooltipContent = `<div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">${node.label}</div>`;

  // Add node type
  tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600;">Type:</span> ${node.type}</div>`;

  // Add namespace for pod nodes
  if (node.type === "pod" && node.details && node.details.namespace) {
    tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600;">Namespace:</span> ${node.details.namespace}</div>`;
  }

  // Add selector details
  if (node.type === "pod" && node.details && node.details.podSelector) {
    let selectorText = "";

    if (node.details.podSelector.matchLabels) {
      selectorText += `<div style="margin-left: 10px; margin-bottom: 5px;"><u>Match Labels:</u><br/>`;
      selectorText += Object.entries(node.details.podSelector.matchLabels)
        .map(
          ([key, value]) =>
            `<div style="margin-left: 15px;">${key}: ${value}</div>`,
        )
        .join("");
      selectorText += `</div>`;
    }

    if (node.details.podSelector.matchExpressions) {
      selectorText += `<div style="margin-left: 10px;"><u>Match Expressions:</u><br/>`;
      selectorText += node.details.podSelector.matchExpressions
        .map(
          (expr) =>
            `<div style="margin-left: 15px;">${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]</div>`,
        )
        .join("");
      selectorText += `</div>`;
    }

    if (selectorText) {
      tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600;">Selector:</span><br/>${selectorText}</div>`;
    }
  }

  // Add CIDR for IP blocks
  if (node.type === "ipBlock" && node.details) {
    tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600;">CIDR:</span> ${node.details.cidr || "Unknown"}</div>`;

    if (node.details.except && node.details.except.length > 0) {
      tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600;">Except:</span> ${node.details.except.join(", ")}</div>`;
    }
  }

  // Add combined selector info
  if (node.type === "combined") {
    tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600;">Combined Namespace+Pod Selector</span></div>`;

    // Extract namespace information
    let extractedNamespace = null;
    if (node.details && node.details.namespace) {
      if (node.details.namespace.matchLabels) {
        const namespaceLabels = node.details.namespace.matchLabels;
        // Try to find the namespace name from labels
        const nameKey = Object.keys(namespaceLabels).find(
          (key) =>
            key.includes("name") || key.includes("kubernetes.io/metadata.name"),
        );

        if (nameKey) {
          extractedNamespace = namespaceLabels[nameKey];
          tooltipContent += `<div style="margin-bottom: 5px;"><span style="font-weight: 600;">Namespace:</span> ${extractedNamespace}</div>`;
        }
      } else if (node.details.namespace.matchExpressions) {
        // Try to extract namespace from matchExpressions
        const namespaceExpr = node.details.namespace.matchExpressions.find(
          (expr) =>
            expr.key.includes("name") &&
            expr.operator === "In" &&
            expr.values &&
            expr.values.length > 0,
        );

        if (namespaceExpr) {
          extractedNamespace = namespaceExpr.values[0];
          tooltipContent += `<div style="margin-bottom: 5px;"><span style="font-weight: 600;">Namespace:</span> ${extractedNamespace}</div>`;
        }
      }

      // Show namespace selector details
      tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600;">Namespace Selector:</span><br/>`;
      if (node.details.namespace.matchLabels) {
        tooltipContent += `<div style="margin-left: 10px; margin-bottom: 5px;"><u>Match Labels:</u><br/>`;
        tooltipContent += Object.entries(node.details.namespace.matchLabels)
          .map(
            ([key, value]) =>
              `<div style="margin-left: 15px;">${key}: ${value}</div>`,
          )
          .join("");
        tooltipContent += `</div>`;
      }

      if (node.details.namespace.matchExpressions) {
        tooltipContent += `<div style="margin-left: 10px;"><u>Match Expressions:</u><br/>`;
        tooltipContent += node.details.namespace.matchExpressions
          .map(
            (expr) =>
              `<div style="margin-left: 15px;">${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]</div>`,
          )
          .join("");
        tooltipContent += `</div>`;
      }
      tooltipContent += `</div>`;
    }

    // Show pod selector details
    if (node.details && node.details.pod) {
      tooltipContent += `<div style="margin-bottom: 8px;"><span style="font-weight: 600;">Pod Selector:</span><br/>`;
      if (node.details.pod.matchLabels) {
        tooltipContent += `<div style="margin-left: 10px; margin-bottom: 5px;"><u>Match Labels:</u><br/>`;
        tooltipContent += Object.entries(node.details.pod.matchLabels)
          .map(
            ([key, value]) =>
              `<div style="margin-left: 15px;">${key}: ${value}</div>`,
          )
          .join("");
        tooltipContent += `</div>`;
      }

      if (node.details.pod.matchExpressions) {
        tooltipContent += `<div style="margin-left: 10px;"><u>Match Expressions:</u><br/>`;
        tooltipContent += node.details.pod.matchExpressions
          .map(
            (expr) =>
              `<div style="margin-left: 15px;">${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]</div>`,
          )
          .join("");
        tooltipContent += `</div>`;
      }
      tooltipContent += `</div>`;
    }
  }

  // Add policies that reference this node
  if (node.policies && node.policies.length > 0) {
    tooltipContent += `<div style="margin-top: 10px; border-top: 1px solid #ccc; padding-top: 5px;">
      <span style="font-weight: 600;">Referenced by policies:</span><br/>
      ${node.policies.map((p) => `<div style="margin-left: 10px;">• ${p}</div>`).join("")}
    </div>`;
  }

  return tooltipContent;
};

/**
 * Prepares tooltip content for a link, supporting multiple ports per policy
 * @param {Object} link - The link data
 * @param {Function} getPortsText - Function to format ports
 * @returns {String} - HTML content for tooltip
 */
export const getLinkTooltipContent = (link, getPortsText) => {
  let tooltipContent = `<div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
    ${link.policy}
  </div>`;

  tooltipContent += `<div style="margin-bottom: 8px;">
    <span style="font-weight: 600;">Direction:</span> 
    <span style="color: ${link.direction === "ingress" ? "#ff3366" : "#33cc66"};">
      ${link.direction.charAt(0).toUpperCase() + link.direction.slice(1)}
    </span>
  </div>`;

  // Handle different ports per policy
  if (link.detailedPorts && link.portDetails) {
    tooltipContent += `<div style="margin-bottom: 8px;">
      <span style="font-weight: 600;">Ports by Policy:</span>
      <div style="margin-left: 10px; margin-top: 5px;">
        ${link.portDetails
          .split("\n")
          .map((line) => `<div style="margin-bottom: 3px;">• ${line}</div>`)
          .join("")}
      </div>
    </div>`;
  } else {
    // Format ports for better display (single port set)
    const ports = getPortsText(link.ports);
    tooltipContent += `<div style="margin-bottom: 8px;">
      <span style="font-weight: 600;">Ports:</span> ${ports}
    </div>`;
  }

  if (link.crossPolicy) {
    tooltipContent += `<div style="margin-top: 8px; color: #ff9900; font-weight: 600;">
      Cross-Policy Connection
    </div>`;
  }

  if (link.combinedSelector) {
    tooltipContent += `<div style="margin-top: 8px; color: #9966cc; font-weight: 600;">
      Combined namespace+pod selector
    </div>`;
  }

  return tooltipContent;
};
