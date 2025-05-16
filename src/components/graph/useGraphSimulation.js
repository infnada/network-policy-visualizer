// src/components/graph/useGraphSimulation.js
// This file provides custom hook for creating and managing the D3 force simulation

import * as d3 from "d3";

/**
 * Creates and configures a D3 force simulation based on visualization type
 * @param {Array} nodes - Graph nodes
 * @param {Array} links - Graph links
 * @param {Object} dimensions - {width, height}
 * @param {String} visualizationType - 'enhanced' or 'classic'
 * @param {Object} nodesByNamespace - Nodes grouped by namespace
 * @returns {Object} - D3 simulation instance
 */
export const createSimulation = (
  nodes,
  links,
  dimensions,
  visualizationType,
  nodesByNamespace,
) => {
  const { width, height } = dimensions;

  // Position nodes initially for enhanced view
  if (visualizationType === "enhanced") {
    nodes.forEach((node) => {
      // Position nodes in a circular arrangement within their namespace group
      const namespace =
        nodesByNamespace[node.details?.namespace || "other"] || [];
      const angleStep = (2 * Math.PI) / Math.max(namespace.length, 1);
      const index = namespace.indexOf(node);

      // Position clusters in a circle around the center
      const namespaceKeys = Object.keys(nodesByNamespace);
      const namespaceIndex = namespaceKeys.indexOf(
        node.details?.namespace || "other",
      );
      const clusterAngle =
        (2 * Math.PI * namespaceIndex) / Math.max(namespaceKeys.length, 1);
      const clusterRadius = Math.min(width, height) * 0.35;

      // Calculate position within namespace cluster
      const nodeRadius = 60 + namespace.length * 5;
      const nodeAngle = index * angleStep;

      // Set initial position
      node.x =
        width / 2 +
        Math.cos(clusterAngle) * clusterRadius +
        Math.cos(nodeAngle) * nodeRadius;
      node.y =
        height / 2 +
        Math.sin(clusterAngle) * clusterRadius +
        Math.sin(nodeAngle) * nodeRadius;
    });
  }

  // Create simulation based on the selected visualization type
  let simulation;
  if (visualizationType === "enhanced") {
    // Enhanced simulation with better parameters to minimize crossing lines
    simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => {
            // Give more space to cross-policy links
            if (d.crossPolicy) return 250;
            // Give more space based on the number of connections
            const sourceConnections = links.filter(
              (link) =>
                link.source.id === d.source.id ||
                link.target.id === d.source.id,
            ).length;
            const targetConnections = links.filter(
              (link) =>
                link.source.id === d.target.id ||
                link.target.id === d.target.id,
            ).length;
            return 150 + (sourceConnections + targetConnections) * 5;
          })
          .strength(0.2),
      ) // Lower strength allows more flexibility
      .force(
        "charge",
        d3
          .forceManyBody()
          .strength((d) => {
            // Nodes with many connections repel more
            const connections = links.filter(
              (link) => link.source.id === d.id || link.target.id === d.id,
            ).length;
            return -500 - connections * 100;
          })
          .distanceMax(500),
      ) // Limit the range of charge
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force(
        "collision",
        d3.forceCollide().radius((d) => {
          // Nodes with more connections get more space
          const connections = links.filter(
            (link) => link.source.id === d.id || link.target.id === d.id,
          ).length;
          return 60 + connections * 5;
        }),
      )
      // Add clustering force to keep namespace groups together
      .force("cluster", (alpha) => {
        const k = alpha * 0.5;
        nodes.forEach((node) => {
          const namespace =
            node.details?.namespace ||
            (node.id.split(":").length > 1 && node.id.split(":")[0] === "pod"
              ? node.id.split(":")[1]
              : "other");

          const namespaceKeys = Object.keys(nodesByNamespace);
          const namespaceIndex = namespaceKeys.indexOf(namespace);
          const clusterAngle =
            (2 * Math.PI * namespaceIndex) / Math.max(namespaceKeys.length, 1);
          const clusterRadius = Math.min(width, height) * 0.35;

          // Get cluster center
          const cx = width / 2 + Math.cos(clusterAngle) * clusterRadius;
          const cy = height / 2 + Math.sin(clusterAngle) * clusterRadius;

          // Apply force towards cluster center
          node.vx = (node.vx || 0) + (cx - node.x) * k;
          node.vy = (node.vy || 0) + (cy - node.y) * k;
        });
      });
  } else {
    // Classic simulation with original parameters
    simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => (d.crossPolicy ? 180 : 120)),
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force("collision", d3.forceCollide().radius(40));
  }

  return simulation;
};

/**
 * Creates a drag behavior for nodes
 * @param {Object} simulation - D3 force simulation
 * @param {Function} onDrag - Callback to handle position updates during drag
 * @param {String} visualizationType - 'enhanced' or 'classic'
 * @returns {Function} - D3 drag behavior
 */
export const createDragBehavior = (simulation, onDrag, visualizationType) => {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;

    // Call the update callback
    if (onDrag) {
      onDrag(event);
    }
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    // Keep nodes fixed where user dragged them in enhanced view
    if (visualizationType !== "enhanced") {
      event.subject.fx = null;
      event.subject.fy = null;
    }
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
};
