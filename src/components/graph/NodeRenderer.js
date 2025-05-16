// src/components/graph/NodeRenderer.js
// Component for rendering nodes in the network policy graph

import React from "react";
import { getNodeStrokeColor } from "./graphStyleHelpers";

/**
 * Renders the appropriate shape for a node based on its type
 * @param {Object} props - Component props
 * @param {Object} props.node - Node data
 * @param {String} props.visualizationType - Visualization type ('enhanced' or 'classic')
 * @returns {React.Component}
 */
const NodeShape = ({ node, visualizationType }) => {
  const isMultiPolicy = node.policies && node.policies.length > 1;
  const strokeColor = getNodeStrokeColor(node);

  switch (node.type) {
    case "pod":
      return (
        <circle
          r={isMultiPolicy ? 12 : 10}
          fill={node.color}
          stroke={strokeColor}
          strokeWidth={isMultiPolicy ? 2 : 1.5}
        />
      );
    case "namespace":
      return (
        <rect
          width={isMultiPolicy ? 24 : 20}
          height={isMultiPolicy ? 24 : 20}
          x={isMultiPolicy ? -12 : -10}
          y={isMultiPolicy ? -12 : -10}
          fill={node.color}
          stroke={strokeColor}
          strokeWidth={isMultiPolicy ? 2 : 1.5}
        />
      );
    case "ipBlock":
      return (
        <polygon
          points={isMultiPolicy ? "0,-12 10,6 -10,6" : "0,-10 8.7,5 -8.7,5"}
          fill={node.color}
          stroke={strokeColor}
          strokeWidth={isMultiPolicy ? 2 : 1.5}
        />
      );
    case "combined":
      return (
        <polygon
          points={
            isMultiPolicy ? "0,-12 12,0 0,12 -12,0" : "0,-10 10,0 0,10 -10,0"
          }
          fill="#9966cc"
          stroke={strokeColor}
          strokeWidth={isMultiPolicy ? 2 : 1.5}
        />
      );
    default:
      return (
        <circle
          r={isMultiPolicy ? 10 : 8}
          fill={node.color}
          stroke={strokeColor}
          strokeWidth={isMultiPolicy ? 2 : 1.5}
        />
      );
  }
};

/**
 * Renders a badge for multi-policy nodes
 * @param {Object} props - Component props
 * @param {Object} props.node - Node data
 * @returns {React.Component|null}
 */
const PolicyCountBadge = ({ node }) => {
  const isMultiPolicy = node.policies && node.policies.length > 1;

  if (!isMultiPolicy) {
    return null;
  }

  return (
    <>
      <circle
        r={6}
        cx={10}
        cy={-10}
        fill="#ff9900"
        stroke="#ffffff"
        strokeWidth={1}
      />
      <text
        x={10}
        y={-7}
        textAnchor="middle"
        fontSize="8px"
        fontWeight="bold"
        fill="#ffffff"
      >
        {node.policies.length}
      </text>
    </>
  );
};

/**
 * Renders a label background for enhanced visualization
 * @param {Object} props - Component props
 * @param {Object} props.node - Node data
 * @param {String} props.visualizationType - Visualization type
 * @returns {React.Component|null}
 */
const LabelBackground = ({ node, visualizationType }) => {
  if (visualizationType !== "enhanced") {
    return null;
  }

  return (
    <rect
      x={node.type === "ipBlock" ? -15 : 12}
      y={node.type === "ipBlock" ? 8 : -4}
      width={80}
      height={14}
      fill="#ffffff"
      fillOpacity={0.7}
      rx={3}
      ry={3}
    />
  );
};

/**
 * Renders a node label
 * @param {Object} props - Component props
 * @param {Object} props.node - Node data
 * @param {String} props.visualizationType - Visualization type
 * @returns {React.Component}
 */
const NodeLabel = ({ node, visualizationType }) => {
  const isMultiPolicy = node.policies && node.policies.length > 1;
  const maxLength = 20;
  const truncatedLabel =
    node.label.length > maxLength
      ? node.label.substring(0, maxLength) + "..."
      : node.label;

  return (
    <text
      x={node.type === "ipBlock" ? 0 : isMultiPolicy ? 14 : 12}
      y={node.type === "ipBlock" ? 15 : 4}
      textAnchor={node.type === "ipBlock" ? "middle" : "start"}
      fontSize="10px"
      fontWeight="bold"
      fill={visualizationType === "enhanced" ? "#000000" : "#ffffff"}
      stroke={visualizationType === "enhanced" ? "none" : "#ffffff"}
      strokeWidth={visualizationType === "enhanced" ? 0 : 0.3}
      paintOrder="stroke"
    >
      {truncatedLabel}
    </text>
  );
};

/**
 * Renders a complete node with shape, badge, and label
 * This component would be used by D3 to render each node in SVG
 */
const NodeRenderer = ({ node, visualizationType }) => {
  return (
    <g>
      <NodeShape node={node} visualizationType={visualizationType} />
      <PolicyCountBadge node={node} />
      <LabelBackground node={node} visualizationType={visualizationType} />
      <NodeLabel node={node} visualizationType={visualizationType} />
    </g>
  );
};

export default NodeRenderer;
