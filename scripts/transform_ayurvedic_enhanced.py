#!/usr/bin/env python3
"""
Enhanced transformation script for Ayurvedic pharmacopoeia data
"""

import json
import re
from typing import Dict, List, Any

def extract_comprehensive_info(content: str) -> Dict[str, Any]:
    """Extract comprehensive herb information from content"""
    
    info = {
        "name": "",
        "botanical_name": "",
        "synonyms": {},
        "description": "",
        "properties": {},
        "therapeutic_uses": [],
        "dose": "",
        "formulations": [],
        "constituents": ""
    }
    
    # Extract herb name - look for numbered headings
    name_match = re.search(r'\d+\.\s*([A-Za-z\s]+?)(?:\s*\([^)]+\))?\s*\n', content)
    if name_match:
        info["name"] = name_match.group(1).strip()
    
    # Extract botanical name from the definition line
    botanical_match = re.search(r'consists of[^.]*?([A-Z][a-z]+\s+[a-z]+(?:\s+[A-Z][a-z]+)?)', content)
    if botanical_match:
        info["botanical_name"] = botanical_match.group(1)
    
    # Extract synonyms more carefully
    synonyms_section = re.search(r'SYNONYMS\s*\n(.*?)(?=\nDESCRIPTION|\nIDENTITY)', content, re.DOTALL)
    if synonyms_section:
        synonyms_text = synonyms_section.group(1)
        for line in synonyms_text.split('\n'):
            line = line.strip()
            if ':' in line and line:
                parts = line.split(':', 1)
                if len(parts) == 2:
                    lang = parts[0].strip()
                    names = parts[1].strip()
                    if names and names != '--' and names != '----':
                        info["synonyms"][lang] = names
    
    # Extract description
    desc_match = re.search(r'DESCRIPTION\s*\n(.*?)(?=IDENTITY|CONSTITUENTS|PROPERTIES)', content, re.DOTALL)
    if desc_match:
        desc_text = desc_match.group(1).strip()
        # Clean and summarize description
        cleaned_desc = re.sub(r'\s+', ' ', desc_text)
        info["description"] = cleaned_desc[:300]  # First 300 chars
    
    # Extract constituents
    constituents_match = re.search(r'CONSTITUENTS\s*[-–]\s*([^.\n]+)', content)
    if constituents_match:
        info["constituents"] = constituents_match.group(1).strip()
    
    # Extract Ayurvedic properties with more flexibility
    properties_section = re.search(r'PROPERTIES AND ACTION(.*?)(?=IMPORTANT FORMULATIONS|THERAPEUTIC USES)', content, re.DOTALL)
    if properties_section:
        props_text = properties_section.group(1)
        for prop in ['Rasa', 'Guna', 'Virya', 'Vipaka', 'Karma']:
            prop_pattern = rf'{prop}\s*:\s*([^:\n\r]+?)(?=\n\w+\s*:|$)'
            prop_match = re.search(prop_pattern, props_text, re.DOTALL)
            if prop_match:
                value = re.sub(r'\s+', ' ', prop_match.group(1).strip())
                info["properties"][prop] = value
    
    # Extract therapeutic uses with better pattern matching
    uses_patterns = [
        r'THERAPEUTIC USES\s*[-–]\s*([^.\n]+)',
        r'THERAPEUTIC USES\s*:\s*([^.\n]+)',
        r'Uses\s*[-–]\s*([^.\n]+)'
    ]
    
    for pattern in uses_patterns:
        uses_match = re.search(pattern, content)
        if uses_match:
            uses_text = uses_match.group(1).strip()
            # Split by commas and clean
            uses = []
            for use in re.split(r'[,，]', uses_text):
                use = use.strip()
                if use and len(use) > 2:
                    uses.append(use)
            info["therapeutic_uses"] = uses
            break
    
    # Extract dose with multiple patterns
    dose_patterns = [
        r'DOSE\s*[-–]\s*([^.\n]+)',
        r'DOSE\s*:\s*([^.\n]+)',
        r'Dose\s*[-–]\s*([^.\n]+)'
    ]
    
    for pattern in dose_patterns:
        dose_match = re.search(pattern, content)
        if dose_match:
            info["dose"] = dose_match.group(1).strip()
            break
    
    # Extract formulations
    form_patterns = [
        r'IMPORTANT FORMULATIONS\s*[-–]\s*([^.\n]+)',
        r'FORMULATIONS\s*[-–]\s*([^.\n]+)',
        r'IMPORTANT FORMULATIONS\s*:\s*([^.\n]+)'
    ]
    
    for pattern in form_patterns:
        form_match = re.search(pattern, content)
        if form_match:
            form_text = form_match.group(1).strip()
            formulations = []
            for form in re.split(r'[,，]', form_text):
                form = form.strip()
                if form and len(form) > 2:
                    formulations.append(form)
            info["formulations"] = formulations
            break
    
    return info

def create_enhanced_tips(herb_info: Dict[str, Any], page: int) -> List[Dict[str, Any]]:
    """Generate enhanced practical tips"""
    tips = []
    herb_name = herb_info["name"]
    
    if not herb_name:
        return tips
    
    # Herb overview tip
    overview = f"{herb_name}"
    if herb_info["botanical_name"]:
        overview += f" ({herb_info['botanical_name']})"
    
    if herb_info["description"]:
        overview += f" - {herb_info['description'][:150]}..."
    
    tip = {
        "type": "herb_overview",
        "herb": herb_name,
        "botanical_name": herb_info["botanical_name"],
        "content": overview,
        "synonyms": herb_info["synonyms"],
        "source_page": page,
        "category": "herb_identification"
    }
    tips.append(tip)
    
    # Therapeutic uses tips
    for use in herb_info["therapeutic_uses"]:
        if use and len(use) > 2:
            tip = {
                "type": "therapeutic_use",
                "herb": herb_name,
                "condition": use,
                "content": f"For {use.lower()}, traditional Ayurveda recommends {herb_name}.",
                "dose": herb_info["dose"],
                "source_page": page,
                "category": "treatment"
            }
            tips.append(tip)
    
    # Dosage tips
    if herb_info["dose"]:
        tip = {
            "type": "dosage_guide",
            "herb": herb_name,
            "content": f"Traditional dosage for {herb_name}: {herb_info['dose']}",
            "dose": herb_info["dose"],
            "source_page": page,
            "category": "dosage"
        }
        tips.append(tip)
    
    # Classical formulations
    for formulation in herb_info["formulations"]:
        if formulation and len(formulation) > 2:
            tip = {
                "type": "classical_formulation",
                "herb": herb_name,
                "formulation": formulation,
                "content": f"{herb_name} is used in {formulation}, a classical Ayurvedic preparation.",
                "source_page": page,
                "category": "formulations"
            }
            tips.append(tip)
    
    # Ayurvedic properties
    for prop_name, prop_value in herb_info["properties"].items():
        if prop_value:
            tip = {
                "type": "ayurvedic_property",
                "herb": herb_name,
                "property": prop_name,
                "value": prop_value,
                "content": f"{herb_name} - {prop_name}: {prop_value}",
                "source_page": page,
                "category": "properties"
            }
            tips.append(tip)
    
    # Constituents tip
    if herb_info["constituents"]:
        tip = {
            "type": "chemical_constituents",
            "herb": herb_name,
            "constituents": herb_info["constituents"],
            "content": f"{herb_name} contains: {herb_info['constituents']}",
            "source_page": page,
            "category": "chemistry"
        }
        tips.append(tip)
    
    return tips

def main():
    """Main transformation function"""
    
    # Load the raw structured data
    try:
        with open('/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/src/data/ayurcheck_api_vol1_pymupdf.json', 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
    except FileNotFoundError:
        print("❌ Could not find the raw JSON file")
        return
    
    all_tips = []
    processed_herbs = 0
    
    # Process raw text data from content array
    content_array = raw_data.get("content", [])
    for entry in content_array:
        content = entry.get("text", "")
        page = entry.get("page_number", 0)
        
        # Skip short entries or non-herb pages
        if len(content) < 800:
            continue
        
        # Look for herb monographs (numbered entries with synonyms)
        if not re.search(r'\d+\.\s*[A-Z]', content) or "SYNONYMS" not in content:
            continue
        
        # Extract herb information
        herb_info = extract_comprehensive_info(content)
        
        if not herb_info["name"] or len(herb_info["name"]) < 3:
            continue
        
        print(f"Processing: {herb_info['name']} (Page {page})")
        
        # Generate tips
        tips = create_enhanced_tips(herb_info, page)
        all_tips.extend(tips)
        processed_herbs += 1
    
    # Create statistics
    tip_types = {}
    categories = {}
    for tip in all_tips:
        tip_type = tip["type"]
        category = tip.get("category", "other")
        tip_types[tip_type] = tip_types.get(tip_type, 0) + 1
        categories[category] = categories.get(category, 0) + 1
    
    # Create output
    output = {
        "metadata": {
            "source": "Ayurvedic Pharmacopoeia of India - Volume 1",
            "transformation_date": "2024-12-19",
            "total_herbs_processed": processed_herbs,
            "total_tips": len(all_tips),
            "tip_types": tip_types,
            "categories": categories,
            "description": "Practical Ayurvedic tips extracted from classical pharmacopoeia for modern use"
        },
        "tips": all_tips
    }
    
    # Save the data
    output_file = '/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/src/data/ayurvedic_tips_enhanced.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Enhanced transformation complete!")
    print(f"📊 Processed {processed_herbs} herbs")
    print(f"📝 Generated {len(all_tips)} practical tips")
    print(f"📁 Output saved to: {output_file}")
    
    print("\n📈 Tip types:")
    for tip_type, count in tip_types.items():
        print(f"  • {tip_type.replace('_', ' ').title()}: {count}")
    
    print("\n📂 Categories:")
    for category, count in categories.items():
        print(f"  • {category.replace('_', ' ').title()}: {count}")

if __name__ == "__main__":
    main()