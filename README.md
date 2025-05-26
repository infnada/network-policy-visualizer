# Kubernetes NetworkPolicy Visualizer

<div align="center">
  <img src="https://img.shields.io/github/license/infnada/k8s-network-policy-visualizer" alt="License" />
  <img src="https://img.shields.io/github/stars/infnada/k8s-network-policy-visualizer" alt="Stars" />
  <img src="https://img.shields.io/github/forks/infnada/k8s-network-policy-visualizer" alt="Forks" />
  <img src="https://img.shields.io/github/issues/infnada/k8s-network-policy-visualizer" alt="Issues" />
  <br />
  <img src="https://img.shields.io/github/actions/workflow/status/infnada/k8s-network-policy-visualizer/docker-build.yml?branch=main" alt="Build Status" />
  <img src="https://img.shields.io/docker/pulls/infnada/k8s-network-policy-visualizer" alt="Docker Pulls" />
  <img src="https://img.shields.io/github/v/release/infnada/k8s-network-policy-visualizer" alt="Release" />
</div>

<p align="center">
  <strong>Interactive visualization tool for Kubernetes NetworkPolicy resources</strong>
  <br>
  <i>Understand, analyze, and manage your Kubernetes network security with visual graphs</i>
</p>

<p align="center">
  <img src="docs/screenshot.png" alt="NetworkPolicy Visualizer Screenshot" width="800" />
</p>

## 🌟 Features

- **Visual Graph Representation**: Interactive visualization of NetworkPolicy connections with D3.js
- **Direct Cluster Integration**: Connect directly to your Kubernetes cluster to fetch policies
- **Import Options**: Upload YAML/JSON files or paste content directly
- **Advanced Filtering**: Filter by namespace, pod, policy type, or labels
- **Comprehensive Details**: View complete policy specifications with selectors, rules and ports
- **Interactive Exploration**: Hover, drag, zoom and click to explore the policy graph
- **Cross-Policy Connections**: Visualize how different policies interact with each other
- **Node Deduplication**: Option to combine identical selectors for cleaner visualization
- **No External Dependencies**: 100% client-side visualization with optional in-cluster deployment

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/infnada/k8s-network-policy-visualizer.git
cd k8s-network-policy-visualizer

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the application.

### Using Docker

```bash
# Pull the image
docker pull ghcr.io/infnada/k8s-network-policy-visualizer:latest

# Run the container
docker run -p 3000:3000 ghcr.io/infnada/k8s-network-policy-visualizer:latest
```

Visit [http://localhost:3000](http://localhost:3000) to use the application.

### Deploying to Kubernetes with Helm

```bash
# Add the Helm repository
helm repo add k8s-npv https://infnada.github.io/k8s-network-policy-visualizer
helm repo update

# Install the chart
helm install networkpolicy-visualizer k8s-npv/networkpolicy-visualizer
```

For more detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 💡 Usage

### Loading Network Policies

There are three ways to load NetworkPolicy resources:

1. **Load from Cluster**: Connect directly to your cluster (requires appropriate RBAC permissions)
2. **Upload Files**: Upload YAML or JSON files containing NetworkPolicy resources
3. **Paste YAML/JSON**: Paste NetworkPolicy content directly into the application

### Visualizing Policies

Once loaded, you can:

- **Zoom and Pan**: Use mouse wheel to zoom and drag to pan the view
- **Hover over Nodes/Links**: View detailed information in tooltips
- **Drag Nodes**: Rearrange the layout to better visualize connections
- **Policy Details**: Click "Details" next to a policy name for complete information
- **Filter Policies**: Use the filtering options to focus on specific resources
- **Change Theme**: Toggle between light and dark themes

### Understanding the Visualization

The visualization shows different types of resources:

- **Blue Circles**: Pod selectors
- **Green Squares**: Namespace selectors
- **Orange Diamonds**: IP Blocks
- **Purple Diamonds**: Combined namespace+pod selectors
- **Red Lines**: Ingress rules (traffic flowing in)
- **Green Lines**: Egress rules (traffic flowing out)

## 🔧 Configuration

The application supports several configuration options:

### Environment Variables

| Variable     | Description                                              | Default       |
| ------------ | -------------------------------------------------------- | ------------- |
| `PORT`       | Port for the server to listen on                         | `3000`        |
| `NODE_ENV`   | Environment mode (production/development)                | `development` |
| `KUBECONFIG` | Path to kubeconfig file (if not using in-cluster config) | ``            |

### Helm Chart Values

See [values.yaml](helm/values.yaml) for a complete list of configuration options.

## 🔍 How It Works

### Architecture

The application consists of:

1. **Backend API**: Node.js Express server that communicates with the Kubernetes API
2. **Frontend Application**: React+D3.js application for interactive visualization
3. **Kubernetes Integration**: Uses the official Kubernetes client for Node.js

### Visualization Logic

The visualization process involves:

1. **Policy Parsing**: Converting raw NetworkPolicy objects into graph data
2. **Graph Building**: Creating a network graph with nodes and links
3. **Force Simulation**: Using D3.js physics-based simulation for optimal layout
4. **Interactive Rendering**: Adding user interaction and dynamic updates
5. **Cross-policy Analysis**: Identifying connections between different policies

For technical details, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 📚 Documentation

- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Considerations](docs/SECURITY.md)

### Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For information about security policies and procedures, see [SECURITY.md](docs/SECURITY.md).

## 📊 Roadmap

- [ ] Export visualization as SVG/PNG
- [ ] Support for custom CRDs with similar network policy functionality
- [ ] Policy validation and recommendations
- [ ] Multi-cluster support
- [ ] Historical policy comparison
- [ ] Custom layout algorithms
