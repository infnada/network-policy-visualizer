/**
 * Builds graph data from NetworkPolicy objects with improved cross-policy connections
 * and node deduplication logic
 * @param {Array} policies Array of parsed NetworkPolicy objects
 * @param {Boolean} deduplicateNodes Whether to deduplicate nodes with identical selectors
 * @returns {Object} Graph data with nodes and links
 */
export const buildGraphData = (policies, deduplicateNodes = true) => {
  const nodes = new Map();
  const links = [];
  const linkRegistry = new Map(); // Track created links to avoid duplicates

  // Helper function to normalize selectors for consistent node IDs
  const normalizeSelector = (selector) => {
    if (!selector) return "{}";

    // For matchLabels, sort keys to ensure consistent serialization
    if (selector.matchLabels) {
      const sortedLabels = {};
      Object.keys(selector.matchLabels)
        .sort()
        .forEach((key) => {
          sortedLabels[key] = selector.matchLabels[key];
        });
      selector = { ...selector, matchLabels: sortedLabels };
    }

    // For matchExpressions, sort by key
    if (selector.matchExpressions && Array.isArray(selector.matchExpressions)) {
      selector.matchExpressions = [...selector.matchExpressions].sort((a, b) =>
        a.key.localeCompare(b.key),
      );
    }

    return JSON.stringify(selector);
  };

  // Helper to generate consistent node IDs - considering deduplication setting
  const generateNodeId = (type, namespace, details, policyName = "") => {
    // If deduplication is disabled, include policy name in the ID to make it unique
    const policyPart = deduplicateNodes ? "" : `:policy:${policyName}`;

    switch (type) {
      case "pod":
        // For pod selectors, we only care about the selector itself, not any policy-specific info
        // Unless deduplication is disabled
        return `pod:${namespace}:${normalizeSelector(details.podSelector)}${policyPart}`;
      case "namespace":
        // For namespace selectors, we only care about the selector itself
        return `namespace:${normalizeSelector(details)}${policyPart}`;
      case "ipBlock":
        // For IP blocks, the CIDR is the unique identifier
        return `ipBlock:${details.cidr || "unknown"}${policyPart}`;
      case "combined":
        // For combined selectors, we need both the namespace and pod selectors
        return `combined:${namespace}:${normalizeSelector(details.namespace)}:${normalizeSelector(details.pod)}${policyPart}`;
      case "anywhere":
        // For "any" destinations or sources, we only distinguish by direction
        return `anywhere:${details.direction}${policyPart}`;
      default:
        return `unknown:${namespace}:${JSON.stringify(details)}${policyPart}`;
    }
  };

  // Helper to generate link ID that ignores ports
  const generateLinkId = (sourceId, targetId, direction, policyName = "") => {
    // If deduplication is disabled, include policy name in the link ID
    const policyPart = deduplicateNodes ? "" : `:policy:${policyName}`;
    return `link:${sourceId}:${targetId}:${direction}${policyPart}`;
  };

  // First pass: build all policy nodes and their direct rules
  policies.forEach((policy) => {
    try {
      // Ensure critical arrays exist
      if (!Array.isArray(policy.ingress)) policy.ingress = [];
      if (!Array.isArray(policy.egress)) policy.egress = [];

      // Create source node for the policy target - using standardized ID generation
      const sourceId = generateNodeId(
        "pod",
        policy.namespace,
        { podSelector: policy.podSelector },
        policy.name,
      );

      // Create a label for pod nodes
      const createPodLabel = (namespace, podSelector) => {
        let label = `${namespace}:pod`;

        if (podSelector?.matchLabels) {
          const labelStr = Object.entries(podSelector.matchLabels)
            .map(([key, value]) => `${key.split("/").pop()}: ${value}`)
            .join(", ");
          if (labelStr) {
            label += `(${labelStr})`;
          }
        }

        return label;
      };

      // Add the policy target pod - ensuring we don't duplicate nodes with same selector
      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, {
          id: sourceId,
          label: createPodLabel(policy.namespace, policy.podSelector),
          type: "pod",
          details: {
            namespace: policy.namespace,
            podSelector: policy.podSelector,
            podSelectorLabels: policy.podSelectorLabels,
          },
          detailText: policy.podSelectorLabels
            ? `Labels: ${policy.podSelectorLabels}`
            : "No labels specified",
          color: "#66aaff",
          policies: [policy.name],
        });
      } else {
        // Update existing node to add this policy reference
        const node = nodes.get(sourceId);
        if (!node.policies.includes(policy.name)) {
          node.policies.push(policy.name);

          // Check if "Referenced by policies" already exists in the detailText
          if (node.detailText.includes("Referenced by policies:")) {
            // Replace the existing policies list with the updated one
            node.detailText = node.detailText.replace(
              /Referenced by policies:.*$/,
              `Referenced by policies: ${node.policies.join(", ")}`,
            );
          } else {
            // Add the policies list as a new line
            node.detailText = `${node.detailText}\n\nReferenced by policies: ${node.policies.join(", ")}`;
          }
        }
      }

      // Helper to add a link with deduplication
      const addLink = (
        sourceId,
        targetId,
        ports,
        direction,
        policy,
        ruleIndex,
        options = {},
      ) => {
        const baseLinkId = generateLinkId(
          sourceId,
          targetId,
          direction,
          policy,
        );

        // Check if we already have a similar link (ignoring ports)
        const existingLink = linkRegistry.get(baseLinkId);

        if (existingLink && deduplicateNodes) {
          // Only combine links if deduplication is enabled
          // Update existing link with additional policy info
          existingLink.policies = existingLink.policies || [
            existingLink.policy,
          ];
          if (!existingLink.policies.includes(policy)) {
            existingLink.policies.push(policy);
            existingLink.policy = existingLink.policies.join(", ");
          }

          // Merge ports if they differ
          if (JSON.stringify(existingLink.ports) !== JSON.stringify(ports)) {
            if (!existingLink.portsMap) {
              existingLink.portsMap = {};
              // Add the original ports
              existingLink.portsMap[existingLink.policies[0]] =
                existingLink.ports;
            }

            // Add the new ports
            existingLink.portsMap[policy] = ports;

            // Update tooltip to show different ports per policy
            existingLink.detailedPorts = true;
          }

          return existingLink;
        } else {
          // Create new link
          const newLink = {
            source: sourceId,
            target: targetId,
            ports,
            direction,
            policy,
            ruleIndex,
            ...options,
          };

          // Register this link for deduplication
          linkRegistry.set(baseLinkId, newLink);
          links.push(newLink);
          return newLink;
        }
      };

      // Helper function to add nodes with consistent IDs to avoid duplication
      const addNode = (type, namespace, details, direction) => {
        // Generate a consistent ID based on selector, not policy-specific info
        const id = generateNodeId(type, namespace, details, policy.name);

        if (!nodes.has(id)) {
          let label = "unknown";
          let detailText = "";

          if (type === "pod") {
            label = createPodLabel(
              namespace || policy.namespace,
              details.podSelector,
            );
            if (details.podSelector?.matchLabels) {
              detailText =
                "Labels: " +
                Object.entries(details.podSelector.matchLabels)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join("\n");
            }
          } else if (type === "namespace") {
            if (details.matchLabels) {
              const labels = Object.entries(details.matchLabels)
                .map(([key, value]) => `${key.split("/").pop()}: ${value}`)
                .join(", ");
              label = `ns:${labels}`;
              detailText =
                "Labels: " +
                Object.entries(details.matchLabels)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join("\n");
            } else if (details.matchExpressions) {
              const expr = details.matchExpressions
                .map((e) => {
                  const key = e.key.split("/").pop();
                  return `${key} ${e.operator} [${e.values?.join(", ") || ""}]`;
                })
                .join(", ");
              label = `ns:(${expr})`;
              detailText =
                "Expressions: " +
                details.matchExpressions
                  .map((expr) => {
                    return `${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]`;
                  })
                  .join("\n");
            } else {
              label = "ns:selector";
            }
          } else if (type === "ipBlock") {
            label = `CIDR:${details.cidr}`;
            detailText = `CIDR: ${details.cidr}`;
            if (details.except) {
              detailText += `\nExcept: ${details.except.join(", ")}`;
            }
          } else if (type === "combined") {
            let nsLabel = "unknown";
            let podLabel = "unknown";

            if (details.namespace?.matchLabels) {
              nsLabel = Object.entries(details.namespace.matchLabels)
                .map(([key, value]) => `${key.split("/").pop()}: ${value}`)
                .join(", ");
            } else if (details.namespace?.matchExpressions) {
              nsLabel = details.namespace.matchExpressions
                .map(
                  (e) =>
                    `${e.key.split("/").pop()} ${e.operator} [${e.values?.join(", ") || ""}]`,
                )
                .join(", ");
            }

            if (details.pod?.matchLabels) {
              podLabel = Object.entries(details.pod.matchLabels)
                .map(([key, value]) => `${key.split("/").pop()}: ${value}`)
                .join(", ");
            }

            label = `ns:(${nsLabel})+pod(${podLabel})`;

            detailText = "Combined selector\n";
            if (details.namespace?.matchLabels) {
              detailText +=
                "Namespace Labels: " +
                Object.entries(details.namespace.matchLabels)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join("\n") +
                "\n";
            }
            if (details.namespace?.matchExpressions) {
              detailText +=
                "Namespace Expressions: " +
                details.namespace.matchExpressions
                  .map((expr) => {
                    return `${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]`;
                  })
                  .join("\n") +
                "\n";
            }
            if (details.pod?.matchLabels) {
              detailText +=
                "Pod Labels: " +
                Object.entries(details.pod.matchLabels)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join("\n");
            }
          } else if (type === "anywhere") {
            label =
              details.direction === "ingress"
                ? "Any Source"
                : "Any Destination";
          }

          // CRITICAL FIX: For combined nodes, preserve the actual selectors in details
          // instead of just storing the namespace string
          const nodeDetails =
            type === "combined"
              ? {
                  // Keep the original namespace and pod selector objects
                  namespace: details.namespace,
                  pod: details.pod,
                }
              : {
                  ...details,
                  namespace, // Only for non-combined nodes, store the namespace string
                };

          nodes.set(id, {
            id,
            label,
            type,
            details: nodeDetails, // Use the corrected details object
            direction,
            detailText,
            color:
              type === "pod"
                ? "#66aaff"
                : type === "namespace"
                  ? "#44cc44"
                  : type === "ipBlock"
                    ? "#ffaa44"
                    : type === "combined"
                      ? "#9966cc"
                      : "#dddddd",
            policies: [policy.name],
          });
        } else {
          // Update existing node to add this policy reference
          const node = nodes.get(id);
          if (!node.policies.includes(policy.name)) {
            node.policies.push(policy.name);

            // Check if "Referenced by policies" already exists in the detailText
            if (node.detailText.includes("Referenced by policies:")) {
              // Replace the existing policies list with the updated one
              node.detailText = node.detailText.replace(
                /Referenced by policies:.*$/,
                `Referenced by policies: ${node.policies.join(", ")}`,
              );
            } else {
              // Add the policies list as a new line
              node.detailText = `${node.detailText}\n\nReferenced by policies: ${node.policies.join(", ")}`;
            }
          }
        }
        return id;
      };

      // Process ingress rules
      policy.ingress.forEach((rule, ruleIndex) => {
        if (!rule) return;

        if (!rule.from || !Array.isArray(rule.from) || rule.from.length === 0) {
          // Allow from anywhere
          const anywhereId = addNode(
            "anywhere",
            policy.namespace,
            { direction: "ingress" },
            "ingress",
          );
          addLink(
            anywhereId,
            sourceId,
            rule.ports || "all",
            "ingress",
            policy.name,
            ruleIndex,
          );
        } else {
          rule.from.forEach((from, fromIndex) => {
            if (!from) return;

            let fromId;

            if (from.namespaceSelector && from.podSelector) {
              // Combined selector - CRITICAL FIX: Preserve both selectors
              fromId = addNode(
                "combined",
                policy.namespace,
                {
                  namespace: from.namespaceSelector, // Preserve the full selector object
                  pod: from.podSelector,
                },
                "ingress",
              );
            } else if (from.namespaceSelector) {
              fromId = addNode(
                "namespace",
                policy.namespace,
                from.namespaceSelector,
                "ingress",
              );
            } else if (from.podSelector) {
              fromId = addNode(
                "pod",
                policy.namespace,
                { podSelector: from.podSelector },
                "ingress",
              );
            } else if (from.ipBlock) {
              fromId = addNode(
                "ipBlock",
                policy.namespace,
                from.ipBlock,
                "ingress",
              );
            }

            if (fromId) {
              addLink(
                fromId,
                sourceId,
                rule.ports || "all",
                "ingress",
                policy.name,
                ruleIndex,
              );
            }
          });
        }
      });

      // Process egress rules
      policy.egress.forEach((rule, ruleIndex) => {
        if (!rule) return;

        if (!rule.to || !Array.isArray(rule.to) || rule.to.length === 0) {
          // Allow to anywhere
          const anywhereId = addNode(
            "anywhere",
            policy.namespace,
            { direction: "egress" },
            "egress",
          );
          addLink(
            sourceId,
            anywhereId,
            rule.ports || "all",
            "egress",
            policy.name,
            ruleIndex,
          );
        } else {
          rule.to.forEach((to, toIndex) => {
            if (!to) return;

            let toId;

            if (to.namespaceSelector && to.podSelector) {
              // Combined selector - CRITICAL FIX: Preserve both selectors
              toId = addNode(
                "combined",
                policy.namespace,
                {
                  namespace: to.namespaceSelector, // Preserve the full selector object
                  pod: to.podSelector,
                },
                "egress",
              );
            } else if (to.namespaceSelector) {
              toId = addNode(
                "namespace",
                policy.namespace,
                to.namespaceSelector,
                "egress",
              );
            } else if (to.podSelector) {
              toId = addNode(
                "pod",
                policy.namespace,
                { podSelector: to.podSelector },
                "egress",
              );
            } else if (to.ipBlock) {
              toId = addNode("ipBlock", policy.namespace, to.ipBlock, "egress");
            }

            if (toId) {
              addLink(
                sourceId,
                toId,
                rule.ports || "all",
                "egress",
                policy.name,
                ruleIndex,
              );
            }
          });
        }
      });
    } catch (error) {
      console.error("Error processing policy:", error, error.stack);
    }
  });

  // Only generate cross-policy connections if deduplication is enabled
  if (deduplicateNodes) {
    // Second pass: Connect NetworkPolicies to each other based on selectors
    policies.forEach((sourcePolicy) => {
      // Skip if no ingress or egress rules
      if (
        (!sourcePolicy.ingress || sourcePolicy.ingress.length === 0) &&
        (!sourcePolicy.egress || sourcePolicy.egress.length === 0)
      ) {
        return;
      }

      const sourcePodDetails = { podSelector: sourcePolicy.podSelector };
      const sourcePolicyId = generateNodeId(
        "pod",
        sourcePolicy.namespace,
        sourcePodDetails,
        sourcePolicy.name,
      );

      // Function to check if a pod selector matches a policy's pod selector
      const doesSelectorMatch = (selector, targetSelector) => {
        // If either doesn't have matchLabels, can't determine a match
        if (!selector.matchLabels || !targetSelector.matchLabels) {
          return false;
        }

        // Check if all labels in the selector match the target
        // This is a simplified approach; in K8s, the actual selector matching is more complex
        return Object.entries(selector.matchLabels).every(([key, value]) => {
          return targetSelector.matchLabels[key] === value;
        });
      };

      // Check ingress rules
      sourcePolicy.ingress.forEach((rule, ruleIndex) => {
        if (!rule.from || !Array.isArray(rule.from)) return;

        rule.from.forEach((from, fromIndex) => {
          if (!from.podSelector) return;

          // Find policies whose pod selector matches this ingress rule's from.podSelector
          policies.forEach((targetPolicy) => {
            // Skip self-references or cross-namespace (unless explicitly allowed)
            if (
              sourcePolicy.name === targetPolicy.name ||
              (sourcePolicy.namespace !== targetPolicy.namespace &&
                !from.namespaceSelector)
            ) {
              return;
            }

            // Check if the targetPolicy's podSelector matches the from.podSelector
            if (doesSelectorMatch(from.podSelector, targetPolicy.podSelector)) {
              const targetPodDetails = {
                podSelector: targetPolicy.podSelector,
              };
              const targetPolicyId = generateNodeId(
                "pod",
                targetPolicy.namespace,
                targetPodDetails,
                targetPolicy.name,
              );

              // Generate a consistent link ID that is order-dependent
              const linkId = generateLinkId(
                targetPolicyId,
                sourcePolicyId,
                "ingress",
                `${targetPolicy.name}->${sourcePolicy.name}`,
              );
              const policyName = `${targetPolicy.name} → ${sourcePolicy.name}`;

              // Check if this link already exists
              if (!linkRegistry.has(linkId)) {
                const newLink = {
                  source: targetPolicyId,
                  target: sourcePolicyId,
                  direction: "ingress",
                  policy: policyName,
                  ports: rule.ports || "all",
                  crossPolicy: true,
                  combinedSelector: from.namespaceSelector && from.podSelector,
                };

                links.push(newLink);
                // Register the link to avoid duplicates
                linkRegistry.set(linkId, newLink);
              }
            }
          });
        });
      });

      // Check egress rules
      sourcePolicy.egress.forEach((rule, ruleIndex) => {
        if (!rule.to || !Array.isArray(rule.to)) return;

        rule.to.forEach((to, toIndex) => {
          if (!to.podSelector) return;

          // Find policies whose pod selector matches this egress rule's to.podSelector
          policies.forEach((targetPolicy) => {
            // Skip self-references or cross-namespace (unless explicitly allowed)
            if (
              sourcePolicy.name === targetPolicy.name ||
              (sourcePolicy.namespace !== targetPolicy.namespace &&
                !to.namespaceSelector)
            ) {
              return;
            }

            // Check if the targetPolicy's podSelector matches the to.podSelector
            if (doesSelectorMatch(to.podSelector, targetPolicy.podSelector)) {
              const targetPodDetails = {
                podSelector: targetPolicy.podSelector,
              };
              const targetPolicyId = generateNodeId(
                "pod",
                targetPolicy.namespace,
                targetPodDetails,
                targetPolicy.name,
              );

              // Generate a consistent link ID that is order-dependent
              const linkId = generateLinkId(
                sourcePolicyId,
                targetPolicyId,
                "egress",
                `${sourcePolicy.name}->${targetPolicy.name}`,
              );
              const policyName = `${sourcePolicy.name} → ${targetPolicy.name}`;

              // Check if this link already exists
              if (!linkRegistry.has(linkId)) {
                const newLink = {
                  source: sourcePolicyId,
                  target: targetPolicyId,
                  direction: "egress",
                  policy: policyName,
                  ports: rule.ports || "all",
                  crossPolicy: true,
                  combinedSelector: to.namespaceSelector && to.podSelector,
                };

                links.push(newLink);
                // Register the link to avoid duplicates
                linkRegistry.set(linkId, newLink);
              }
            }
          });
        });
      });
    });
  }

  // Process links to include detailed port information in tooltips
  links.forEach((link) => {
    if (link.detailedPorts && link.portsMap) {
      link.portDetails = Object.entries(link.portsMap)
        .map(
          ([policy, ports]) =>
            `${policy}: ${
              Array.isArray(ports)
                ? ports
                    .map((p) =>
                      typeof p === "object"
                        ? `${p.port || ""}${p.protocol ? "/" + p.protocol : ""}`
                        : p,
                    )
                    .join(", ")
                : ports
            }`,
        )
        .join("\n");
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    links,
  };
};
