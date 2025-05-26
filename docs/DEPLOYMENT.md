# Kubernetes NetworkPolicy Visualizer Deployment Guide

This document provides comprehensive instructions for deploying the Kubernetes NetworkPolicy Visualizer in various environments.

## Table of Contents

- [Deployment Options](#deployment-options)
- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
  - [Using Helm](#using-helm)
  - [Using kubectl](#using-kubectl)
- [Cloud Provider Specific Deployment](#cloud-provider-specific-deployment)
  - [Amazon EKS](#amazon-eks)
  - [Google GKE](#google-gke)
  - [Azure AKS](#azure-aks)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Upgrading](#upgrading)
- [Uninstalling](#uninstalling)

## Deployment Options

The NetworkPolicy Visualizer can be deployed in several ways:

1. **Local Deployment**: Run directly on your local machine for development or individual use
2. **Docker Deployment**: Run as a Docker container
3. **Kubernetes Deployment**: Deploy as a pod within your Kubernetes cluster
4. **Cloud Provider Specific**: Deployment optimized for specific cloud providers

## Prerequisites

- For local deployment: Node.js v14+
- For Docker deployment: Docker v20+
- For Kubernetes deployment: Kubernetes v1.16+, Helm v3+ (optional)
- Access to a Kubernetes cluster with NetworkPolicies

## Docker Deployment

### Building the Docker Image

```bash
# Clone the repository
git clone https://github.com/infnada/k8s-network-policy-visualizer.git
cd k8s-network-policy-visualizer

# Build the image
docker build -t networkpolicy-visualizer:latest .
```

### Running the Docker Container

```bash
# Run with kubeconfig mounting (for accessing a cluster)
docker run -p 3000:3000 -v ~/.kube/config:/app/.kube/config:ro networkpolicy-visualizer:latest

# Or run standalone (only file upload & paste functionality will work)
docker run -p 3000:3000 networkpolicy-visualizer:latest
```

### Using a Pre-built Image

```bash
# Pull from GitHub Container Registry
docker pull ghcr.io/infnada/k8s-network-policy-visualizer:latest

# Run the container
docker run -p 3000:3000 ghcr.io/infnada/k8s-network-policy-visualizer:latest
```

## Kubernetes Deployment

### Using Helm

The recommended way to deploy the NetworkPolicy Visualizer is using the Helm chart.

#### Add the Helm Repository

```bash
helm repo add k8s-npv https://infnada.github.io/k8s-network-policy-visualizer
helm repo update
```

#### Install the Chart

```bash
# Install with default values
helm install networkpolicy-visualizer k8s-npv/networkpolicy-visualizer

# Install in a specific namespace
helm install networkpolicy-visualizer k8s-npv/networkpolicy-visualizer --namespace network-tools --create-namespace

# Install with custom values
helm install networkpolicy-visualizer k8s-npv/networkpolicy-visualizer -f my-values.yaml
```

#### Helm Chart Configuration

You can customize the deployment by creating a values file. Here's an example:

```yaml
# my-values.yaml
replicaCount: 2

image:
  repository: ghcr.io/infnada/k8s-network-policy-visualizer
  tag: latest
  pullPolicy: Always

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: netpol.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: netpol-tls
      hosts:
        - netpol.example.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

rbac:
  create: true
  # Restrict to specific namespaces if needed
  extraRules:
    - apiGroups: [""]
      resources: ["namespaces"]
      verbs: ["get", "list"]
```

### Using kubectl

You can also deploy without Helm using plain Kubernetes manifests:

```bash
# Clone the repository
git clone https://github.com/infnada/k8s-network-policy-visualizer.git
cd k8s-network-policy-visualizer

# Apply the manifests
kubectl apply -f kubernetes/
```

## Cloud Provider Specific Deployment

### Amazon EKS

For deployment on Amazon EKS, follow these additional steps:

#### 1. Create an ECR Repository

```bash
# Set your AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-west-2

# Create ECR repository
aws ecr create-repository --repository-name networkpolicy-visualizer --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --infnada AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push the image
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/networkpolicy-visualizer:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/networkpolicy-visualizer:latest
```

#### 2. Deploy using Helm with EKS-specific values

```yaml
# eks-values.yaml
image:
  repository: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/networkpolicy-visualizer
  tag: latest
  pullPolicy: Always

service:
  type: ClusterIP

ingress:
  enabled: true
  className: alb
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/group.name: network-tools
    alb.ingress.kubernetes.io/ssl-redirect: "443"
  hosts:
    - host: netpol.example.com
      paths:
        - path: /
          pathType: Prefix

serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::${AWS_ACCOUNT_ID}:role/networkpolicy-visualizer-role
```

```bash
# Deploy with EKS-specific values
helm install networkpolicy-visualizer k8s-npv/networkpolicy-visualizer -f eks-values.yaml
```

#### 3. Set up IAM Role for Service Account (IRSA)

If you're using IAM roles for service accounts (recommended):

```bash
# Create the IAM policy
cat > networkpolicy-visualizer-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:BatchCheckLayerAvailability"
            ],
            "Resource": "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/networkpolicy-visualizer"
        }
    ]
}
EOF

# Create IAM policy
aws iam create-policy \
    --policy-name NetworkPolicyVisualizerPolicy \
    --policy-document file://networkpolicy-visualizer-policy.json

# Create IAM role and associate with service account
eksctl create iamserviceaccount \
    --name networkpolicy-visualizer \
    --namespace default \
    --cluster your-cluster-name \
    --attach-policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/NetworkPolicyVisualizerPolicy \
    --approve \
    --override-existing-serviceaccounts
```

### Google GKE

For deployment on Google Kubernetes Engine:

#### 1. Create a GCP Artifact Registry repository

```bash
# Set your GCP project ID and region
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1

# Create Artifact Registry repository
gcloud artifacts repositories create networkpolicy-visualizer \
    --repository-format=docker \
    --location=$REGION \
    --description="Repository for NetworkPolicy Visualizer"

# Configure Docker for authentication
gcloud auth configure-docker $REGION-docker.pkg.dev

# Build and push the image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/networkpolicy-visualizer/networkpolicy-visualizer:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/networkpolicy-visualizer/networkpolicy-visualizer:latest
```

#### 2. Deploy using Helm with GKE-specific values

```yaml
# gke-values.yaml
image:
  repository: us-central1-docker.pkg.dev/your-project-id/networkpolicy-visualizer/networkpolicy-visualizer
  tag: latest

service:
  type: ClusterIP

ingress:
  enabled: true
  className: gce
  annotations:
    kubernetes.io/ingress.global-static-ip-name: networkpolicy-visualizer-ip
    networking.gke.io/managed-certificates: networkpolicy-visualizer-cert
  hosts:
    - host: netpol.example.com
      paths:
        - path: /
          pathType: Prefix

# Create a GKE BackendConfig for advanced features
backendConfig:
  enabled: true
  spec:
    securityPolicy: network-policy-visualizer-security-policy
    cdn:
      enabled: false
    sessionAffinity:
      affinityType: "GENERATED_COOKIE"
      affinityCookieTtlSec: 3600
```

```bash
# Deploy with GKE-specific values
helm install networkpolicy-visualizer k8s-npv/networkpolicy-visualizer -f gke-values.yaml
```

#### 3. Create a managed certificate (optional)

```bash
# Create a managed certificate
cat <<EOF | kubectl apply -f -
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: networkpolicy-visualizer-cert
spec:
  domains:
  - netpol.example.com
EOF
```

### Azure AKS

For deployment on Azure Kubernetes Service:

#### 1. Create an Azure Container Registry

```bash
# Set variables
RESOURCE_GROUP=myResourceGroup
ACR_NAME=networkpolicyvisualizeracr
LOCATION=eastus

# Create resource group if it doesn't exist
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create ACR
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic

# Login to ACR
az acr login --name $ACR_NAME

# Build and push the image
docker build -t $ACR_NAME.azurecr.io/networkpolicy-visualizer:latest .
docker push $ACR_NAME.azurecr.io/networkpolicy-visualizer:latest
```

#### 2. Attach ACR to AKS

```bash
# Get AKS cluster name
AKS_CLUSTER_NAME=myAKSCluster

# Attach ACR to AKS
az aks update -n $AKS_CLUSTER_NAME -g $RESOURCE_GROUP --attach-acr $ACR_NAME
```

#### 3. Deploy using Helm with AKS-specific values

```yaml
# aks-values.yaml
image:
  repository: networkpolicyvisualizeracr.azurecr.io/networkpolicy-visualizer
  tag: latest

service:
  type: ClusterIP

ingress:
  enabled: true
  className: azure-application-gateway
  annotations:
    appgw.ingress.kubernetes.io/backend-path-prefix: /
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: netpol.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: netpol-tls-secret
      hosts:
        - netpol.example.com
```

```bash
# Deploy with AKS-specific values
helm install networkpolicy-visualizer k8s-npv/networkpolicy-visualizer -f aks-values.yaml
```

## Security Considerations

### RBAC Permissions

The NetworkPolicy Visualizer requires RBAC permissions to read NetworkPolicy resources. By default, it has permissions to read NetworkPolicies in all namespaces. For production environments, consider restricting access:

```yaml
# Restricted RBAC values
rbac:
  create: true
  clusterWide: false # Set to false to restrict to specific namespaces
  namespaces:
    - default
    - kube-system
    - network-policies
```

### Securing Access to the Application

For production deployments, consider:

1. **Authentication**: Set up an authentication proxy or use OAuth/OIDC
2. **HTTPS**: Always use TLS for public endpoints
3. **Network Policies**: Apply NetworkPolicies to restrict access to the visualizer itself
4. **Resource Limits**: Set appropriate CPU and memory limits

Example NetworkPolicy for the visualizer:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: networkpolicy-visualizer
  namespace: network-tools
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: networkpolicy-visualizer
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-controller
        - ipBlock:
            cidr: 10.0.0.0/16 # Internal network
```

## Troubleshooting

### Common Issues

#### Pod Fails to Start

Check the pod logs:

```bash
kubectl logs -l app.kubernetes.io/name=networkpolicy-visualizer
```

Common issues:

- Image pull errors: Check registry credentials
- Permission errors: Check RBAC configuration

#### Cannot Access Web Interface

1. Verify the service is running:

   ```bash
   kubectl get svc -l app.kubernetes.io/name=networkpolicy-visualizer
   ```

2. Check ingress configuration:

   ```bash
   kubectl get ingress -l app.kubernetes.io/name=networkpolicy-visualizer
   ```

3. Port-forward for direct testing:
   ```bash
   kubectl port-forward svc/networkpolicy-visualizer 8080:80
   ```

#### Cannot Load Policies from Cluster

1. Check RBAC permissions:

   ```bash
   kubectl auth can-i get networkpolicies --all-namespaces
   ```

2. Verify NetworkPolicies exist:
   ```bash
   kubectl get networkpolicies --all-namespaces
   ```

## Upgrading

### Upgrading with Helm

```bash
# Update the repository
helm repo update

# Upgrade the deployment
helm upgrade networkpolicy-visualizer k8s-npv/networkpolicy-visualizer

# Upgrade with custom values
helm upgrade networkpolicy-visualizer k8s-npv/networkpolicy-visualizer -f my-values.yaml
```

### Manual Image Update

If you're not using Helm:

```bash
# Update the deployment with a new image
kubectl set image deployment/networkpolicy-visualizer networkpolicy-visualizer=ghcr.io/infnada/k8s-network-policy-visualizer:v1.1.0
```

## Uninstalling

### Using Helm

```bash
# Uninstall the release
helm uninstall networkpolicy-visualizer
```

### Using kubectl

```bash
# Delete all resources
kubectl delete all -l app.kubernetes.io/name=networkpolicy-visualizer

# Delete RBAC resources
kubectl delete serviceaccount -l app.kubernetes.io/name=networkpolicy-visualizer
kubectl delete clusterrole -l app.kubernetes.io/name=networkpolicy-visualizer
kubectl delete clusterrolebinding -l app.kubernetes.io/name=networkpolicy-visualizer
```

## Advanced Deployment Scenarios

### Air-gapped Environments

For environments without internet access:

1. Build and save the Docker image:

   ```bash
   docker build -t networkpolicy-visualizer:latest .
   docker save -o networkpolicy-visualizer.tar networkpolicy-visualizer:latest
   ```

2. Transfer the image to the air-gapped environment and load it:

   ```bash
   docker load -i networkpolicy-visualizer.tar
   ```

3. Tag and push to the internal registry:

   ```bash
   docker tag networkpolicy-visualizer:latest internal-registry.example.com/networkpolicy-visualizer:latest
   docker push internal-registry.example.com/networkpolicy-visualizer:latest
   ```

4. Update Helm values to use the internal registry

### High Availability Setup

For production environments requiring high availability:

```yaml
# ha-values.yaml
replicaCount: 3

podDisruptionBudget:
  enabled: true
  minAvailable: 2

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - networkpolicy-visualizer
          topologyKey: "kubernetes.io/hostname"
```

## Performance Tuning

For large clusters with many NetworkPolicies:

```yaml
# performance-values.yaml
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi

env:
  NODE_OPTIONS: "--max-old-space-size=1536"
```

For any other questions or issues, please refer to the [GitHub repository](https://github.com/infnada/k8s-network-policy-visualizer) or create an issue.

