# Security Policy

None.

## Security Best Practices for Deployment

### RBAC Configuration

The Kubernetes NetworkPolicy Visualizer requires read-only access to NetworkPolicy resources. By default, the Helm chart creates a ServiceAccount with the minimum required permissions. For production environments, consider:

- Using a dedicated namespace for the visualizer
- Restricting permissions to only specific namespaces if not all are needed
- Auditing RBAC permissions regularly

Example of minimal RBAC configuration:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: networkpolicy-visualizer-minimal
rules:
  - apiGroups: ["networking.k8s.io"]
    resources: ["networkpolicies"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]
```

### Network Security

1. **Use TLS**: Always configure TLS for the ingress when exposing the visualizer externally
2. **Internal Access Only**: Consider restricting access to internal networks only
3. **Implement NetworkPolicies**: Apply NetworkPolicies to the visualizer itself

Example NetworkPolicy to secure the visualizer:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: networkpolicy-visualizer-policy
  namespace: network-tools
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: networkpolicy-visualizer
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
        - ipBlock:
            cidr: 10.0.0.0/16 # Internal network CIDR
```

### Authentication and Authorization

While the NetworkPolicy Visualizer does not include built-in authentication, for production environments you should:

1. Implement authentication using one of these methods:

   - OAuth proxy (e.g., oauth2-proxy)
   - Kubernetes Dashboard-like authentication
   - Ingress controller authentication
   - Identity-aware proxy (IAP)

2. Restrict access to authorized personnel only

Example ingress with basic authentication:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: networkpolicy-visualizer
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
```

### Container Security

1. **Run as non-root**: The container already runs as a non-root user
2. **Read-only filesystem**: Enable read-only root filesystem when possible
3. **Resource limits**: Always set CPU and memory limits

Example values for secure deployment:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

### Secrets Management

1. **Do not store secrets in environment variables or config maps**
2. Use Kubernetes Secrets or external secrets managers
3. For cloud deployments, use cloud provider secret management services:
   - AWS Secrets Manager
   - GCP Secret Manager
   - Azure Key Vault

### Ingress Security

1. **Rate limiting**: Configure rate limiting on your ingress
2. **WAF protection**: Consider using a Web Application Firewall
3. **IP whitelisting**: Restrict access to specific IP ranges

Example ingress annotations for enhanced security:

```yaml
annotations:
  nginx.ingress.kubernetes.io/limit-connections: "10"
  nginx.ingress.kubernetes.io/limit-rps: "5"
  nginx.ingress.kubernetes.io/limit-rpm: "100"
  nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```
