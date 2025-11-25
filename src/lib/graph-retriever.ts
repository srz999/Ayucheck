import { GraphStore, GraphNode, GraphEdge } from './graph-store';

export class GraphRetriever {
    private graphStore: GraphStore;
    private initialized: boolean = false;

    constructor() {
        this.graphStore = new GraphStore();
    }

    async initialize() {
        if (!this.initialized) {
            await this.graphStore.load();
            this.initialized = true;
        }
    }

    /**
     * Extract entities from query by matching against graph nodes
     * (Case-insensitive partial match)
     */
    private extractEntities(query: string): GraphNode[] {
        const queryLower = query.toLowerCase();
        const allNodes = this.graphStore.getAllNodes();

        // Filter nodes that appear in the query
        // We prioritize longer matches to avoid false positives (e.g. "in" matching "Insulin")
        // and ensure the match is a distinct word or phrase
        return allNodes.filter(node => {
            const nodeLabel = node.id.toLowerCase();
            if (nodeLabel.length < 3) return false; // Skip very short labels
            return queryLower.includes(nodeLabel);
        });
    }

    /**
     * Retrieve graph context for a query
     */
    async retrieve(query: string): Promise<string> {
        await this.initialize();

        const entities = this.extractEntities(query);
        if (entities.length === 0) {
            return '';
        }

        let context = 'Knowledge Graph Context:\n';
        const visited = new Set<string>();

        for (const entity of entities) {
            if (visited.has(entity.id)) continue;
            visited.add(entity.id);

            const neighbors = this.graphStore.getNeighbors(entity.id);
            if (neighbors.length === 0) continue;

            context += `- ${entity.id} (${entity.type}):\n`;

            // Group neighbors by relation
            const relations: Record<string, string[]> = {};

            for (const edge of neighbors) {
                if (!relations[edge.relation]) {
                    relations[edge.relation] = [];
                }
                relations[edge.relation].push(edge.target);
            }

            for (const [relation, targets] of Object.entries(relations)) {
                // Limit to top 5 targets per relation to avoid context bloat
                const topTargets = targets.slice(0, 5).join(', ');
                context += `  - ${relation}: ${topTargets}\n`;
            }
        }

        return context;
    }
}
