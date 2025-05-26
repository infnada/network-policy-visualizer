import yaml from "js-yaml";

// Parse YAML using js-yaml library
export const parseYaml = (yamlText) => {
  try {
    // Pre-process the YAML to handle document separators correctly
    const documents = yamlText
      .split(/^---$/m)
      .filter((doc) => doc.trim())
      .map((doc) => doc.trim());

    return documents.map((doc) => {
      try {
        // Parse each document using js-yaml
        return yaml.load(doc);
      } catch (error) {
        console.error("Error parsing YAML document:", error);
        // Return minimal fallback
        return {
          apiVersion: "networking.k8s.io/v1",
          kind: "NetworkPolicy",
          metadata: {
            name: "parse-error",
            namespace: "default",
          },
          spec: {
            podSelector: {},
            policyTypes: [],
            ingress: [],
            egress: [],
          },
        };
      }
    });
  } catch (error) {
    console.error("YAML parsing error:", error);
    return [
      {
        apiVersion: "networking.k8s.io/v1",
        kind: "NetworkPolicy",
        metadata: {
          name: "parse-error",
          namespace: "default",
        },
        spec: {
          podSelector: {},
          policyTypes: [],
          ingress: [],
          egress: [],
        },
      },
    ];
  }
};

export const parseNetworkPolicy = (policy) => {
  try {
    console.log("Parsing policy:", JSON.stringify(policy, null, 2));

    // Ensure we have required objects
    if (!policy.metadata) policy.metadata = {};
    if (!policy.spec) policy.spec = {};

    // Basic structure with fallbacks for required fields
    const result = {
      name: policy.metadata?.name || "unnamed-policy",
      namespace: policy.metadata?.namespace || "default",
      podSelector: policy.spec?.podSelector || {},
      // Ensure these are always arrays
      ingress: Array.isArray(policy.spec?.ingress) ? policy.spec.ingress : [],
      egress: Array.isArray(policy.spec?.egress) ? policy.spec.egress : [],
      policyTypes: Array.isArray(policy.spec?.policyTypes)
        ? policy.spec.policyTypes
        : [],
    };

    // Process and normalize pod selector for easier display
    if (result.podSelector) {
      if (result.podSelector.matchLabels) {
        try {
          result.podSelectorLabels = Object.entries(
            result.podSelector.matchLabels,
          )
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
        } catch (e) {
          result.podSelectorLabels = "Error extracting labels";
        }
      }

      if (result.podSelector.matchExpressions) {
        try {
          const expressions = result.podSelector.matchExpressions
            .map((expr) => {
              return `${expr.key} ${expr.operator} [${expr.values?.join(", ") || ""}]`;
            })
            .join(", ");

          result.podSelectorExpressions = expressions;
        } catch (e) {
          result.podSelectorExpressions = "Error extracting expressions";
        }
      }
    }

    console.log("Parsed policy:", JSON.stringify(result, null, 2));

    return result;
  } catch (err) {
    console.error("Error parsing policy:", err);
    // Provide a minimal valid structure
    return {
      name: "parse-error",
      namespace: "default",
      podSelector: {},
      ingress: [],
      egress: [],
      policyTypes: [],
    };
  }
};

// Enhanced buildGraphData function to connect related NetworkPolicies
export const buildGraphData = (policies) => {
  const nodes = new Map();
  const links = [];

  // First pass: build all policy nodes and their direct rules
  policies.forEach((policy) => {
    try {
      // Ensure critical arrays exist
      if (!Array.isArray(policy.ingress)) policy.ingress = [];
      if (!Array.isArray(policy.egress)) policy.egress = [];

      console.log(
        `Creating graph for policy ${policy.name} in namespace ${policy.namespace}`,
      );
      console.log(`Pod selector:`, policy.podSelector);

      // Create source node for the policy target
      const policyNodeId = `policy:${policy.namespace}:${policy.name}`;
      const sourceId = `pod:${policy.namespace}:${JSON.stringify(policy.podSelector || {})}`;

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

      // Add the policy target pod
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
        // Store a reference to the policy for cross-linking
        policies: [policy.name],
      });

      // Helper function to add nodes
      const addNode = (id, type, details, direction) => {
        if (!nodes.has(id)) {
          let label = "unknown";
          let detailText = "";

          if (type === "pod") {
            label = createPodLabel(
              details.namespace || policy.namespace,
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

          nodes.set(id, {
            id,
            label,
            type,
            details,
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
            // Store a reference to the policy for cross-linking
            policies: [policy.name],
          });
        } else {
          // Update existing node to add this policy reference
          const node = nodes.get(id);
          if (!node.policies.includes(policy.name)) {
            node.policies.push(policy.name);
            // Update the detailText to show all policies that reference this node
            node.detailText += `\n\nReferenced by policies: ${node.policies.join(", ")}`;
          }
        }
      };

      // Process ingress rules
      policy.ingress.forEach((rule, ruleIndex) => {
        if (!rule) return;

        if (!rule.from || !Array.isArray(rule.from) || rule.from.length === 0) {
          // Allow from anywhere
          const anywhereId = `anywhere:ingress:${policy.namespace}:${policy.name}:${ruleIndex}`;
          addNode(anywhereId, "anywhere", { direction: "ingress" }, "ingress");
          links.push({
            source: anywhereId,
            target: sourceId,
            ports: rule.ports || "all",
            direction: "ingress",
            policy: policy.name,
            ruleIndex,
          });
        } else {
          rule.from.forEach((from, fromIndex) => {
            if (!from) return;

            let fromId;

            if (from.namespaceSelector && from.podSelector) {
              // Combined selector
              fromId = `combined:${policy.namespace}:${policy.name}:${ruleIndex}:${fromIndex}:${JSON.stringify(from.namespaceSelector)}:${JSON.stringify(from.podSelector)}`;
              addNode(
                fromId,
                "combined",
                {
                  namespace: from.namespaceSelector,
                  pod: from.podSelector,
                },
                "ingress",
              );
            } else if (from.namespaceSelector) {
              fromId = `namespace:${policy.namespace}:${policy.name}:${ruleIndex}:${fromIndex}:${JSON.stringify(from.namespaceSelector)}`;
              addNode(fromId, "namespace", from.namespaceSelector, "ingress");
            } else if (from.podSelector) {
              fromId = `pod:${policy.namespace}:${policy.name}:${ruleIndex}:${fromIndex}:${JSON.stringify(from.podSelector)}`;
              addNode(
                fromId,
                "pod",
                {
                  namespace: policy.namespace,
                  podSelector: from.podSelector,
                },
                "ingress",
              );
            } else if (from.ipBlock) {
              fromId = `ipBlock:${policy.namespace}:${policy.name}:${ruleIndex}:${fromIndex}:${from.ipBlock.cidr || "unknown"}`;
              addNode(fromId, "ipBlock", from.ipBlock, "ingress");
            }

            if (fromId) {
              links.push({
                source: fromId,
                target: sourceId,
                ports: rule.ports || "all",
                direction: "ingress",
                policy: policy.name,
                ruleIndex,
              });
            }
          });
        }
      });

      // Process egress rules
      policy.egress.forEach((rule, ruleIndex) => {
        if (!rule) return;

        if (!rule.to || !Array.isArray(rule.to) || rule.to.length === 0) {
          // Allow to anywhere
          const anywhereId = `anywhere:egress:${policy.namespace}:${policy.name}:${ruleIndex}`;
          addNode(anywhereId, "anywhere", { direction: "egress" }, "egress");
          links.push({
            source: sourceId,
            target: anywhereId,
            ports: rule.ports || "all",
            direction: "egress",
            policy: policy.name,
            ruleIndex,
          });
        } else {
          rule.to.forEach((to, toIndex) => {
            if (!to) return;

            let toId;

            if (to.namespaceSelector && to.podSelector) {
              // Combined selector
              toId = `combined:${policy.namespace}:${policy.name}:${ruleIndex}:${toIndex}:${JSON.stringify(to.namespaceSelector)}:${JSON.stringify(to.podSelector)}`;
              addNode(
                toId,
                "combined",
                {
                  namespace: to.namespaceSelector,
                  pod: to.podSelector,
                },
                "egress",
              );
            } else if (to.namespaceSelector) {
              toId = `namespace:${policy.namespace}:${policy.name}:${ruleIndex}:${toIndex}:${JSON.stringify(to.namespaceSelector)}`;
              addNode(toId, "namespace", to.namespaceSelector, "egress");
            } else if (to.podSelector) {
              toId = `pod:${policy.namespace}:${policy.name}:${ruleIndex}:${toIndex}:${JSON.stringify(to.podSelector)}`;
              addNode(
                toId,
                "pod",
                {
                  namespace: policy.namespace,
                  podSelector: to.podSelector,
                },
                "egress",
              );
            } else if (to.ipBlock) {
              toId = `ipBlock:${policy.namespace}:${policy.name}:${ruleIndex}:${toIndex}:${to.ipBlock.cidr || "unknown"}`;
              addNode(toId, "ipBlock", to.ipBlock, "egress");
            }

            if (toId) {
              links.push({
                source: sourceId,
                target: toId,
                ports: rule.ports || "all",
                direction: "egress",
                policy: policy.name,
                ruleIndex,
              });
            }
          });
        }
      });
    } catch (error) {
      console.error("Error processing policy:", error);
    }
  });

  // Second pass: Connect NetworkPolicies to each other based on selectors
  const policyPodSelectors = policies.map((policy) => ({
    policy,
    sourceId: `pod:${policy.namespace}:${JSON.stringify(policy.podSelector || {})}`,
  }));

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

  // Create links between policies that have matching selectors
  policies.forEach((policy) => {
    // Skip if no ingress or egress rules
    if (
      (!policy.ingress || policy.ingress.length === 0) &&
      (!policy.egress || policy.egress.length === 0)
    ) {
      return;
    }

    const policySourceId = `pod:${policy.namespace}:${JSON.stringify(policy.podSelector || {})}`;

    // Check ingress rules
    policy.ingress.forEach((rule, ruleIndex) => {
      if (!rule.from || !Array.isArray(rule.from)) return;

      rule.from.forEach((from, fromIndex) => {
        if (!from.podSelector) return;

        // Find policies whose pod selector matches this ingress rule's from.podSelector
        policyPodSelectors.forEach(
          ({ policy: otherPolicy, sourceId: otherSourceId }) => {
            // Skip self-references or cross-namespace (unless explicitly allowed)
            if (
              policy.name === otherPolicy.name ||
              (policy.namespace !== otherPolicy.namespace &&
                !from.namespaceSelector)
            ) {
              return;
            }

            // Check if the otherPolicy's podSelector matches the from.podSelector
            if (doesSelectorMatch(from.podSelector, otherPolicy.podSelector)) {
              // Create a cross-policy link
              const crossPolicyLinkId = `cross-policy:${policy.name}:${otherPolicy.name}:${ruleIndex}:${fromIndex}`;
              links.push({
                id: crossPolicyLinkId,
                source: otherSourceId,
                target: policySourceId,
                direction: "ingress",
                policy: `${otherPolicy.name} → ${policy.name}`,
                ports: rule.ports || "all",
                crossPolicy: true, // Mark as a cross-policy link
                combinedSelector: from.namespaceSelector && from.podSelector,
              });
            }
          },
        );
      });
    });

    // Check egress rules
    policy.egress.forEach((rule, ruleIndex) => {
      if (!rule.to || !Array.isArray(rule.to)) return;

      rule.to.forEach((to, toIndex) => {
        if (!to.podSelector) return;

        // Find policies whose pod selector matches this egress rule's to.podSelector
        policyPodSelectors.forEach(
          ({ policy: otherPolicy, sourceId: otherSourceId }) => {
            // Skip self-references or cross-namespace (unless explicitly allowed)
            if (
              policy.name === otherPolicy.name ||
              (policy.namespace !== otherPolicy.namespace &&
                !to.namespaceSelector)
            ) {
              return;
            }

            // Check if the otherPolicy's podSelector matches the to.podSelector
            if (doesSelectorMatch(to.podSelector, otherPolicy.podSelector)) {
              // Create a cross-policy link
              const crossPolicyLinkId = `cross-policy:${policy.name}:${otherPolicy.name}:${ruleIndex}:${toIndex}`;
              links.push({
                id: crossPolicyLinkId,
                source: policySourceId,
                target: otherSourceId,
                direction: "egress",
                policy: `${policy.name} → ${otherPolicy.name}`,
                ports: rule.ports || "all",
                crossPolicy: true, // Mark as a cross-policy link
                combinedSelector: to.namespaceSelector && to.podSelector,
              });
            }
          },
        );
      });
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    links,
  };
};
