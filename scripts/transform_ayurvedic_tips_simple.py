#!/usr/bin/env python3
"""
Transform extracted Ayurvedic pharmacopoeia data into practical tips format (simplified version)
"""

import json
import re
from typing import Dict, List, Any

def extract_basic_info(content: str) -> Dict[str, Any]:
    """Extract basic herb information from content"""
    
    info = {
        "name": "",
        "botanical_name": "",
        "synonyms": {},
        "description": "",
        "properties": {},
        "therapeutic_uses": [],
        "dose": "",
        "formulations": []
    }
    
    # Extract herb name and botanical name from header
    header_match = re.search(r'^\d+\.\s*([A-Z][^(]+)(?:\([^)]+\))?\s*\n([A-Z][^\\n]+)\s*\n([^\\n]+consists of[^\\n]+)', content, re.MULTILINE)
    if header_match:
        info["name"] = header_match.group(1).strip()
        scientific_match = re.search(r'([A-Z][a-z]+\s+[a-z]+)', header_match.group(3))
        if scientific_match:
            info["botanical_name"] = scientific_match.group(1)
    
    # Extract synonyms in different languages
    synonyms_section = re.search(r'SYNONYMS\s*\n(.*?)(?=\nDESCRIPTION)', content, re.DOTALL)
    if synonyms_section:
        synonyms_text = synonyms_section.group(1)
        for line in synonyms_text.split('\n'):
            line = line.strip()
            if ':' in line and not line.startswith('Sanskrit') and len(line) > 5:
                parts = line.split(':', 1)
                if len(parts) == 2:
                    info["synonyms"][parts[0].strip()] = parts[1].strip()
    
    # Extract basic description
    desc_match = re.search(r'DESCRIPTION\s*\n(.*?)(?=IDENTITY|CONSTITUENTS|PROPERTIES)', content, re.DOTALL)
    if desc_match:
        desc_text = desc_match.group(1).strip()
        # Take first paragraph for concise description
        first_para = desc_text.split('\n')[0:3]  # First few lines
        info["description"] = ' '.join(first_para).strip()
    
    # Extract therapeutic uses if available
    uses_match = re.search(r'THERAPEUTIC USES\s*[-–]\s*([^\\n]+)', content)
    if uses_match:
        uses_text = uses_match.group(1).strip()
        uses = [use.strip() for use in re.split(r'[,，]', uses_text) if use.strip()]
        info["therapeutic_uses"] = uses
    
    # Extract dose if available
    dose_match = re.search(r'DOSE\s*[-–]\s*([^\\n]+)', content)
    if dose_match:
        info["dose"] = dose_match.group(1).strip()
    
    # Extract formulations if available
    form_match = re.search(r'IMPORTANT FORMULATIONS\s*[-–]\s*([^\\n]+)', content)
    if form_match:
        form_text = form_match.group(1).strip()
        formulations = [form.strip() for form in re.split(r'[,，]', form_text) if form.strip()]
        info["formulations"] = formulations
    
    # Extract Ayurvedic properties if available
    for prop in ['Rasa', 'Guna', 'Virya', 'Vipaka', 'Karma']:
        prop_match = re.search(rf'{prop}\s*:\s*([^\\n]+)', content)
        if prop_match:
            info["properties"][prop] = prop_match.group(1).strip()
    
    return info

def create_practical_tips(herb_info: Dict[str, Any], page: int) -> List[Dict[str, Any]]:
    """Generate practical tips from herb information"""
    tips = []
    herb_name = herb_info["name"]
    
    if not herb_name:
        return tips
    
    # Basic herb introduction tip
    intro_tip = {
        "type": "herb_introduction",
        "herb": herb_name,
        "botanical_name": herb_info["botanical_name"],
        "description": herb_info["description"][:200] + "...",  # Truncate for readability
        "synonyms": herb_info["synonyms"],
        "source_page": page
    }
    tips.append(intro_tip)
    
    # Therapeutic uses tips
    for use in herb_info["therapeutic_uses"]:
        if use and len(use) > 2:
            tip = {
                "type": "therapeutic_use",
                "herb": herb_name,
                "condition": use,
                "recommendation": f"For {use.lower()}, {herb_name} is traditionally used in Ayurveda.",
                "dose": herb_info["dose"],
                "source_page": page
            }
            tips.append(tip)
    
    # Dosage tips
    if herb_info["dose"]:
        tip = {
            "type": "dosage_guidance",
            "herb": herb_name,
            "dose": herb_info["dose"],
            "recommendation": f"Traditional dosage for {herb_name}: {herb_info['dose']}",
            "source_page": page
        }
        tips.append(tip)
    
    # Formulation tips
    for formulation in herb_info["formulations"]:
        if formulation and len(formulation) > 2:
            tip = {
                "type": "classical_formulation",
                "herb": herb_name,
                "formulation": formulation,
                "recommendation": f"{herb_name} is a key ingredient in the classical Ayurvedic formulation {formulation}.",
                "source_page": page
            }
            tips.append(tip)
    
    # Ayurvedic properties tips
    if herb_info["properties"]:
        for prop_name, prop_value in herb_info["properties"].items():
            if prop_value:
                tip = {
                    "type": "ayurvedic_property",
                    "herb": herb_name,
                    "property": prop_name,
                    "value": prop_value,
                    "recommendation": f"{herb_name} has {prop_name}: {prop_value}, which determines its therapeutic action.",
                    "source_page": page
                }
                tips.append(tip)
    
    return tips

def main():
    """Main transformation function"""
    
    # Load the structured data
    try:
        with open('/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/src/data/ayurcheck_api_vol1_pymupdf_structured.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ Could not find the structured JSON file")
        return
    
    all_tips = []
    processed_herbs = 0
    
    # Process each herb entry
    for entry in data.get("herbs", []):
        content = entry.get("content", "")
        page = entry.get("page", 0)
        
        # Skip entries that are too short or are table of contents
        if len(content) < 500 or "CONTENTS" in content or "Sl. No." in content:
            continue
        
        # Extract herb information
        herb_info = extract_basic_info(content)
        
        if not herb_info["name"]:
            continue
        
        print(f"Processing: {herb_info['name']} (Page {page})")
        
        # Generate tips
        tips = create_practical_tips(herb_info, page)
        all_tips.extend(tips)
        processed_herbs += 1
    
    # Create summary statistics
    tip_types = {}
    for tip in all_tips:
        tip_type = tip["type"]
        tip_types[tip_type] = tip_types.get(tip_type, 0) + 1
    
    # Create output structure
    output = {
        "metadata": {
            "source": "Ayurvedic Pharmacopoeia of India - Volume 1",
            "transformation_date": "2024-12-19",
            "total_herbs_processed": processed_herbs,
            "total_tips": len(all_tips),
            "tip_types": tip_types
        },
        "tips": all_tips
    }
    
    # Save the transformed data
    output_file = '/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/src/data/ayurvedic_tips_practical.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Transformation complete!")
    print(f"📊 Processed {processed_herbs} herbs")
    print(f"📝 Generated {len(all_tips)} practical tips")
    print(f"📁 Output saved to: {output_file}")
    
    print("\n📈 Tip distribution:")
    for tip_type, count in tip_types.items():
        print(f"  • {tip_type.replace('_', ' ').title()}: {count}")

if __name__ == "__main__":
    main()