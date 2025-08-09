import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw, 
  Download,
  Filter,
  Settings
} from "lucide-react";
import type { CobolProgram, Dependency } from "@shared/schema";

interface Node {
  id: string;
  name: string;
  type: 'main' | 'subroutine' | 'copybook' | 'jcl';
  x: number;
  y: number;
  radius: number;
  program?: CobolProgram;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: 'call' | 'copy' | 'data_flow' | 'control_flow';
  isCritical: boolean;
  isCircular: boolean;
}

interface DependencyGraphProps {
  data: { nodes: Node[]; edges: Edge[] };
  selectedNode: Node | null;
  onNodeSelect: (node: Node | null) => void;
  zoomLevel: number;
  layoutType: 'force' | 'hierarchical' | 'circular';
}

export default function DependencyGraph({ 
  data, 
  selectedNode, 
  onNodeSelect, 
  zoomLevel,
  layoutType
}: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);
  const [viewBox, setViewBox] = useState("0 0 800 600");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Colors for different node types
  const nodeColors = {
    main: '#2563eb',      // Blue
    subroutine: '#14b8a6', // Teal
    copybook: '#8b5cf6',   // Purple
    jcl: '#f59e0b'         // Yellow
  };

  // Colors for different edge types
  const edgeColors = {
    call: '#2563eb',       // Blue
    copy: '#8b5cf6',       // Purple
    data_flow: '#14b8a6',  // Teal
    control_flow: '#3b82f6' // Light Blue
  };

  const getNodeColor = (node: Node) => {
    if (selectedNode?.id === node.id) return '#ef4444'; // Red for selected
    if (hoveredNode?.id === node.id) return '#f59e0b'; // Yellow for hovered
    return nodeColors[node.type] || '#64748b';
  };

  const getEdgeColor = (edge: Edge) => {
    if (edge.isCritical) return '#ef4444'; // Red for critical
    if (hoveredEdge?.id === edge.id) return '#f59e0b'; // Yellow for hovered
    return edgeColors[edge.type] || '#64748b';
  };

  const getNodeRadius = (node: Node) => {
    const baseRadius = node.radius || 20;
    const scale = selectedNode?.id === node.id ? 1.3 : 
                 hoveredNode?.id === node.id ? 1.2 : 1;
    return baseRadius * scale;
  };

  const handleNodeClick = (node: Node) => {
    onNodeSelect(selectedNode?.id === node.id ? null : node);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // Update viewBox for panning
      const [x, y, width, height] = viewBox.split(' ').map(Number);
      const newX = x - deltaX / zoomLevel;
      const newY = y - deltaY / zoomLevel;
      setViewBox(`${newX} ${newY} ${width} ${height}`);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Zoom functionality would be handled by parent component
  };

  // Apply zoom to viewBox
  useEffect(() => {
    const baseWidth = 800;
    const baseHeight = 600;
    const scaledWidth = baseWidth / zoomLevel;
    const scaledHeight = baseHeight / zoomLevel;
    
    const [currentX, currentY] = viewBox.split(' ').map(Number);
    setViewBox(`${currentX} ${currentY} ${scaledWidth} ${scaledHeight}`);
  }, [zoomLevel]);

  return (
    <div className="w-full h-full relative bg-slate-900 rounded-lg overflow-hidden">
      {/* Graph Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-2 flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-slate-400 px-2">{Math.round(zoomLevel * 100)}%</span>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-1 flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Reset View"
          >
            <Maximize className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Reset Layout"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Node Information Tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 z-10 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg p-4 w-72">
          <h4 className="font-medium text-slate-100 mb-2">{hoveredNode.name}</h4>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Type:</span>
              <Badge variant="outline" className="text-xs">
                {hoveredNode.type.toUpperCase()}
              </Badge>
            </div>
            {hoveredNode.program && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lines of Code:</span>
                  <span>{hoveredNode.program.linesOfCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Complexity:</span>
                  <span className={hoveredNode.program.complexity > 50 ? 'text-red-400' : 'text-green-400'}>
                    {hoveredNode.program.complexity > 50 ? 'High' : 'Low'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Modified:</span>
                  <span>{new Date(hoveredNode.program.updatedAt).toLocaleDateString()}</span>
                </div>
              </>
            )}
          </div>
          <Button 
            size="sm" 
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
            onClick={() => handleNodeClick(hoveredNode)}
          >
            View Details
          </Button>
        </div>
      )}

      {/* Main SVG Graph */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox={viewBox}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Define arrow markers */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#64748b"
            />
          </marker>
          <marker
            id="arrowhead-critical"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#ef4444"
            />
          </marker>
        </defs>

        {/* Render edges */}
        <g className="edges">
          {data.edges.map((edge) => {
            const sourceNode = data.nodes.find(n => n.id === edge.source);
            const targetNode = data.nodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;

            return (
              <line
                key={edge.id}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={getEdgeColor(edge)}
                strokeWidth={edge.isCritical ? 3 : 2}
                strokeDasharray={edge.isCircular ? "5,5" : "none"}
                opacity={hoveredEdge?.id === edge.id ? 1 : 0.7}
                markerEnd={edge.isCritical ? "url(#arrowhead-critical)" : "url(#arrowhead)"}
                className="cursor-pointer transition-opacity duration-200"
                onMouseEnter={() => setHoveredEdge(edge)}
                onMouseLeave={() => setHoveredEdge(null)}
              />
            );
          })}
        </g>

        {/* Render nodes */}
        <g className="nodes">
          {data.nodes.map((node) => (
            <g key={node.id}>
              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={getNodeRadius(node)}
                fill={getNodeColor(node)}
                stroke={selectedNode?.id === node.id ? '#fff' : 'rgba(255,255,255,0.2)'}
                strokeWidth={selectedNode?.id === node.id ? 3 : 1}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node)}
              />
              
              {/* Node label */}
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="600"
                className="pointer-events-none select-none"
              >
                {node.name.length > 10 ? `${node.name.substring(0, 8)}...` : node.name}
              </text>
              
              {/* Type indicator */}
              {node.type !== 'main' && (
                <text
                  x={node.x}
                  y={node.y - getNodeRadius(node) - 5}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8"
                  className="pointer-events-none select-none"
                >
                  {node.type.toUpperCase()}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-100 mb-3">Legend</h4>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-slate-300">Main Programs</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
            <span className="text-slate-300">Subroutines</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-slate-300">Copybooks</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-red-500 rounded"></div>
            <span className="text-slate-300">Critical Dependencies</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-slate-400 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #64748b 2px, #64748b 4px)' }}></div>
            <span className="text-slate-300">Circular Dependencies</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No Dependencies to Display</h3>
            <p className="text-slate-400">Select a project or program to view its dependency graph.</p>
          </div>
        </div>
      )}
    </div>
  );
}
