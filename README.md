# Kubernetes NetworkPolicy Visualizer

An interactive web application for visualizing Kubernetes NetworkPolicy resources. This tool helps you understand the connectivity rules defined in your Kubernetes cluster by generating a visual graph representation.

## Features

- Upload YAML/JSON files containing NetworkPolicy resources
- Paste YAML content directly into the application
- Interactive visualization with D3.js
- Detailed policy information on hover
- Comprehensive policy details view
- Support for advanced NetworkPolicy features:
  - Pod and namespace selectors
  - matchLabels and matchExpressions
  - IP CIDR blocks
  - Combined namespace+pod selectors
  - Ingress and egress rules

## Installation

1. Clone the repository
```
git clone https://github.com/yourusername/k8s-network-policy-visualizer.git
cd k8s-network-policy-visualizer
```

2. Install dependencies
```
npm install
```

3. Start the development server
```
npm start
```

4. Open your browser to http://localhost:3000

## Using the Application

### Loading Network Policies
- **Upload Files**: Click on the upload area to select YAML/JSON files containing NetworkPolicy resources
- **Paste YAML**: Paste YAML content into the text area and click "Load Pasted Content"
- **Sample Data**: Click "Use Sample Data" to see a demonstration with example policies

### Interacting with the Visualization
- **Hover** over nodes or connections to see details
- **Drag** nodes to rearrange the layout
- **Scroll** to zoom in and out
- **Click** "Details" next to a policy name to see comprehensive information

## Project Structure

```
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── GraphVisualization.js   # D3.js visualization component
│   │   ├── NetworkPolicyVisualizer.js  # Main container component
│   │   ├── PolicyDetails.js        # Policy details modal
│   │   └── Sidebar.js              # Input and control sidebar
│   ├── utils/
│   │   ├── formatters.js           # Text formatting utilities
│   │   └── parsers.js              # YAML parsing and graph building
│   ├── App.js                      # Main application component
│   ├── index.css                   # Global styles 
│   └── index.js                    # Application entry point
├── package.json
├── webpack.config.js
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

## Building for Production

To create a production build:

```
npm run build
```

This will generate optimized files in the `dist` directory.

## License

MIT
