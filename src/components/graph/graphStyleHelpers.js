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
  let tooltipContent = `<strong>${node.label}</strong><br/>`;
  tooltipContent += `Type: ${node.type}<br/>`;

  if (node.policies && node.policies.length > 0) {
    tooltipContent += `Referenced by policies: ${node.policies.join(", ")}<br/>`;
  }

  if (node.detailText) {
    tooltipContent += `${node.detailText}`;
  }

  return tooltipContent;
};

/**
 * Prepares tooltip content for a link
 * @param {Object} link - The link data
 * @param {Function} getPortsText - Function to format ports
 * @returns {String} - HTML content for tooltip
 */
export const getLinkTooltipContent = (link, getPortsText) => {
  // Format ports for better display
  const ports = getPortsText(link.ports);

  // Prepare detailed tooltip content
  let tooltipContent = `<strong>Policy: ${link.policy}</strong><br/>`;
  tooltipContent += `Direction: ${link.direction}<br/>`;
  tooltipContent += `Ports: ${ports}<br/>`;

  if (link.crossPolicy) {
    tooltipContent += `<strong>Cross-Policy Connection</strong><br/>`;
  }

  if (link.combinedSelector) {
    tooltipContent += `Combined namespace+pod selector`;
  }

  return tooltipContent;
};
