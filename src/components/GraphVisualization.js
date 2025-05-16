import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import { getPortsText } from '../utils/formatters';

const GraphVisualization = ({ graphData }) => {
  const svgRef = useRef(null);
  const graphContainerRef = useRef(null);

  // D3 graph rendering
  const renderGraph = () => {
    if (!svgRef.current || !graphData.nodes.length) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = graphContainerRef.current.clientWidth || 800;
    const height = graphContainerRef.current.clientHeight || 600;
    
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    
    // Create a tooltip with improved formatting
    const tooltip = d3.select(graphContainerRef.current)
      .append("div")
      .attr("class", "absolute hidden bg-black bg-opacity-80 text-white p-2 rounded text-sm max-w-xs")
      .style("pointer-events", "none")
      .style("white-space", "pre-wrap");
    
    // Create container for zoom
    const container = svg.append("g");
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Create simulation with improved forces
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force("collision", d3.forceCollide().radius(40));
    
    // Create the links with markers
    const link = container.append("g")
      .selectAll("g")
      .data(graphData.links)
      .join("g");
    
    // Add link lines
    const linkLine = link.append("line")
      .attr("stroke", d => {
        if (d.direction === 'ingress') return '#ff6666';
        if (d.direction === 'egress') return '#66ff66';
        return '#aaaaaa';
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1);
    
    // Add arrows to links
    link.append("polygon")
      .attr("points", "0,-3 6,0 0,3")
      .attr("fill", d => {
        if (d.direction === 'ingress') return '#ff6666';
        if (d.direction === 'egress') return '#66ff66';
        return '#aaaaaa';
      });
    
    // Create nodes
    const node = container.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(drag(simulation));
    
    // Add node shapes based on type
    node.each(function(d) {
      const element = d3.select(this);
      
      if (d.type === 'pod') {
        element.append("circle")
          .attr("r", 10)
          .attr("fill", d.color)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
      } else if (d.type === 'namespace') {
        element.append("rect")
          .attr("width", 20)
          .attr("height", 20)
          .attr("x", -10)
          .attr("y", -10)
          .attr("fill", d.color)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
      } else if (d.type === 'ipBlock') {
        element.append("polygon")
          .attr("points", "0,-10 8.7,5 -8.7,5")
          .attr("fill", d.color)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
      } else if (d.type === 'combined') {
        // Diamond shape for combined namespace+pod selector
        element.append("polygon")
          .attr("points", "0,-10 10,0 0,10 -10,0")
          .attr("fill", "#9966cc")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
      } else {
        element.append("circle")
          .attr("r", 8)
          .attr("fill", d.color)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
      }
    });
    
    // Add node labels with improved positioning
    node.append("text")
      .attr("x", d => d.type === 'ipBlock' ? 0 : 12)
      .attr("y", d => d.type === 'ipBlock' ? 15 : 4)
      .attr("text-anchor", d => d.type === 'ipBlock' ? "middle" : "start")
      .text(d => d.label)
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 0.3)
      .attr("paint-order", "stroke");
    
    // Add hover effects
    node.on("mouseover", function(event, d) {
      // Highlight the node
      d3.select(this).select("circle, rect, polygon").attr("stroke-width", 3);
      
      // Highlight connected links
      const connectedLinks = graphData.links.filter(link => 
        link.source.id === d.id || link.target.id === d.id
      );
      
      linkLine.attr("stroke-width", link => 
        connectedLinks.includes(link) ? 3 : 1
      );
      
      // Prepare detailed tooltip content
      let tooltipContent = `<strong>${d.label}</strong><br/>`;
      tooltipContent += `Type: ${d.type}<br/>`;
      
      if (d.detailText) {
        tooltipContent += `${d.detailText}`;
      }
      
      // Show node details
      tooltip
        .html(tooltipContent)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .classed("hidden", false);
    })
    .on("mouseout", function() {
      d3.select(this).select("circle, rect, polygon").attr("stroke-width", 1.5);
      linkLine.attr("stroke-width", 1);
      tooltip.classed("hidden", true);
    });
    
    // Link hover effects with improved port details
    link.on("mouseover", function(event, d) {
      d3.select(this).select("line").attr("stroke-width", 3);
      
      // Format ports for better display
      const ports = getPortsText(d.ports);
      
      // Prepare detailed tooltip content
      let tooltipContent = `<strong>Policy: ${d.policy}</strong><br/>`;
      tooltipContent += `Direction: ${d.direction}<br/>`;
      tooltipContent += `Ports: ${ports}<br/>`;
      
      if (d.combinedSelector) {
        tooltipContent += `Combined namespace+pod selector`;
      }
      
      tooltip
        .html(tooltipContent)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .classed("hidden", false);
    })
    .on("mouseout", function() {
      d3.select(this).select("line").attr("stroke-width", 1);
      tooltip.classed("hidden", true);
    });
    
    // Drag behavior for nodes
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
    
    // Update position on simulation tick
    simulation.on("tick", () => {
      linkLine
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      // Position the arrow markers
      link.selectAll("polygon")
        .attr("transform", d => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          
          const offsetRatio = 0.9;
          const x = d.source.x + dx * offsetRatio;
          const y = d.source.y + dy * offsetRatio;
          
          return `translate(${x}, ${y}) rotate(${angle})`;
        });
      
      node.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });
    
    // Auto-fit the graph
    setTimeout(() => {
      const bounds = container.node().getBBox();
      const dx = bounds.width;
      const dy = bounds.height;
      const x = bounds.x + dx / 2;
      const y = bounds.y + dy / 2;
      
      const scale = Math.min(0.8, 0.8 / Math.max(dx / width, dy / height));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];
      
      svg.transition()
        .duration(500)
        .call(zoom.transform, d3.zoomIdentity
          .translate(translate[0], translate[1])
          .scale(scale));
    }, 300);
    
    return () => {
      tooltip.remove();
      simulation.stop();
    };
  };
  
  // Update graph when data changes
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      renderGraph();
    }
  }, [graphData]);
  
  // Update graph on window resize
  useEffect(() => {
    const handleResize = _.debounce(() => {
      if (graphData.nodes.length > 0) {
        renderGraph();
      }
    }, 200);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [graphData]);

  return (
    <div className="flex-1 relative" ref={graphContainerRef}>
      {graphData.nodes.length > 0 ? (
        <svg ref={svgRef} className="w-full h-full"></svg>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600 mb-4">No network policies loaded</p>
            <p className="text-gray-500">Upload YAML/JSON files containing NetworkPolicy resources or use the sample data</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;
