// Helper function for displaying port text
export const getPortsText = (ports) => {
  if (!ports || ports === 'all') return 'All ports';
  
  return ports.map(p => {
    let portText = '';
    if (p.port !== undefined) {
      portText = p.port;
      if (p.endPort) {
        portText += `-${p.endPort}`;
      }
      if (p.protocol) {
        portText += `/${p.protocol}`;
      }
    } else {
      portText = JSON.stringify(p);
    }
    return portText;
  }).join(', ');
};
