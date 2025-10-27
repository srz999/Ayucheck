import AyurvedicQdrantChat from '../components/ayurvedic-qdrant-chat';

// Remove edge runtime - API route needs Node.js for fs/path
// export const runtime = 'edge';

export default function EmbeddingQdrantPage() {
  return <AyurvedicQdrantChat />;
}