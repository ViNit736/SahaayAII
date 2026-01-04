from pydantic import BaseModel, Field
from typing import List, Union, Literal

class AnalyzeRequest(BaseModel):
    text: str
    url: str = ""
    language: str = "English"

# Models for Document Mode
class KeyClause(BaseModel):
    clause_topic: str
    explanation: str
    user_attention: str = Field(..., pattern="^(LOW|MEDIUM|HIGH)$")

class DocumentResponse(BaseModel):
    analysis_mode: Literal["DOCUMENT_EXPLANATION"] = "DOCUMENT_EXPLANATION"
    document_type: str
    summary: str
    key_clauses: List[KeyClause]
    user_rights: List[str]
    potential_concerns: List[str]
    next_recommended_steps: List[str]

# Models for Scam Mode
class ScamResponse(BaseModel):
    analysis_mode: Literal["SCAM_WARNING"] = "SCAM_WARNING"
    risk_level: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    risk_score: int = Field(..., ge=0, le=100)
    alert_title: str
    immediate_assessment: str
    red_flags: List[str]
    immediate_actions: List[str]
    explanation_for_voice: str

# Union type for the response
AnalysisResponse = Union[DocumentResponse, ScamResponse]
