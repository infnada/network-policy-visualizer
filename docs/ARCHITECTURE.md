# Kubernetes NetworkPolicy Visualizer - Architecture

This document provides an in-depth look at the architecture of the Kubernetes NetworkPolicy Visualizer.

## Overview

The NetworkPolicy Visualizer is designed to provide a visual representation of Kubernetes NetworkPolicy resources, helping users understand the complex relationships between policies and their effects on cluster network traffic.

The application is built using a modern web stack with React for the frontend, D3.js for visualizations, and Node.js for the backend, with direct Kubernetes API integration.

## High-Level Architecture

```
┌─────────────────────────────────────┐
│                                     │
│            Web Browser              │
│                                     │
└───────────────────┬─────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│                                     │
│       NetworkPolicy Visualizer      │
│                                     │
│  ┌─────────────┐     ┌────────────┐ │
│  │   Frontend  │◄────►   Backend  │ │
│  │   (React)   │     │  (Node.js) │ │
│  └─────────────┘     └──────┬─────┘ │
│                             │       │
└─────────────────────────────┼───────┘
                              │
                              ▼
┌─────────────────────────────────────┐
│                                     │
│           Kubernetes API            │
│                                     │
└─────────────────────────────────────┘
```

## Component Breakdown

### Frontend Architecture

The frontend is built with React and uses several key libraries:

1. **D3.js** - Used for the core graph visualization
2. **TailwindCSS** - For styling and responsive design
3. **js-yaml** - For YAML parsing of NetworkPolicy resources
4. **Lodash** - For utility functions and data manipulation

#### Key Frontend Components:

- **NetworkPolicyVisualizer**: Main container component
- **Sidebar**: Controls for uploading, filtering, and managing policies
- **ClusterIntegration**: Handles loading policies from Kubernetes
- **GraphVisualization**: Renders the interactive network graph
- **PolicyDetails**: Shows detailed information about a selected policy
- **ThemeToggle**: Switches between light and dark themes

### Backend Architecture

The backend is a Node.js Express server that:

1. Serves the compiled React frontend
2. Provides API endpoints for accessing NetworkPolicy resources
3. Communicates with the Kubernetes API using the official Kubernetes client

#### Key Backend Components:

- **Express Server**: Handles HTTP requests and serves the application
- **Kubernetes Client**: Communicates with the Kubernetes API
- **API Routes**: Endpoints for fetching NetworkPolicy data
- **Static File Server**: Serves the compiled frontend assets

## Data Flow

### Loading Policies from Cluster

```
┌─────────┐     ┌───────────┐     ┌─────────────┐     ┌────────────┐
│ User    │     │ Frontend  │     │ Backend     │     │ Kubernetes │
│ Action  │──►  │ Request   │──►  │ API Request │──►  │ API        │
└─────────┘     └───────────┘     └─────────────┘     └──────┬─────┘
                                                             │
┌─────────┐     ┌───────────┐     ┌─────────────┐     ┌──────▼─────┐
│ Graph   │ ◄── │ Processed │ ◄── │ API         │ ◄── │ Raw Policy │
│ Display │     │ Graph Data│     │ Response    │     │ Data       │
└─────────┘     └───────────┘     └─────────────┘     └────────────┘
```

### File Upload Flow

```
┌─────────┐     ┌───────────┐     ┌─────────────┐     ┌────────────┐
│ User    │     │ File      │     │ Frontend    │     │ Parser     │
│ Upload  │──►  │ Selection │──►  │ File Reader │──►  │ (js-yaml)  │
└─────────┘     └───────────┘     └─────────────┘     └──────┬─────┘
                                                             │
┌─────────┐     ┌───────────┐     ┌─────────────┐     ┌──────▼─────┐
│ Graph   │ ◄── │ Processed │ ◄── │ Graph Data  │ ◄── │ Parsed     │
│ Display │     │ Graph Data│     │ Generator   │     │ Policies   │
└─────────┘     └───────────┘     └─────────────┘     └────────────┘
```

## Technical Details

### NetworkPolicy Processing

NetworkPolicy resources are processed in several steps:

1. **Parsing**: Converting YAML/JSON to structured objects
2. **Normalization**: Standardizing fields and handling defaults
3. **Graph Building**: Converting policies to graph structure with:
   - Nodes (pods, namespaces, IP blocks)
   - Links (ingress/egress rules)
4. **Cross-Policy Analysis**: Identifying relationships between different policies
5. **Visualization Preparation**: Adding visual attributes like colors, sizes, etc.

### Graph Visualization

The D3.js visualization uses a physics-based force simulation with:

1. **Force-Directed Layout**: Nodes repel each other while links pull connected nodes together
2. **Interactive Elements**:
   - Draggable nodes
   - Zoom and pan functionality
   - Hover effects for detailed information
   - Click actions for policy details
3. **Visual Encoding**:
   - Node shapes represent resource types (pods, namespaces, IP blocks)
   - Colors indicate policy types and relationships
   - Line styles show ingress/egress rules
   - Badges indicate when nodes are referenced by multiple policies

### Kubernetes Integration

When deployed in a Kubernetes cluster, the application uses:

1. **Service Account Authentication**: Uses the pod's service account to authenticate with the Kubernetes API
2. **RBAC Permissions**: Requires read access to NetworkPolicy resources
3. **API Queries**: Makes API calls to:
   - List all NetworkPolicies across namespaces
   - List NetworkPolicies in specific namespaces
   - Get detailed information about specific policies

## State Management

The application uses React's state management system with:

1. **Component State**: For UI elements and local component data
2. **Lifting State Up**: For sharing data between components
3. **Memoization**: For performance optimization of complex computations
4. **Effect Hooks**: For asynchronous operations and side effects

## Performance Considerations

To handle large clusters with many NetworkPolicies:

1. **Lazy Loading**: Policies are processed and rendered on demand
2. **Deduplication**: Similar nodes are combined to reduce visual complexity
3. **Filtering**: Users can filter policies to focus on specific resources
4. **Throttling**: API requests are throttled to prevent overwhelming the Kubernetes API
5. **Web Worker Processing**: Heavy computations are offloaded to web workers when available

## Security Architecture

The application is designed with security in mind:

1. **Read-Only Access**: The application only reads NetworkPolicy resources, never modifies them
2. **RBAC Limitations**: Service account permissions are limited to only the necessary resources
3. **No Sensitive Data**: The application doesn't process or display sensitive information
4. **Input Validation**: All user input is validated before processing
5. **Content Security Policy**: Restricts the types of content that can be loaded
6. **HTTPS Only**: Recommended to be served over HTTPS only

## Deployment Architecture

### Containerized Deployment

```
┌─────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                │
│                                                     │
│  ┌─────────────────┐       ┌────────────────────┐   │
│  │ Ingress         │       │ NetworkPolicy      │   │
│  │ Controller      │◄─────►│ Visualizer Pod     │   │
│  └─────────────────┘       └────────────┬───────┘   │
│                                         │           │
│                                         ▼           │
│                            ┌────────────────────┐   │
│                            │ Kubernetes API     │   │
│                            └────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Helm Chart Structure

```
helm/
├── Chart.yaml            # Chart metadata
├── values.yaml           # Default configuration values
├── templates/
│   ├── _helpers.tpl      # Template helpers
│   ├── deployment.yaml   # Main application deployment
│   ├── service.yaml      # Service for pod access
│   ├── ingress.yaml      # Optional ingress configuration
│   ├── serviceaccount.yaml # Service account for authentication
│   └── rbac.yaml         # RBAC resources for authorization
```

## Building & Development Process

### Build Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Source Code │───►│ Webpack     │───►│ Babel       │───►│ Minified    │
│ (React, JS) │    │ Bundling    │    │ Transpiling │    │ Bundle      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                               │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│ Docker      │◄───│ Server      │◄───│ Static      │◄────────┘
│ Image       │    │ Files       │    │ Assets      │
└─────────────┘    └─────────────┘    └─────────────┘
```

### CI/CD Process

The project uses GitHub Actions for CI/CD with:

1. **Pull Request Validation**: Linting, tests, and build verification
2. **Docker Image Building**: Automatic building and publishing of Docker images
3. **Helm Chart Packaging**: Validation and publishing of Helm charts
4. **Documentation Site**: Automatic generation and publishing of documentation

## Future Architecture Considerations

Planned architectural improvements include:

1. **Real-Time Updates**: WebSocket integration for live updates of policy changes
2. **Multi-Cluster Support**: Ability to visualize and compare policies across clusters
3. **Policy Simulation**: Ability to simulate the effect of new policies before applying them
4. **Enhanced Analysis**: Automated detection of potential issues or improvements
5. **Custom Resource Support**: Extending to support CRDs that implement similar networking functionality

## Appendix

### Dependency Graph

Key dependencies and their relationships:

```
react
├── react-dom
│   └── react-router-dom
├── d3
├── js-yaml
└── lodash

express
├── @kubernetes/client-node
└── cors
```

### Component Hierarchy

```
App
└── NetworkPolicyVisualizer
    ├── Sidebar
    │   ├── ClusterIntegration
    │   ├── NodeFilter
    │   └── DirectionFilter
    ├── GraphVisualization
    │   ├── GraphControlPanel
    │   ├── InfoPanel
    │   ├── NodeCountDisplay
    │   └── EmptyState
    ├── PolicyDetails
    └── ThemeToggle
```

This architecture document provides a comprehensive overview of the NetworkPolicy Visualizer's design, components, and technical considerations. It should be useful for both users looking to understand how the application works and developers looking to contribute to the project.
