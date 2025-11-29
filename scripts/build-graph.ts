import fs from 'fs/promises';
import path from 'path';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { GraphStore, GraphNode, GraphEdge } from '../src/lib/graph-store';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const GRAPH_FILE = path.join(DATA_DIR, 'knowledge_graph.json');

// Initialize Graph Store
const graphStore = new GraphStore(GRAPH_FILE);

// Initialize LLM
const llm = new ChatOpenAI({
    modelName: "gpt-4o", // Use a capable model for extraction
    temperature: 0,
    maxTokens: 2000,
});

const EXTRACTION_SYSTEM_PROMPT = `
You are an expert in Ayurveda and Knowledge Graph construction.
Your task is to extract entities and relationships from the provided text to build a knowledge graph.

Target Entities:
- Herb (e.g., Ashwagandha, Tulsi)
- Disease (e.g., Diabetes, Arthritis, Fever)
- Symptom (e.g., Pain, Inflammation, Cough)
- Dosha (Vata, Pitta, Kapha)
- Treatment (e.g., Panchakarma, Abhyanga)
- Property (e.g., Cooling, Heating)

Target Relationships:
- treats (Herb/Treatment -> Disease/Symptom)
- aggravates (Food/Lifestyle -> Dosha/Disease)
- pacifies (Herb/Treatment -> Dosha)
- causes (Factor -> Disease/Symptom)
- has_property (Herb -> Property)
- contains (Formulation -> Herb)

Output Format:
Return a JSON object with "nodes" and "edges".
Nodes should have "id", "type", and optional "properties".
Edges should have "source", "target", "relation".
Ensure IDs are consistent (e.g., use Title Case).

Example Output:
{
  "nodes": [
    { "id": "Ashwagandha", "type": "Herb" },
    { "id": "Stress", "type": "Symptom" },
    { "id": "Vata", "type": "Dosha" }
  ],
  "edges": [
    { "source": "Ashwagandha", "target": "Stress", "relation": "treats" },
    { "source": "Ashwagandha", "target": "Vata", "relation": "pacifies" }
  ]
}
`;

async function processFile(filename: string) {
    console.log(`Processing ${filename}...`);
    const filePath = path.join(DATA_DIR, filename);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        let documents: any[] = [];

        if (filename.endsWith('.json')) {
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
                documents = data;
            } else {
                // Handle different JSON structures if needed
                documents = [data];
            }
        } else if (filename.endsWith('.jsonl')) {
            const lines = content.split('\n').filter(line => line.trim() !== '');
            documents = lines.map(line => JSON.parse(line));
        }

        // Process a subset of documents to avoid excessive costs/time for this demo
        // In production, we would process all or use a more efficient pipeline
        const batchSize = 5;
        const maxDocs = 20; // Limit for demonstration

        for (let i = 0; i < Math.min(documents.length, maxDocs); i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const textChunk = batch.map((doc: any) => doc.pageContent || doc.content || JSON.stringify(doc)).join('\n\n');

            if (!textChunk.trim()) continue;

            console.log(`  Extracting from batch ${i / batchSize + 1}...`);

            try {
                const response = await llm.invoke([
                    new SystemMessage(EXTRACTION_SYSTEM_PROMPT),
                    new HumanMessage(`Extract entities and relationships from this text:\n\n${textChunk.substring(0, 15000)}`) // Limit input size
                ]);

                const content = response.content.toString();
                // Clean up markdown code blocks if present
                const jsonStr = content.replace(/```json\n?|\n?```/g, '');
                const result = JSON.parse(jsonStr);

                // Add to graph
                if (result.nodes) {
                    result.nodes.forEach((node: GraphNode) => graphStore.addNode(node));
                }
                if (result.edges) {
                    result.edges.forEach((edge: GraphEdge) => graphStore.addEdge(edge));
                }

                console.log(`    Extracted ${result.nodes?.length || 0} nodes and ${result.edges?.length || 0} edges.`);

            } catch (error) {
                console.error(`    Error extracting from batch ${i}:`, error);
            }
        }

    } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
    }
}

async function main() {
    // Load existing graph if available
    await graphStore.load();

    // Process key data files
    const filesToProcess = [
        'ayurcheck_rag.json',
        'ayu_skinDiseases_rag.json',
        'ayu_mentalDisorders_rag.json'
    ];

    for (const file of filesToProcess) {
        await processFile(file);
    }

    // Save updated graph
    await graphStore.save();
    console.log('Graph construction complete. Saved to knowledge_graph.json');
}

main().catch(console.error);
