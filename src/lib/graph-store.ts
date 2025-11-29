import fs from 'fs/promises';
import path from 'path';

export interface GraphNode {
    id: string;
    type: string; // e.g., 'Herb', 'Disease', 'Symptom', 'Dosha'
    properties?: Record<string, any>;
}

export interface GraphEdge {
    source: string;
    target: string;
    relation: string; // e.g., 'treats', 'aggravates'
    weight?: number;
}

export interface GraphData {
    nodes: Record<string, GraphNode>;
    edges: GraphEdge[];
}

export class GraphStore {
    private nodes: Map<string, GraphNode>;
    private edges: GraphEdge[];
    private adjacencyList: Map<string, GraphEdge[]>;
    private filePath: string;

    constructor(filePath?: string) {
        this.nodes = new Map();
        this.edges = [];
        this.adjacencyList = new Map();
        this.filePath = filePath || path.join(process.cwd(), 'src', 'data', 'knowledge_graph.json');
    }

    addNode(node: GraphNode): void {
        if (!this.nodes.has(node.id)) {
            this.nodes.set(node.id, node);
        }
    }

    addEdge(edge: GraphEdge): void {
        this.edges.push(edge);

        // Update adjacency list for source
        if (!this.adjacencyList.has(edge.source)) {
            this.adjacencyList.set(edge.source, []);
        }
        this.adjacencyList.get(edge.source)?.push(edge);

        // Update adjacency list for target (undirected traversal support)
        // We store it as an incoming edge if needed, or just rely on the fact that
        // for traversal we might want to know who points to us too.
        // For now, let's keep it directed in the main list, but maybe useful to have reverse lookup?
        // Let's stick to simple directed for now, but often knowledge graphs are traversed both ways.
        // Adding reverse edge to adjacency for easier traversal:
        if (!this.adjacencyList.has(edge.target)) {
            this.adjacencyList.set(edge.target, []);
        }
        // Mark reverse edge with a special flag or just know it's incoming?
        // For simplicity in this lightweight version, we'll add it as a "related" connection
        // but keep the original relation direction in the edge object.
        this.adjacencyList.get(edge.target)?.push({
            source: edge.target,
            target: edge.source,
            relation: `related_to_${edge.relation}`, // simplistic reverse relation
            weight: edge.weight
        });
    }

    getNeighbors(nodeId: string): GraphEdge[] {
        return this.adjacencyList.get(nodeId) || [];
    }

    getNode(nodeId: string): GraphNode | undefined {
        return this.nodes.get(nodeId);
    }

    getAllNodes(): GraphNode[] {
        return Array.from(this.nodes.values());
    }

    async save(): Promise<void> {
        const data: GraphData = {
            nodes: Object.fromEntries(this.nodes),
            edges: this.edges
        };
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }

    async load(): Promise<void> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8');
            const parsed: GraphData = JSON.parse(data);

            this.nodes = new Map(Object.entries(parsed.nodes));
            this.edges = parsed.edges;

            // Rebuild adjacency list
            this.adjacencyList.clear();
            for (const edge of this.edges) {
                // Source -> Target
                if (!this.adjacencyList.has(edge.source)) {
                    this.adjacencyList.set(edge.source, []);
                }
                this.adjacencyList.get(edge.source)?.push(edge);

                // Target -> Source (Reverse)
                if (!this.adjacencyList.has(edge.target)) {
                    this.adjacencyList.set(edge.target, []);
                }
                this.adjacencyList.get(edge.target)?.push({
                    source: edge.target,
                    target: edge.source,
                    relation: `related_to_${edge.relation}`,
                    weight: edge.weight
                });
            }
        } catch (error) {
            console.warn(`Could not load graph from ${this.filePath}. Starting with empty graph.`);
        }
    }
}
