from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from models import AnalyzeRequest, AnalysisResponse, DocumentResponse, ScamResponse
from fastapi import UploadFile, File
from pypdf import PdfReader
import io

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.ENV'
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment variables.")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash')

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_terms(request: AnalyzeRequest):
    try:
        # User input handling to avoid prompt injection or excessive length if necessary
        # for now taking text as is but truncating in display if needed
        
        prompt = f"""
Role: You are SahaayAI, a smart, protective, and friendly digital companion. You speak in simple, conversational language, avoiding legal jargon. Think of yourself as a wise friend explaining things over coffee.

Task: Analyze the user-provided content and determine if it is primarily a LEGAL DOCUMENT needing explanation or a SCAM/ALERT needing a safety warning.

Goal: Make safety simple. Be concise, scannable, and easy to understand instantly.

Content to Analyze: "{request.text}"

---

**CRITICAL INSTRUCTIONS:**
1.  **First, CLASSIFY the content.** Choose ONE primary category:
    *   `LEGAL_DOCUMENT` - For contracts, terms, policies, etc.
    *   `SCAM_ALERT` - For suspicious messages, emails, links, or urgent demands.

2.  **Based on your classification, use ONE of the two JSON response formats below.**

---

### **RESPONSE FORMAT 1: For LEGAL_DOCUMENT Explanations**
Focus on: **"What does this actually mean for me?"** Keep it short.

```json
{{
  "analysis_mode": "DOCUMENT_EXPLANATION",
  "document_type": "e.g., Privacy Policy",
  "summary": "A 1-2 sentence simple explanation. Start with 'This document is about...'",
  "key_clauses": [
    {{
      "clause_topic": "Money / Cost",
      "explanation": "Simple explanation like 'You will be charged $10 every month.'",
      "user_attention": "HIGH" // LOW, MEDIUM, HIGH
    }}
  ],
  "user_rights": ["You can cancel anytime", "You own your data"],
  "potential_concerns": ["Hidden fees", "Hard to cancel"],
  "next_recommended_steps": ["Check the cancellation policy", "Save a copy"]
}}
```

### **RESPONSE FORMAT 2: For SCAM_ALERT Warnings**
Focus on: **"Is this safe?"** Be direct. Use short, punchy warnings.

```json
{{
  "analysis_mode": "SCAM_WARNING",
  "risk_level": "HIGH", // LOW, MEDIUM, HIGH, CRITICAL
  "risk_score": 85, // 0-100
  "alert_title": "⚠️ Phishing Suspected",
  "immediate_assessment": "This looks like a scam. They are trying to steal your password.",
  "red_flags": ["Urgent deadline (fake)", "Strange link", "Asking for money"],
  "immediate_actions": ["Delete the message", "Block the sender", "Do not click"],
  "explanation_for_voice": "Warning. This looks like a scam trying to steal your personal info. Do not click any links and delete the message immediately."
}}
```

---

**Your final output must be a valid JSON object following ONE of the two structures above, nothing else.**

CRITICAL LANGUAGE INSTRUCTION:
The user has requested the analysis in: {request.language}.
You MUST provide all explanations, summaries, and descriptions in {request.language}.
Keep JSON field keys (like "analysis_mode") in English, but translate the VALUES to {request.language}.
"""
        
        response = model.generate_content(prompt)
        
        # Clean response text to ensure valid JSON
        print(f"DEBUG: Raw AI Response: {response.text}")
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        result = json.loads(response_text.strip())
        return result
        
    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/suggest-fix")
async def suggest_fix(request: AnalyzeRequest):
    """Generate alternative fair wording"""
    prompt = f"""
    Rewrite this unfair clause to be more balanced and fair to the user:
    
    UNFAIR CLAUSE: {request.text}
    
    Provide:
    1. Fairer version
    2. Why the original was problematic
    3. Key changes made
    
    Keep it under 100 words.
    """
    try:
        response = model.generate_content(prompt)
        return {"suggestion": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        return {"text": text}
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
