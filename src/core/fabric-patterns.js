// YouTube to Docs Fabric Pattern Sequence
// Based on youtube-to-docs.md from ISEE Meta Framework

const FABRIC_PATTERNS = [
  // Phase 1: Primary Extraction
  {
    phase: 1,
    name: "youtube_summary",
    description: "Comprehensive video summary",
    filename: "01-youtube_summary.txt"
  },
  {
    phase: 1,
    name: "extract_core_message",
    description: "Central thesis and key messages",
    filename: "02-extract_core_message.txt"
  },
  
  // Phase 2: Content Analysis
  {
    phase: 2,
    name: "extract_wisdom",
    description: "Life lessons and insights",
    filename: "03-extract_wisdom.txt"
  },
  {
    phase: 2,
    name: "extract_insights", 
    description: "Deep analytical observations",
    filename: "04-extract_insights.txt"
  },
  {
    phase: 2,
    name: "extract_ideas",
    description: "Novel concepts and innovations",
    filename: "05-extract_ideas.txt"
  },
  {
    phase: 2,
    name: "extract_patterns",
    description: "Recurring themes and structures", 
    filename: "06-extract_patterns.txt"
  },
  {
    phase: 2,
    name: "extract_recommendations",
    description: "Actionable guidance",
    filename: "07-extract_recommendations.txt"
  },
  {
    phase: 2,
    name: "extract_predictions",
    description: "Future implications and trends",
    filename: "08-extract_predictions.txt"
  },
  
  // Phase 3: Knowledge Graph Building
  {
    phase: 3,
    name: "extract_references",
    description: "People, organizations, and resources",
    filename: "09-extract_references.txt"
  },
  {
    phase: 3,
    name: "extract_questions",
    description: "Critical questions raised",
    filename: "10-extract_questions.txt"
  },
  {
    phase: 3,
    name: "create_tags",
    description: "Comprehensive tagging system",
    filename: "11-create_tags.txt"
  },
  
  // Phase 4: Synthesis Materials
  {
    phase: 4,
    name: "create_5_sentence_summary",
    description: "Ultra-concise overview",
    filename: "12-create_5_sentence_summary.txt"
  },
  {
    phase: 4,
    name: "to_flashcards",
    description: "Educational flashcards for learning",
    filename: "13-to_flashcards.txt"
  }
];

const PHASE_DESCRIPTIONS = {
  1: "Primary Extraction",
  2: "Content Analysis", 
  3: "Knowledge Graph Building",
  4: "Synthesis Materials"
};

module.exports = {
  FABRIC_PATTERNS,
  PHASE_DESCRIPTIONS
};