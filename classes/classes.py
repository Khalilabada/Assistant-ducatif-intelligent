
from pydantic import BaseModel
from typing import List
from enum import Enum
import json


class SegmentationsContent(BaseModel):
    Segmentationtitle: str  # Le titre du segment
    Segmentationcontent: str  # Le contenu du segment

class Segmentations(BaseModel):
    courseName: str
    introduction_titres: str
    segmentation_titres: List[SegmentationsContent]  # Liste de SegmentContent pour inclure le titre et le contenu

class QuestionType(str, Enum):
    SINGLE_CHOICE = "single-choice"
    MULTIPLE_CHOICE = "multiple-choice"

class Option(BaseModel):
    optionId: int 
    optionText: str
    isCorrect: bool

class Question(BaseModel):
    questionText: str
    type: QuestionType  
    options: List[Option]

class QuizData(BaseModel):
    title: str
    singleChoiceCount: int
    multipleChoiceCount: int
    questionCount: int
    questions: List[Question]
class QuizResult(BaseModel):
    quiz_title: str
    total_questions: int
    correct_answers: int
    score: float  # Le score en pourcentage
    feedback: str  # Un retour basé sur le score

# Mettre à jour la classe Explanation
class Explanation(BaseModel):
    segmentation_content: str  # Contenu du segment
    score_level: str  # Niveau du score
    generated_explanation: str  # Explication générée

    def to_dict(self):
        return {
            "segmentation_content": self.segmentation_content,
            "score_level": self.score_level,
            "generated_explanation": self.generated_explanation
        }
   

    
class CommendCmd(BaseModel):
    cmdLabel: str
    description: str
    cmd: str



