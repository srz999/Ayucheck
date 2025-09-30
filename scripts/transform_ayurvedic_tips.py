#!/usr/bin/env python3
"""
Transform extracted Ayurvedic pharmacopoeia data into practical tips format
"""

import json
import re
from typing import Dict, List, Any

def extract_herb_info(herb_content: str) -> Dict[str, Any]:
    """Extract structured information from herb monograph content"""
    
    herb_info = {
        "synonyms": {},
        "description": "",
        "constituents": "",
        "properties": {},
        "therapeutic_uses": [],
        "dose": "",
        "formulations": []
    }
    
    # Extract synonyms
    synonyms_match = re.search(r'SYNONYMS\s*\n(.*?)(?=\n[A-Z]+)', herb_content, re.DOTALL)
    if synonyms_match:
        synonyms_text = synonyms_match.group(1)
        # Parse language-wise synonyms
        for line in synonyms_text.split('\n'):
            line = line.strip()
            if ':' in line and line:
                parts = line.split(':', 1)
                if len(parts) == 2:
                    lang = parts[0].strip()
                    names = parts[1].strip()
                    if names and names != '--':
                        herb_info["synonyms"][lang] = names
    
    # Extract description
    desc_match = re.search(r'DESCRIPTION\s*\n(.*?)(?=IDENTITY|CONSTITUENTS|PROPERTIES)', herb_content, re.DOTALL)
    if desc_match:
        herb_info["description"] = desc_match.group(1).strip()
    
    # Extract constituents
    const_match = re.search(r'CONSTITUENTS\s*-\s*(.*?)(?=\n\s*PROPERTIES|$)', herb_content, re.DOTALL)
    if const_match:
        herb_info["constituents"] = const_match.group(1).strip()
    
    # Extract properties and actions
    props_match = re.search(r'PROPERTIES AND ACTION(.*?)(?=IMPORTANT FORMULATIONS|THERAPEUTIC USES)', herb_content, re.DOTALL)
    if props_match:
        props_text = props_match.group(1)
        
        # Extract individual properties
        for prop_name in ['Rasa', 'Guna', 'Virya', 'Vipaka', 'Karma']:
            prop_match = re.search(rf'{prop_name}\s*:\s*(.*?)(?=\n\w+\s*:|$)', props_text, re.DOTALL)
            if prop_match:
                herb_info["properties"][prop_name] = prop_match.group(1).strip()
    
    # Extract therapeutic uses
    uses_match = re.search(r'THERAPEUTIC USES\s*-\s*(.*?)(?=\nDOSE|$)', herb_content, re.DOTALL)
    if uses_match:
        uses_text = uses_match.group(1).strip()
        # Split by commas and clean up
        uses = [use.strip() for use in uses_text.replace('\n', ' ').split(',') if use.strip()]
        herb_info["therapeutic_uses"] = uses
    
    # Extract dose
    dose_match = re.search(r'DOSE\s*-\s*(.*?)(?=\n|$)', herb_content, re.DOTALL)
    if dose_match:
        herb_info["dose"] = dose_match.group(1).strip()
    
    # Extract formulations
    form_match = re.search(r'IMPORTANT FORMULATIONS\s*-\s*(.*?)(?=\nTHERAPEUTIC USES|$)', herb_content, re.DOTALL)
    if form_match:
        form_text = form_match.group(1).strip()
        formulations = [form.strip() for form in form_text.replace('\n', ' ').split(',') if form.strip()]
        herb_info["formulations"] = formulations
    
    return herb_info

def create_practical_tips(herb_name: str, herb_info: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate practical Ayurvedic tips from herb information"""
    tips = []
    
    # Health condition tips
    for condition in herb_info["therapeutic_uses"]:
        if condition:
            tip = {
                "type": "condition_treatment",
                "herb": herb_name,
                "condition": condition,
                "tip": f"For {condition.lower()}, consider using {herb_name}. {herb_info['dose']}",
                "properties": herb_info["properties"],
                "constituents": herb_info["constituents"]
            }
            tips.append(tip)
    
    # Property-based tips
    if "Rasa" in herb_info["properties"]:
        rasa = herb_info["properties"]["Rasa"]
        tip = {
            "type": "taste_property",
            "herb": herb_name,
            "rasa": rasa,
            "tip": f"{herb_name} has {rasa} taste, which influences its therapeutic effects according to Ayurvedic principles.",
            "properties": herb_info["properties"]
        }
        tips.append(tip)
    
    # Dosha balancing tips
    if "Karma" in herb_info["properties"]:
        karma = herb_info["properties"]["Karma"]
        tip = {
            "type": "dosha_balance",
            "herb": herb_name,
            "action": karma,
            "tip": f"{herb_name} has the following actions: {karma}. Use it to balance related dosha imbalances.",
            "properties": herb_info["properties"]
        }
        tips.append(tip)
    
    # Formulation tips
    for formulation in herb_info["formulations"]:
        if formulation:
            tip = {
                "type": "formulation",
                "herb": herb_name,
                "formulation": formulation,
                "tip": f"{herb_name} is an important ingredient in {formulation}, a classical Ayurvedic preparation.",
                "properties": herb_info["properties"]
            }
            tips.append(tip)
    
    return tips

def transform_ayurvedic_data():
    """Main transformation function"""
    
    # Load the structured data
    with open('/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/src/data/ayurcheck_api_vol1_pymupdf_structured.json', 'r') as f:
        data = json.load(f)
    
    all_tips = []
    
    # Process each herb
    for herb in data.get("herbs", []):
        content = herb.get("content", "")
        page = herb.get("page", 0)
        
        # Extract herb name from content
        herb_name_match = re.search(r'^\d+\.\s*([A-Z][^(]+)', content)
        if not herb_name_match:
            continue
            
        herb_name = herb_name_match.group(1).strip()
        
        # Skip table of contents and other non-herb pages
        if "CONTENTS" in content or len(content) < 200:
            continue
        
        print(f"Processing: {herb_name}")
        
        # Extract structured information
        herb_info = extract_herb_info(content)
        
        # Generate practical tips
        tips = create_practical_tips(herb_name, herb_info)
        
        # Add page reference to each tip
        for tip in tips:
            tip["source_page"] = page
            tip["source"] = "Ayurvedic Pharmacopoeia of India"
        
        all_tips.extend(tips)
    
    # Create output structure
    output = {
        "metadata": {
            "source": "Ayurvedic Pharmacopoeia of India",
            "transformation_date": "2024-12-19",
            "total_tips": len(all_tips),
            "tip_types": list(set(tip["type"] for tip in all_tips))
        },
        "ayurvedic_tips": all_tips
    }
    
    # Save the transformed data
    with open('/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/src/data/ayurvedic_tips_practical.json', 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Transformation complete!")
    print(f"Generated {len(all_tips)} practical Ayurvedic tips")
    print(f"Tip types: {output['metadata']['tip_types']}")
    
    # Generate summary statistics
    type_counts = {}
    for tip in all_tips:
        tip_type = tip["type"]
        type_counts[tip_type] = type_counts.get(tip_type, 0) + 1
    
    print("\nTip distribution:")
    for tip_type, count in type_counts.items():
        print(f"  {tip_type}: {count}")

if __name__ == "__main__":
    transform_ayurvedic_data()