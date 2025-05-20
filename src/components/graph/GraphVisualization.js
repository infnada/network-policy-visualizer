// src/components/graph/GraphVisualization.js
// Main component for NetworkPolicy graph visualization that uses the modular components

import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import _ from "lodash";
import { getPortsText } from "../../utils/formatters";

// Import helper functions and components from modular files
import { createSimulation, createDragBehavior } from "./useGraphSimulation";
import {
  createLinkPath,
  getLinkColor,
  getLinkOpacity,
  getLinkWidth,
  getNodeTooltipContent,
  getLinkTooltipContent,
} from "./graphStyleHelpers";
import { createImprovedNode } from "./ImprovedNodeRenderer"; // Import the improved node renderer
import { GraphControlPanel, InfoPanel, EmptyState } from "./GraphControls";
import NodeCountDisplay from "./NodeCountDisplay"; // Import the new component

/**
 * Main component for rendering Network Policy visualization
 */
const GraphVisualization = ({ graphData, deduplicateNodes = true }) => {
  const svgRef = useRef(null);
  const graphContainerRef = useRef(null);
  const [visualizationType, setVisualizationType] = useState("enhanced"); // 'enhanced' or 'classic'

  // Main graph rendering function
  const renderGraph = () => {
    if (!svgRef.current || !graphData.nodes.length) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const width = graphContainerRef.current.clientWidth || 800;
    const height = graphContainerRef.current.clientHeight || 600;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // Create a tooltip with improved formatting and positioning
    const tooltip = d3
      .select(graphContainerRef.current)
      .append("div")
      .attr(
        "class",
        "absolute hidden bg-white border border-gray-300 text-gray-800 p-3 rounded-md text-sm max-w-sm shadow-lg",
      )
      .style("pointer-events", "none")
      .style("white-space", "pre-wrap")
      .style("z-index", 1000); // Ensure tooltip is above other elements

    // Create container for zoom
    const container = svg.append("g");

    // Add zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Save visualizationType in a local variable for use in callbacks
    const currentVisualizationType = visualizationType;

    // Group nodes by namespace to reduce line crossings (for enhanced view)
    const nodesByNamespace = _.groupBy(graphData.nodes, (node) => {
      if (node.details && node.details.namespace) {
        return node.details.namespace;
      }
      // Extract namespace from the node ID if possible
      const parts = node.id.split(":");
      if (parts.length > 1 && parts[0] === "pod") {
        return parts[1];
      }
      return "other";
    });

    // Create simulation using the useGraphSimulation helper
    const simulation = createSimulation(
      graphData.nodes,
      graphData.links,
      { width, height },
      currentVisualizationType,
      nodesByNamespace,
    );

    // Create the links - either curved paths or straight lines
    let link;

    if (currentVisualizationType === "enhanced") {
      // Enhanced: curved paths
      link = container
        .append("g")
        .selectAll("path")
        .data(graphData.links)
        .join("path")
        .attr("fill", "none")
        .attr("stroke", (d) => getLinkColor(d))
        .attr("stroke-opacity", (d) => getLinkOpacity(d))
        .attr("stroke-width", (d) => getLinkWidth(d))
        .attr("stroke-dasharray", (d) => (d.crossPolicy ? "5,3" : null))
        .attr("d", (d) => createLinkPath(d, currentVisualizationType));

      // Add arrows along the path
      const marker = svg
        .append("defs")
        .selectAll("marker")
        .data(["ingress", "egress", "ingress-cross", "egress-cross"])
        .enter()
        .append("marker")
        .attr("id", (d) => `arrowhead-${d}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 28)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", (d) => {
          if (d === "ingress") return "#ff6666";
          if (d === "egress") return "#66ff66";
          if (d === "ingress-cross") return "#ff3366";
          if (d === "egress-cross") return "#33ff66";
          return "#aaaaaa";
        });

      // Apply the markers to the paths
      link.attr("marker-end", (d) => {
        if (d.crossPolicy) {
          return d.direction === "ingress"
            ? "url(#arrowhead-ingress-cross)"
            : "url(#arrowhead-egress-cross)";
        }
        return d.direction === "ingress"
          ? "url(#arrowhead-ingress)"
          : "url(#arrowhead-egress)";
      });
    } else {
      // Classic: lines with separate arrow markers
      link = container
        .append("g")
        .selectAll("g")
        .data(graphData.links)
        .join("g");

      // Add link lines
      const linkLine = link
        .append("line")
        .attr("stroke", (d) => getLinkColor(d))
        .attr("stroke-opacity", (d) => getLinkOpacity(d))
        .attr("stroke-width", (d) => getLinkWidth(d))
        .attr("stroke-dasharray", (d) => (d.crossPolicy ? "5,3" : null));

      // Add arrows to links
      link
        .append("polygon")
        .attr("points", "0,-3 6,0 0,3")
        .attr("fill", (d) => getLinkColor(d));
    }

    // Create node drag behavior with update handler
    const dragBehavior = createDragBehavior(
      simulation,
      (event) => {
        // Update links in real-time during drag
        if (currentVisualizationType === "enhanced") {
          link.attr("d", (d) => createLinkPath(d, currentVisualizationType));
        } else {
          // For classic view, update the lines and arrow positions
          link
            .selectAll("line")
            .attr("x1", (d) => d.source.x)
            .attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y);

          link.selectAll("polygon").attr("transform", (d) => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            const offsetRatio = 0.9;
            const x = d.source.x + dx * offsetRatio;
            const y = d.source.y + dy * offsetRatio;

            return `translate(${x}, ${y}) rotate(${angle})`;
          });
        }
      },
      currentVisualizationType,
    );

    // Create nodes container
    const nodesGroup = container
      .append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(dragBehavior);

    // Create node elements using the improved node renderer
    nodesGroup.each(function (d) {
      const nodeElement = this;
      const nodeG = d3.select(nodeElement);
      const isMultiPolicy = d.policies && d.policies.length > 1;

      // Use the improved node renderer
      createImprovedNode(d, nodeG, isMultiPolicy);
    });

    // Add namespace labels (enhanced view only)
    if (currentVisualizationType === "enhanced") {
      Object.entries(nodesByNamespace).forEach(([namespace, nodes]) => {
        if (nodes.length > 0 && namespace !== "other") {
          // Calculate average position of nodes in this namespace
          const avgX =
            nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
          const avgY =
            nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;

          // Add namespace label
          container
            .append("text")
            .attr("class", "namespace-label")
            .attr("x", avgX)
            .attr("y", avgY - 55) // Position above the nodes
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .attr("fill", "#333333")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.5)
            .attr("paint-order", "stroke")
            .text(`Namespace: ${namespace}`);
        }
      });
    }

    // Add hover effects based on visualization type
    if (currentVisualizationType === "enhanced") {
      // Enhanced hover effects for nodes
      nodesGroup
        .on("mouseover", function (event, d) {
          // Highlight the node
          d3.select(this)
            .select("rect")
            .attr("stroke", "#ff3366")
            .attr("stroke-width", 3);

          // Find all links connected to this node
          const connectedLinks = graphData.links.filter(
            (link) => link.source.id === d.id || link.target.id === d.id,
          );

          // Highlight connected links
          link
            .attr("stroke-width", (l) => {
              if (connectedLinks.includes(l)) {
                return l.crossPolicy ? 4 : 3;
              } else {
                return l.crossPolicy ? 2 : 1.5;
              }
            })
            .attr("stroke-opacity", (l) => {
              if (connectedLinks.includes(l)) {
                return l.crossPolicy ? 1 : 0.8;
              } else {
                return l.crossPolicy ? 0.3 : 0.2; // Dim other links
              }
            });

          // Find all nodes connected to this node
          const connectedNodeIds = new Set();
          connectedLinks.forEach((l) => {
            connectedNodeIds.add(l.source.id);
            connectedNodeIds.add(l.target.id);
          });

          // Highlight connected nodes
          nodesGroup
            .selectAll("rect")
            .attr("stroke-opacity", (n) =>
              connectedNodeIds.has(n.id) ? 1 : 0.3,
            );

          // Calculate position near the node (not cursor)
          const nodePosition = d3.select(this).node().getBoundingClientRect();
          const containerPosition =
            graphContainerRef.current.getBoundingClientRect();

          // Show node details in tooltip near the node
          tooltip
            .html(getNodeTooltipContent(d))
            .style(
              "left",
              nodePosition.right - containerPosition.left + 5 + "px",
            )
            .style("top", nodePosition.top - containerPosition.top + "px")
            .classed("hidden", false);
        })
        .on("mouseout", function () {
          // Restore node appearance
          nodesGroup
            .selectAll("rect")
            .attr("stroke", (d) => {
              const isMulti = d.policies && d.policies.length > 1;
              return isMulti ? "#ff9900" : "#666666";
            })
            .attr("stroke-width", (d) => {
              const isMulti = d.policies && d.policies.length > 1;
              return isMulti ? 2 : 1;
            })
            .attr("stroke-opacity", 0.8);

          // Restore link appearance
          link
            .attr("stroke-width", (d) => (d.crossPolicy ? 2 : 1.5))
            .attr("stroke-opacity", (d) => (d.crossPolicy ? 0.7 : 0.5));

          // Hide tooltip
          tooltip.classed("hidden", true);
        });

      // Enhanced hover effects for links
      link
        .on("mouseover", function (event, d) {
          // Highlight the link
          d3.select(this)
            .attr("stroke-width", d.crossPolicy ? 4 : 3)
            .attr("stroke-opacity", 1);

          // Highlight the connected nodes
          nodesGroup
            .selectAll("rect")
            .attr("stroke", (n) => {
              return n.id === d.source.id || n.id === d.target.id
                ? "#ff3366"
                : n.policies && n.policies.length > 1
                  ? "#ff9900"
                  : "#666666";
            })
            .attr("stroke-width", (n) => {
              return n.id === d.source.id || n.id === d.target.id
                ? 3
                : n.policies && n.policies.length > 1
                  ? 2
                  : 1;
            })
            .attr("stroke-opacity", (n) =>
              n.id === d.source.id || n.id === d.target.id ? 1 : 0.3,
            );

          // Position tooltip near the midpoint of the link
          const sourceNode = d3
            .select(
              nodesGroup
                .nodes()
                .find((node) => d3.select(node).datum().id === d.source.id),
            )
            .node();

          const targetNode = d3
            .select(
              nodesGroup
                .nodes()
                .find((node) => d3.select(node).datum().id === d.target.id),
            )
            .node();

          if (sourceNode && targetNode) {
            const sourceBounds = sourceNode.getBoundingClientRect();
            const targetBounds = targetNode.getBoundingClientRect();
            const containerPosition =
              graphContainerRef.current.getBoundingClientRect();

            const midX =
              (sourceBounds.left + targetBounds.left) / 2 -
              containerPosition.left;
            const midY =
              (sourceBounds.top + targetBounds.top) / 2 - containerPosition.top;

            tooltip
              .html(getLinkTooltipContent(d, getPortsText))
              .style("left", midX + 10 + "px")
              .style("top", midY - 10 + "px")
              .classed("hidden", false);
          } else {
            // Fallback to cursor position
            tooltip
              .html(getLinkTooltipContent(d, getPortsText))
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 10 + "px")
              .classed("hidden", false);
          }
        })
        .on("mouseout", function () {
          // Restore link appearance
          d3.select(this)
            .attr("stroke-width", (d) => (d.crossPolicy ? 2 : 1.5))
            .attr("stroke-opacity", (d) => (d.crossPolicy ? 0.7 : 0.5));

          // Restore node appearance
          nodesGroup
            .selectAll("rect")
            .attr("stroke", (d) => {
              const isMulti = d.policies && d.policies.length > 1;
              return isMulti ? "#ff9900" : "#666666";
            })
            .attr("stroke-width", (d) => {
              const isMulti = d.policies && d.policies.length > 1;
              return isMulti ? 2 : 1;
            })
            .attr("stroke-opacity", 0.8);

          // Hide tooltip
          tooltip.classed("hidden", true);
        });
    } else {
      // Classic hover effects for nodes
      nodesGroup
        .on("mouseover", function (event, d) {
          // Highlight the node
          d3.select(this)
            .select("rect")
            .attr("stroke", "#ff3366")
            .attr("stroke-width", 3);

          // Find connected links for the classic view
          const connectedLinks = graphData.links.filter(
            (link) => link.source.id === d.id || link.target.id === d.id,
          );

          // Highlight connected links differently based on view
          if (currentVisualizationType === "classic") {
            link
              .selectAll("line")
              .attr("stroke-width", (l) =>
                connectedLinks.includes(l) ? 3 : 1,
              );
          }

          // Calculate position near the node (not cursor)
          const nodePosition = d3.select(this).node().getBoundingClientRect();
          const containerPosition =
            graphContainerRef.current.getBoundingClientRect();

          // Show node details in tooltip near the node
          tooltip
            .html(getNodeTooltipContent(d))
            .style(
              "left",
              nodePosition.right - containerPosition.left + 5 + "px",
            )
            .style("top", nodePosition.top - containerPosition.top + "px")
            .classed("hidden", false);
        })
        .on("mouseout", function () {
          // Restore node appearance
          const d = d3.select(this).datum();
          const isMultiPolicy = d.policies && d.policies.length > 1;

          d3.select(this)
            .select("rect")
            .attr("stroke", isMultiPolicy ? "#ff9900" : "#666666")
            .attr("stroke-width", isMultiPolicy ? 2 : 1);

          // Restore link appearance differently based on view
          if (currentVisualizationType === "classic") {
            link
              .selectAll("line")
              .attr("stroke-width", (l) => (l.crossPolicy ? 2 : 1));
          }

          // Hide tooltip
          tooltip.classed("hidden", true);
        });

      // Classic hover effects for links
      if (currentVisualizationType === "classic") {
        link
          .on("mouseover", function (event, d) {
            // Highlight the link
            d3.select(this).select("line").attr("stroke-width", 3);

            // Position tooltip near the midpoint of the link
            const sourceNode = d3
              .select(
                nodesGroup
                  .nodes()
                  .find((node) => d3.select(node).datum().id === d.source.id),
              )
              .node();

            const targetNode = d3
              .select(
                nodesGroup
                  .nodes()
                  .find((node) => d3.select(node).datum().id === d.target.id),
              )
              .node();

            if (sourceNode && targetNode) {
              const sourceBounds = sourceNode.getBoundingClientRect();
              const targetBounds = targetNode.getBoundingClientRect();
              const containerPosition =
                graphContainerRef.current.getBoundingClientRect();

              const midX =
                (sourceBounds.left + targetBounds.left) / 2 -
                containerPosition.left;
              const midY =
                (sourceBounds.top + targetBounds.top) / 2 -
                containerPosition.top;

              tooltip
                .html(getLinkTooltipContent(d, getPortsText))
                .style("left", midX + 10 + "px")
                .style("top", midY - 10 + "px")
                .classed("hidden", false);
            } else {
              // Fallback to cursor position
              tooltip
                .html(getLinkTooltipContent(d, getPortsText))
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .classed("hidden", false);
            }
          })
          .on("mouseout", function () {
            // Restore link appearance
            d3.select(this)
              .select("line")
              .attr("stroke-width", (d) => (d.crossPolicy ? 2 : 1));

            // Hide tooltip
            tooltip.classed("hidden", true);
          });
      }
    }

    // Update position on simulation tick
    simulation.on("tick", () => {
      // Use the local currentVisualizationType variable from closure
      if (currentVisualizationType === "enhanced") {
        // For enhanced view with curved paths
        link.attr("d", (d) => createLinkPath(d, currentVisualizationType));

        // Update namespace labels
        const namespaceLabels = container
          .selectAll("text.namespace-label")
          .data(
            Object.entries(nodesByNamespace).filter(
              ([ns, nodes]) => ns !== "other" && nodes.length > 0,
            ),
          );

        // Enter + update namespace labels
        namespaceLabels
          .enter()
          .append("text")
          .attr("class", "namespace-label")
          .merge(namespaceLabels)
          .attr("x", ([namespace, nodes]) => {
            return nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
          })
          .attr("y", ([namespace, nodes]) => {
            return (
              nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length - 55
            );
          })
          .attr("text-anchor", "middle")
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .attr("fill", "#333333")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 0.5)
          .attr("paint-order", "stroke")
          .text(([namespace]) => `Namespace: ${namespace}`);

        // Exit
        namespaceLabels.exit().remove();
      } else {
        // For classic view with straight lines
        link
          .selectAll("line")
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        // Update arrow positions
        link.selectAll("polygon").attr("transform", (d) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

          const offsetRatio = 0.9;
          const x = d.source.x + dx * offsetRatio;
          const y = d.source.y + dy * offsetRatio;

          return `translate(${x}, ${y}) rotate(${angle})`;
        });
      }

      nodesGroup.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    // Auto-fit the graph with a transition
    setTimeout(() => {
      const bounds = container.node().getBBox();
      const dx = bounds.width;
      const dy = bounds.height;
      const x = bounds.x + dx / 2;
      const y = bounds.y + dy / 2;

      // Calculate appropriate scale to fit the graph
      const scale = Math.min(0.8, 0.8 / Math.max(dx / width, dy / height));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];

      // Apply the transformation
      svg
        .transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale),
        );
    }, 500);

    return () => {
      tooltip.remove();
      simulation.stop();
    };
  };

  // Update graph when data changes or visualization type changes
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      renderGraph();
    }
  }, [graphData, visualizationType]);

  // Update graph on window resize
  useEffect(() => {
    const handleResize = _.debounce(() => {
      if (graphData.nodes.length > 0) {
        renderGraph();
      }
    }, 200);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [graphData, visualizationType]);

  return (
    <div className="flex-1 relative" ref={graphContainerRef}>
      {graphData.nodes.length > 0 ? (
        <>
          <GraphControlPanel
            visualizationType={visualizationType}
            setVisualizationType={setVisualizationType}
            resetLayout={renderGraph}
          />
          <InfoPanel visualizationType={visualizationType} />
          <NodeCountDisplay
            graphData={graphData}
            deduplicateNodes={deduplicateNodes}
          />
          <svg ref={svgRef} className="w-full h-full"></svg>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
};

export default GraphVisualization;
