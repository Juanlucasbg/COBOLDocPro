interface Point {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  fixed?: boolean;
  fx?: number; // Fixed x position
  fy?: number; // Fixed y position
  vx?: number; // Velocity x
  vy?: number; // Velocity y
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
}

interface LayoutOptions {
  width: number;
  height: number;
  iterations?: number;
  cooldown?: number;
  repulsiveForce?: number;
  attractiveForce?: number;
  dampening?: number;
  centerForce?: number;
}

interface HierarchicalLayoutOptions extends LayoutOptions {
  direction: 'top-down' | 'bottom-up' | 'left-right' | 'right-left';
  levelSeparation: number;
  nodeSeparation: number;
  rankSeparation: number;
}

interface CircularLayoutOptions extends LayoutOptions {
  radius: number;
  startAngle: number;
  endAngle: number;
  sortNodes?: boolean;
}

export class GraphLayoutEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();

  setNodes(nodes: GraphNode[]): void {
    this.nodes.clear();
    nodes.forEach(node => {
      this.nodes.set(node.id, { ...node });
    });
  }

  setEdges(edges: GraphEdge[]): void {
    this.edges.clear();
    edges.forEach(edge => {
      this.edges.set(edge.id, { ...edge });
    });
  }

  forceDirectedLayout(options: LayoutOptions): GraphNode[] {
    const {
      width,
      height,
      iterations = 300,
      cooldown = 0.95,
      repulsiveForce = 100,
      attractiveForce = 0.01,
      dampening = 0.8,
      centerForce = 0.1
    } = options;

    // Initialize positions if not set
    this.initializePositions(width, height);

    let temperature = Math.sqrt(width * height);

    for (let iteration = 0; iteration < iterations; iteration++) {
      // Reset forces
      this.nodes.forEach(node => {
        if (!node.fixed) {
          node.vx = 0;
          node.vy = 0;
        }
      });

      // Apply repulsive forces between all nodes
      this.applyRepulsiveForces(repulsiveForce);

      // Apply attractive forces along edges
      this.applyAttractiveForces(attractiveForce);

      // Apply center force
      this.applyCenterForce(width / 2, height / 2, centerForce);

      // Update positions
      this.updatePositions(temperature, dampening);

      // Cool down
      temperature *= cooldown;

      // Stop early if system has stabilized
      if (temperature < 0.1) break;
    }

    // Ensure nodes stay within bounds
    this.constrainToBounds(0, 0, width, height);

    return Array.from(this.nodes.values());
  }

  hierarchicalLayout(options: HierarchicalLayoutOptions): GraphNode[] {
    const {
      width,
      height,
      direction,
      levelSeparation,
      nodeSeparation,
      rankSeparation
    } = options;

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = this.findRootNodes();
    
    if (rootNodes.length === 0) {
      // If no clear roots, pick nodes with minimum incoming edges
      const nodeIncomingCount = this.calculateIncomingEdgeCounts();
      const minIncoming = Math.min(...Array.from(nodeIncomingCount.values()));
      rootNodes.push(...Array.from(nodeIncomingCount.entries())
        .filter(([_, count]) => count === minIncoming)
        .map(([nodeId, _]) => nodeId));
    }

    // Assign levels using BFS
    const levels = this.assignLevels(rootNodes);
    
    // Position nodes based on levels
    this.positionHierarchically(levels, direction, width, height, levelSeparation, nodeSeparation);

    return Array.from(this.nodes.values());
  }

  circularLayout(options: CircularLayoutOptions): GraphNode[] {
    const {
      width,
      height,
      radius,
      startAngle = 0,
      endAngle = 2 * Math.PI,
      sortNodes = false
    } = options;

    let nodeList = Array.from(this.nodes.values());

    if (sortNodes) {
      // Sort by number of connections
      nodeList.sort((a, b) => {
        const aConnections = this.getNodeConnections(a.id);
        const bConnections = this.getNodeConnections(b.id);
        return bConnections - aConnections;
      });
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const angleStep = (endAngle - startAngle) / nodeList.length;

    nodeList.forEach((node, index) => {
      const angle = startAngle + (index * angleStep);
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });

    return nodeList;
  }

  gridLayout(options: LayoutOptions): GraphNode[] {
    const { width, height } = options;
    const nodeList = Array.from(this.nodes.values());
    const nodeCount = nodeList.length;
    
    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const rows = Math.ceil(nodeCount / cols);
    
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    
    nodeList.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      node.x = (col + 0.5) * cellWidth;
      node.y = (row + 0.5) * cellHeight;
    });

    return nodeList;
  }

  private initializePositions(width: number, height: number): void {
    this.nodes.forEach(node => {
      if (node.x === undefined || node.y === undefined) {
        node.x = Math.random() * width;
        node.y = Math.random() * height;
      }
      if (node.vx === undefined) node.vx = 0;
      if (node.vy === undefined) node.vy = 0;
    });
  }

  private applyRepulsiveForces(repulsiveForce: number): void {
    const nodeList = Array.from(this.nodes.values());
    
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];
        
        if (nodeA.fixed && nodeB.fixed) continue;
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) continue;
        
        const force = repulsiveForce / (distance * distance);
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;
        
        if (!nodeA.fixed) {
          nodeA.vx -= forceX;
          nodeA.vy -= forceY;
        }
        
        if (!nodeB.fixed) {
          nodeB.vx += forceX;
          nodeB.vy += forceY;
        }
      }
    }
  }

  private applyAttractiveForces(attractiveForce: number): void {
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.get(edge.source);
      const targetNode = this.nodes.get(edge.target);
      
      if (!sourceNode || !targetNode) return;
      if (sourceNode.fixed && targetNode.fixed) return;
      
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance === 0) return;
      
      const weight = edge.weight || 1;
      const force = attractiveForce * distance * weight;
      const forceX = (dx / distance) * force;
      const forceY = (dy / distance) * force;
      
      if (!sourceNode.fixed) {
        sourceNode.vx += forceX;
        sourceNode.vy += forceY;
      }
      
      if (!targetNode.fixed) {
        targetNode.vx -= forceX;
        targetNode.vy -= forceY;
      }
    });
  }

  private applyCenterForce(centerX: number, centerY: number, centerForce: number): void {
    this.nodes.forEach(node => {
      if (node.fixed) return;
      
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      
      node.vx += dx * centerForce;
      node.vy += dy * centerForce;
    });
  }

  private updatePositions(temperature: number, dampening: number): void {
    this.nodes.forEach(node => {
      if (node.fixed) return;
      
      // Apply velocity with temperature scaling
      const velocity = Math.sqrt(node.vx! * node.vx! + node.vy! * node.vy!);
      if (velocity > 0) {
        const scale = Math.min(velocity, temperature) / velocity;
        node.x += node.vx! * scale;
        node.y += node.vy! * scale;
      }
      
      // Apply dampening
      node.vx! *= dampening;
      node.vy! *= dampening;
    });
  }

  private constrainToBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.nodes.forEach(node => {
      const margin = node.radius || 10;
      node.x = Math.max(minX + margin, Math.min(maxX - margin, node.x));
      node.y = Math.max(minY + margin, Math.min(maxY - margin, node.y));
    });
  }

  private findRootNodes(): string[] {
    const hasIncoming = new Set<string>();
    
    this.edges.forEach(edge => {
      hasIncoming.add(edge.target);
    });
    
    return Array.from(this.nodes.keys()).filter(nodeId => !hasIncoming.has(nodeId));
  }

  private calculateIncomingEdgeCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    
    this.nodes.forEach((_, nodeId) => {
      counts.set(nodeId, 0);
    });
    
    this.edges.forEach(edge => {
      const currentCount = counts.get(edge.target) || 0;
      counts.set(edge.target, currentCount + 1);
    });
    
    return counts;
  }

  private assignLevels(rootNodes: string[]): Map<number, string[]> {
    const levels = new Map<number, string[]>();
    const nodeLevel = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; level: number }> = [];
    
    // Initialize with root nodes
    rootNodes.forEach(nodeId => {
      queue.push({ nodeId, level: 0 });
      nodeLevel.set(nodeId, 0);
    });
    
    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      // Add to level
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(nodeId);
      
      // Add children to queue
      this.edges.forEach(edge => {
        if (edge.source === nodeId && !visited.has(edge.target)) {
          const targetLevel = Math.max(level + 1, nodeLevel.get(edge.target) || 0);
          nodeLevel.set(edge.target, targetLevel);
          queue.push({ nodeId: edge.target, level: targetLevel });
        }
      });
    }
    
    // Handle unvisited nodes (disconnected components)
    this.nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        const level = 0;
        if (!levels.has(level)) {
          levels.set(level, []);
        }
        levels.get(level)!.push(nodeId);
      }
    });
    
    return levels;
  }

  private positionHierarchically(
    levels: Map<number, string[]>,
    direction: string,
    width: number,
    height: number,
    levelSeparation: number,
    nodeSeparation: number
  ): void {
    const maxLevel = Math.max(...Array.from(levels.keys()));
    
    levels.forEach((nodeIds, level) => {
      const nodeCount = nodeIds.length;
      
      nodeIds.forEach((nodeId, index) => {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        let x: number, y: number;
        
        switch (direction) {
          case 'top-down':
            x = (width / (nodeCount + 1)) * (index + 1);
            y = (level * levelSeparation) + 50;
            break;
          case 'bottom-up':
            x = (width / (nodeCount + 1)) * (index + 1);
            y = height - ((level * levelSeparation) + 50);
            break;
          case 'left-right':
            x = (level * levelSeparation) + 50;
            y = (height / (nodeCount + 1)) * (index + 1);
            break;
          case 'right-left':
            x = width - ((level * levelSeparation) + 50);
            y = (height / (nodeCount + 1)) * (index + 1);
            break;
          default:
            x = (width / (nodeCount + 1)) * (index + 1);
            y = (level * levelSeparation) + 50;
        }
        
        node.x = x;
        node.y = y;
      });
    });
  }

  private getNodeConnections(nodeId: string): number {
    let connections = 0;
    
    this.edges.forEach(edge => {
      if (edge.source === nodeId || edge.target === nodeId) {
        connections++;
      }
    });
    
    return connections;
  }

  // Utility methods for graph analysis
  calculateBounds(): Bounds {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    this.nodes.forEach(node => {
      minX = Math.min(minX, node.x - (node.radius || 0));
      maxX = Math.max(maxX, node.x + (node.radius || 0));
      minY = Math.min(minY, node.y - (node.radius || 0));
      maxY = Math.max(maxY, node.y + (node.radius || 0));
    });
    
    return { minX, maxX, minY, maxY };
  }

  centerGraph(width: number, height: number): void {
    const bounds = this.calculateBounds();
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;
    
    const offsetX = (width - graphWidth) / 2 - bounds.minX;
    const offsetY = (height - graphHeight) / 2 - bounds.minY;
    
    this.nodes.forEach(node => {
      node.x += offsetX;
      node.y += offsetY;
    });
  }

  scaleToFit(width: number, height: number, padding: number = 50): void {
    const bounds = this.calculateBounds();
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;
    
    if (graphWidth === 0 || graphHeight === 0) return;
    
    const availableWidth = width - (2 * padding);
    const availableHeight = height - (2 * padding);
    
    const scaleX = availableWidth / graphWidth;
    const scaleY = availableHeight / graphHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    this.nodes.forEach(node => {
      node.x = (node.x - centerX) * scale + width / 2;
      node.y = (node.y - centerY) * scale + height / 2;
    });
  }

  detectNodeAtPosition(x: number, y: number): string | null {
    for (const [nodeId, node] of this.nodes) {
      const distance = Math.sqrt(
        Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
      );
      
      if (distance <= (node.radius || 10)) {
        return nodeId;
      }
    }
    
    return null;
  }

  getShortestPath(startId: string, endId: string): string[] | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();
    
    // Initialize
    this.nodes.forEach((_, nodeId) => {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    });
    
    distances.set(startId, 0);
    
    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode: string | null = null;
      let minDistance = Infinity;
      
      unvisited.forEach(nodeId => {
        const distance = distances.get(nodeId)!;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      });
      
      if (currentNode === null || minDistance === Infinity) break;
      
      unvisited.delete(currentNode);
      
      if (currentNode === endId) break;
      
      // Update distances to neighbors
      this.edges.forEach(edge => {
        let neighbor: string | null = null;
        
        if (edge.source === currentNode) {
          neighbor = edge.target;
        } else if (edge.target === currentNode) {
          neighbor = edge.source;
        }
        
        if (neighbor && unvisited.has(neighbor)) {
          const alt = distances.get(currentNode)! + (edge.weight || 1);
          if (alt < distances.get(neighbor)!) {
            distances.set(neighbor, alt);
            previous.set(neighbor, currentNode);
          }
        }
      });
    }
    
    // Reconstruct path
    if (distances.get(endId) === Infinity) {
      return null; // No path found
    }
    
    const path: string[] = [];
    let current: string | null = endId;
    
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current)!;
    }
    
    return path;
  }
}

// Utility functions
export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function calculateAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function interpolatePoints(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
  };
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

export function boundingBoxContains(bounds: Bounds, point: Point): boolean {
  return point.x >= bounds.minX && point.x <= bounds.maxX &&
         point.y >= bounds.minY && point.y <= bounds.maxY;
}

export type {
  Point,
  Bounds,
  GraphNode,
  GraphEdge,
  LayoutOptions,
  HierarchicalLayoutOptions,
  CircularLayoutOptions
};
