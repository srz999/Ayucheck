# Test Queries for Markdown Rendering

Use these queries to test the markdown rendering in the Pinecone chat interface:

## 🧪 Basic Formatting Tests

### Test 1: Lists and Emphasis
```
What are the benefits of Ashwagandha?
```
Expected: Should return bullet points with bold emphasis

### Test 2: Tables
```
Compare the three doshas in a table format
```
Expected: Should return a formatted table with Vata, Pitta, Kapha

### Test 3: Code Examples
```
Show me an example of Ayurvedic daily routine schedule
```
Expected: May include formatted schedules or lists

## 🌿 Ayurvedic Knowledge Queries

### Skin Diseases (from uploaded namespace)

```
What are the Ayurvedic guidelines for preventing skin diseases?
```

```
Explain the concept of Kushta in Ayurveda
```

```
What dietary recommendations does Ayurveda suggest for skin health?
```

```
Tell me about Dinacharya and its importance for skin care
```

```
What are the causes of skin disorders according to Ayurveda?
```

### Mental Health (from uploaded namespace)

```
How does Ayurveda approach mental health and psychiatric disorders?
```

```
What is Unmada in Ayurveda?
```

```
Explain the concept of Manas (mind) in Ayurvedic philosophy
```

```
What dietary recommendations help with mental health according to Ayurveda?
```

```
Tell me about Sattva, Rajas, and Tamas in mental health
```

```
What are the Sattvika foods for mental wellness?
```

## 📊 Complex Formatting Tests

### Test 4: Nested Lists
```
What are the steps in Panchakarma therapy?
```

### Test 5: Blockquotes
```
Give me an inspiring Ayurvedic quote about health
```

### Test 6: Multiple Sections
```
Provide a comprehensive guide to Ayurvedic lifestyle practices
```

## 🎯 Specific Knowledge Base Tests

### From Skin Diseases Data

```
What is Viruddha Ahara and how does it relate to skin diseases?
```

```
Explain the seven layers of skin according to Ayurveda
```

```
What are Mahakushta and Kshudra Kushta?
```

### From Mental Disorders Data

```
What is Prajnaparadha and its role in mental illness?
```

```
Explain the relationship between Ojas and mental health
```

```
What are the types of Unmada according to Ayurveda?
```

```
Describe Satvavajaya Chikitsa
```

## 🔍 Testing Tips

1. **Check headings**: Look for proper heading hierarchy (H1, H2, H3)
2. **Verify lists**: Ensure bullet points and numbered lists are properly formatted
3. **Inspect emphasis**: Bold and italic text should stand out
4. **Review tables**: If present, tables should have borders and proper spacing
5. **Code blocks**: Any code or schedules should be in monospace font with background
6. **Links**: Any references should be clickable and open in new tab

## 📝 Expected Response Format

A well-formatted response should include:

```markdown
# Main Topic

## Overview
Brief introduction paragraph...

## Key Points

- **Point 1**: Description
- **Point 2**: Description
- **Point 3**: Description

### Subsection

1. First item
2. Second item
3. Third item

## Additional Information

> Important note or quote

---

*Source: Ayurvedic texts*
```

## 🎨 Visual Indicators

✅ **Good**: Structured, easy to read, proper hierarchy
❌ **Poor**: Plain text, no formatting, hard to scan

## 💡 Advanced Queries

Try these for complex responses:

```
Create a daily routine schedule based on Ayurvedic principles with timing and activities
```

```
Compare treatments for Vata, Pitta, and Kapha imbalances in a detailed format
```

```
Provide a step-by-step guide to preparing Triphala tea with ingredients and benefits
```

## 🚀 Quick Test Sequence

1. Open: http://localhost:3000/embeddingpinecone
2. Wait for "Pinecone Connected" status
3. Try: "What are the benefits of Ashwagandha?"
4. Verify markdown formatting appears
5. Try: "Explain the three doshas"
6. Check for structured response
7. Try queries from uploaded data (skin/mental health)
8. Confirm proper formatting throughout

## 📊 Success Criteria

- ✅ Headings are bold and hierarchical
- ✅ Lists are properly indented with bullets/numbers
- ✅ Bold text is emphasized in green
- ✅ Code blocks have dark background
- ✅ Tables (if any) are formatted with borders
- ✅ Links are underlined and green
- ✅ Overall response is easy to read and scan
