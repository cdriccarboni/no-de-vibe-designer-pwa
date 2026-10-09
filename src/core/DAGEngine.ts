export interface NodePort {
  id: string;
  type: 'event' | 'number' | 'vector' | 'texture';
  value: any;
}

export interface DAGNode {
  id: string;
  type: string;
  dirty: boolean;
  inputs: Record<string, NodePort>;
  outputs: Record<string, NodePort>;
  evaluate: () => void;
}

export interface Connection {
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

export class DAGEngine {
  private nodes: Map<string, DAGNode> = new Map();
  private connections: Connection[] = [];
  private executionOrder: string[] = [];
  private isStructureDirty: boolean = true;

  public registerNode(node: DAGNode): void {
    this.nodes.set(node.id, node);
    this.isStructureDirty = true;
  }

  public connect(connection: Connection): void {
    this.connections.push(connection);
    this.isStructureDirty = true;
  }

  public markDirty(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node || node.dirty) return;

    node.dirty = true;
    
    const downstreamConnections = this.connections.filter(c => c.fromNode === nodeId);
    for (const conn of downstreamConnections) {
      this.markDirty(conn.toNode);
    }
  }

  private rebuildExecutionOrder(): void {
    const inDegree: Map<string, number> = new Map();
    const adjacency: Map<string, string[]> = new Map();

    for (const nodeId of this.nodes.keys()) {
      inDegree.set(nodeId, 0);
      adjacency.set(nodeId, []);
    }

    for (const conn of this.connections) {
      adjacency.get(conn.fromNode)?.push(conn.toNode);
      inDegree.set(conn.toNode, (inDegree.get(conn.toNode) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(nodeId);
    }

    this.executionOrder = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      this.executionOrder.push(current);

      for (const neighbor of adjacency.get(current) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    this.isStructureDirty = false;
  }

  public tick(): void {
    if (this.isStructureDirty) {
      this.rebuildExecutionOrder();
    }

    for (const nodeId of this.executionOrder) {
      const node = this.nodes.get(nodeId);
      if (node && node.dirty) {
        const nodeInConns = this.connections.filter(c => c.toNode === nodeId);
        for (const conn of nodeInConns) {
          const sourceNode = this.nodes.get(conn.fromNode);
          if (sourceNode) {
            node.inputs[conn.toPort].value = sourceNode.outputs[conn.fromPort].value;
          }
        }

        node.evaluate();
        node.dirty = false;
      }
    }
  }
}
