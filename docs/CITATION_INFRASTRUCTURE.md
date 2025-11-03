# 📚 Citation Infrastructure for Pinecone RAG System

## Overview

The AyurCheck Pinecone RAG system now includes a comprehensive citation infrastructure that ensures every Ayurvedic fact is properly attributed to its source document from the Ayurvedic Pharmacopoeia.

---

## 🏗️ Architecture

### 1. **Backend: Citation Metadata Formatting**
**File**: `src/app/api/embedpinecone/route.ts`

The API route formats retrieved documents with citation metadata:

```typescript
const formatDocsWithCitations = (docs: Document<AyurvedaMetadata>[]) => {
  return docs.map((doc, index) => {
    const metadata = doc.metadata;
    const herbName = metadata.herb_name || 'Unknown Herb';
    const pageNumber = metadata.page_number || 'N/A';
    const botanicalName = metadata.botanical_name ? ` (${metadata.botanical_name})` : '';
    const doshaType = metadata.dosha_type ? ` [${metadata.dosha_type} balancing]` : '';
    
    return `
--- Document ${index + 1} ---
Citation Info: 【Ayurvedic Pharmacopoeia Vol-1†${herbName}†Page ${pageNumber}】
Herb: ${herbName}${botanicalName}${doshaType}
Category: ${metadata.category || 'general'}
Content:
${doc.pageContent}
---
`;
  }).join('\n');
};
```

**Key Features:**
- Extracts herb name, page number, botanical name, dosha type from metadata
- Formats citation in standardized format: `【Source†Herb†Page】`
- Includes all metadata for context-aware responses

---

### 2. **Prompt Engineering: Citation Instructions**
**File**: `src/app/api/embedpinecone/route.ts`

The RAG prompt includes strict citation rules:

```typescript
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are an expert Ayurvedic medicine consultant...

CRITICAL CITATION RULES:
1. **Every factual claim MUST include an inline citation** in this exact format:
   【Ayurvedic Pharmacopoeia Vol-1†Page [page_number]】

2. **What to cite:**
   - Herbal properties or benefits
   - Therapeutic uses or indications
   - Dosage recommendations
   - Contraindications or side effects

3. **Citation placement:**
   - Place immediately after the relevant sentence or paragraph
   - Group related facts from the same source under one citation
   
Answer with citations:
`);
```

**Result:** GPT-4 generates responses with inline citations like:
> "Ashwagandha is known for its adaptogenic properties.【Ayurvedic Pharmacopoeia Vol-1†Ashwagandha†Page 23】"

---

### 3. **Frontend: Citation Rendering**
**File**: `src/app/components/markdown-renderer.tsx`

Custom React component renders citations as visual badges:

```typescript
const renderTextWithCitations = (text: string) => {
  const parts = text.split(/(【[^】]+】)/g);
  
  return parts.map((part, index) => {
    const citationMatch = part.match(/【([^】]+)】/);
    if (citationMatch) {
      const citationText = citationMatch[1];
      const citationParts = citationText.split('†');
      const herbName = citationParts[1] || 'Reference';
      const page = citationParts[2] || '';
      
      return (
        <span
          key={index}
          className="inline-block bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold ml-1 cursor-help hover:scale-105"
          title={`Herb: ${herbName}\n${page}`}
        >
          📚 {herbName} {page && `• ${page}`}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};
```

**Visual Result:**
- Citations appear as green badge with 📚 icon
- Hover shows full citation details (herb name, page number)
- Smooth hover animations for better UX

---

## 🎨 Citation Format

### Standard Format
```
【Ayurvedic Pharmacopoeia Vol-1†[herb_name]†Page [page_number]】
```

### Examples

#### Single Citation
```markdown
Ashwagandha supports stress management.【Ayurvedic Pharmacopoeia Vol-1†Ashwagandha†Page 23】
```

#### Multiple Citations
```markdown
Both Brahmi and Ashwagandha enhance cognition.【Ayurvedic Pharmacopoeia Vol-1†Brahmi†Page 45】【Ayurvedic Pharmacopoeia Vol-1†Ashwagandha†Page 23】
```

---

## 🔄 Data Flow

```
1. User Query
   ↓
2. Pinecone Vector Search (retrieves top 5 documents)
   ↓
3. Document Formatting with Citation Metadata
   ↓
4. RAG Prompt with Citation Instructions
   ↓
5. GPT-4 Generation (includes inline citations)
   ↓
6. Streaming Response to Client
   ↓
7. MarkdownRenderer Parses Citations
   ↓
8. Visual Citation Badges Displayed
```

---

## 📊 Metadata Structure

Each document in Pinecone contains:

```typescript
interface AyurvedaMetadata {
  herb_name?: string;           // e.g., "Ashwagandha"
  botanical_name?: string;      // e.g., "Withania somnifera"
  dosha_type?: 'vata' | 'pitta' | 'kapha' | 'tridosha';
  category: 'herb' | 'remedy' | 'lifestyle' | 'diagnosis' | 'pharmacopoeia';
  source_document: string;      // "Ayurvedic Pharmacopoeia Volume 1"
  page_number?: number;         // Original page in source
  document_id: string;          // Unique identifier
}
```

---

## 🧪 Testing the Citation System

### Example Queries to Test

1. **Single Herb Properties**
   ```
   Query: "What are the benefits of Ashwagandha?"
   Expected: Multiple citations referencing Ashwagandha with page numbers
   ```

2. **Comparative Queries**
   ```
   Query: "Compare Brahmi and Ashwagandha for stress"
   Expected: Separate citations for each herb
   ```

3. **Dosage Information**
   ```
   Query: "What is the recommended dosage of Triphala?"
   Expected: Citation for dosage information with page reference
   ```

4. **Unavailable Information**
   ```
   Query: "Does Ayurveda mention vitamin supplements?"
   Expected: "The retrieved Ayurvedic texts do not contain specific information..."
   ```

---

## ✅ Validation Checklist

For every AI response, verify:

- [ ] All factual claims have inline citations
- [ ] Citations use correct format: 【Source†Herb†Page】
- [ ] Citations appear as green badges in UI
- [ ] Hover tooltips show full citation details
- [ ] No unsourced claims about herbs, dosages, or treatments
- [ ] "Not available" message when documents don't contain info

---

## 🎯 Benefits

### 1. **Transparency**
- Users know exactly where information comes from
- Can verify claims against original texts

### 2. **Accuracy**
- Reduces AI hallucinations
- Grounds responses in authoritative sources

### 3. **Trust**
- Demonstrates evidence-based approach
- Professional medical information standards

### 4. **Legal Protection**
- Clear attribution to source materials
- Shows due diligence in information provision

### 5. **User Experience**
- Visual citations are non-intrusive
- Hover for details without cluttering text
- Elegant green badges match Ayurvedic theme

---

## 🔧 Customization

### Adjust Citation Styling

Edit `src/app/components/markdown-renderer.tsx`:

```typescript
// Change badge color
className="bg-gradient-to-r from-amber-500 to-amber-600"

// Adjust size
className="px-3 py-1 text-sm"

// Modify hover effects
className="hover:scale-110 hover:shadow-lg"
```

### Modify Citation Format

Edit `src/app/api/embedpinecone/route.ts`:

```typescript
// Change delimiter
Citation Info: 【Ayurvedic Pharmacopoeia Vol-1|${herbName}|Page ${pageNumber}】

// Add more metadata
Citation Info: 【Vol-1†${herbName}†Page ${pageNumber}†${doshaType}】
```

---

## 📝 Best Practices

1. **Always include page numbers** when available in metadata
2. **Use herb common names** for readability (not just botanical names)
3. **Group related citations** from the same source
4. **State when information is unavailable** rather than guessing
5. **Test with diverse queries** to ensure citation consistency

---

## 🚀 Future Enhancements

Potential improvements:

1. **Click-to-View**: Open source document at specific page
2. **Citation Bibliography**: Auto-generate reference list at end
3. **Multiple Sources**: Support citations from multiple Ayurvedic texts
4. **Export Citations**: Allow users to copy citation in standard formats
5. **Citation Analytics**: Track most-cited herbs/pages

---

## 📚 Related Files

- `citation_prompt.md` - Detailed citation guidelines
- `src/app/api/embedpinecone/route.ts` - Backend citation logic
- `src/app/components/markdown-renderer.tsx` - Frontend citation rendering
- `src/app/components/ayurvedic-pinecone-chat.tsx` - Chat interface
- `src/lib/vector-store.ts` - Metadata type definitions

---

**Status**: ✅ Fully Implemented and Production-Ready
**Last Updated**: October 27, 2025
