// Transcript Chunker - Intelligent splitting and processing of large transcripts
const fs = require('fs-extra');
const path = require('path');

class TranscriptChunker {
  constructor() {
    // Token estimation: rough approximation of 1 token ≈ 4 characters
    this.maxTokensPerChunk = 50000; // Conservative limit for most models
    this.overlapTokens = 2000; // Overlap between chunks to maintain context
    this.maxCharsPerChunk = this.maxTokensPerChunk * 4;
    this.overlapChars = this.overlapTokens * 4;
  }

  // Estimate token count from text
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Check if text needs chunking
  needsChunking(text) {
    return this.estimateTokens(text) > this.maxTokensPerChunk;
  }

  // Find intelligent split points (prefer sentence boundaries, then paragraph breaks)
  findSplitPoint(text, targetPosition) {
    const searchWindow = 1000; // Characters to search around target position
    const start = Math.max(0, targetPosition - searchWindow);
    const end = Math.min(text.length, targetPosition + searchWindow);
    const searchText = text.substring(start, end);

    // Priority order for split points
    const splitPatterns = [
      /\.\s+/g,           // Sentence endings with space
      /\!\s+/g,           // Exclamation with space
      /\?\s+/g,           // Question mark with space
      /\n\n/g,            // Paragraph breaks
      /\.\n/g,            // Sentence ending with newline
      /\n/g,              // Any newline
      /\s+/g              // Any whitespace (last resort)
    ];

    for (const pattern of splitPatterns) {
      const matches = [...searchText.matchAll(pattern)];
      if (matches.length > 0) {
        // Find the match closest to the target position
        const targetInWindow = targetPosition - start;
        let bestMatch = matches[0];
        let bestDistance = Math.abs(bestMatch.index - targetInWindow);

        for (const match of matches) {
          const distance = Math.abs(match.index - targetInWindow);
          if (distance < bestDistance) {
            bestMatch = match;
            bestDistance = distance;
          }
        }

        return start + bestMatch.index + bestMatch[0].length;
      }
    }

    // If no good split point found, use target position
    return targetPosition;
  }

  // Split text into overlapping chunks
  splitIntoChunks(text) {
    if (!this.needsChunking(text)) {
      return [text];
    }

    const chunks = [];
    let currentPosition = 0;

    while (currentPosition < text.length) {
      // Calculate chunk end position
      const idealChunkEnd = currentPosition + this.maxCharsPerChunk;
      
      if (idealChunkEnd >= text.length) {
        // Last chunk - take everything remaining
        chunks.push(text.substring(currentPosition));
        break;
      }

      // Find intelligent split point
      const actualChunkEnd = this.findSplitPoint(text, idealChunkEnd);
      const chunk = text.substring(currentPosition, actualChunkEnd);
      chunks.push(chunk);

      // Move to next position with overlap consideration
      const nextStart = Math.max(
        currentPosition + this.maxCharsPerChunk - this.overlapChars,
        actualChunkEnd - this.overlapChars
      );
      
      currentPosition = Math.max(nextStart, currentPosition + 1); // Ensure progress
    }

    return chunks;
  }

  // Add metadata headers to chunks
  addChunkMetadata(chunks, videoMetadata = null) {
    return chunks.map((chunk, index) => {
      let header = '';
      
      if (videoMetadata) {
        header += `# YouTube Video Analysis - Part ${index + 1} of ${chunks.length}\n\n`;
        header += `**Video Title**: ${videoMetadata.title || 'Unknown'}\n`;
        header += `**Channel**: ${videoMetadata.uploader || 'Unknown'}\n`;
        header += `**URL**: ${videoMetadata.url || 'Unknown'}\n`;
        header += `**Part**: ${index + 1}/${chunks.length}\n\n`;
        
        if (index === 0) {
          header += `**Note**: This is a long video transcript that has been split into ${chunks.length} parts for processing.\n\n`;
        }
        
        header += `## Video Transcript (Part ${index + 1})\n\n`;
      } else {
        header += `# Transcript Analysis - Part ${index + 1} of ${chunks.length}\n\n`;
      }

      return header + chunk;
    });
  }

  // Aggregate results from multiple chunks based on pattern type
  aggregateResults(results, patternName) {
    if (results.length === 1) {
      return results[0];
    }

    const aggregationStrategies = {
      // Summary patterns - combine key points
      'youtube_summary': this.aggregateSummaries.bind(this),
      'create_5_sentence_summary': this.aggregateBriefSummaries.bind(this),
      
      // Extraction patterns - merge lists
      'extract_wisdom': this.aggregateExtractions.bind(this),
      'extract_insights': this.aggregateExtractions.bind(this),
      'extract_ideas': this.aggregateExtractions.bind(this),
      'extract_patterns': this.aggregateExtractions.bind(this),
      'extract_recommendations': this.aggregateExtractions.bind(this),
      'extract_predictions': this.aggregateExtractions.bind(this),
      'extract_references': this.aggregateExtractions.bind(this),
      'extract_questions': this.aggregateExtractions.bind(this),
      'create_tags': this.aggregateTags.bind(this),
      
      // Core message - synthesize main themes
      'extract_core_message': this.aggregateCoreMessage.bind(this),
      
      // Flashcards - combine all cards
      'to_flashcards': this.aggregateFlashcards.bind(this)
    };

    const strategy = aggregationStrategies[patternName];
    if (strategy) {
      return strategy(results, patternName);
    } else {
      // Default: combine with clear section breaks
      return this.aggregateDefault(results, patternName);
    }
  }

  // Aggregate summary-type results
  aggregateSummaries(results) {
    const header = `# Comprehensive Video Summary\n\n**Note**: This summary combines analysis from ${results.length} parts of a long-form video.\n\n`;
    
    let combined = header;
    results.forEach((result, index) => {
      // Remove individual headers and combine content
      const cleanResult = result.replace(/^#[^\n]*\n*/gm, '').trim();
      if (cleanResult) {
        combined += `## Part ${index + 1} Summary\n\n${cleanResult}\n\n`;
      }
    });

    combined += `## Overall Themes\n\nThis video covers comprehensive topics across ${results.length} segments, providing in-depth analysis and insights throughout.`;
    
    return combined;
  }

  // Aggregate brief summaries
  aggregateBriefSummaries(results) {
    const sentences = [];
    results.forEach(result => {
      // Extract sentences from each result
      const cleanResult = result.replace(/^#[^\n]*\n*/gm, '').trim();
      const resultSentences = cleanResult.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sentences.push(...resultSentences.slice(0, 2)); // Take top 2 from each part
    });

    // Take best 5 sentences overall
    return sentences.slice(0, 5).map(s => s.trim()).join('. ') + '.';
  }

  // Aggregate extraction-type results (lists, bullet points)
  aggregateExtractions(results) {
    const header = `# Comprehensive Analysis\n\n**Note**: Combined analysis from ${results.length} parts.\n\n`;
    
    const allPoints = [];
    results.forEach((result, index) => {
      // Extract bullet points or numbered lists
      const cleanResult = result.replace(/^#[^\n]*\n*/gm, '').trim();
      const lines = cleanResult.split('\n');
      
      lines.forEach(line => {
        line = line.trim();
        if (line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/) || line.length > 20) {
          // Clean up formatting and avoid duplicates
          const cleanLine = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
          if (cleanLine.length > 10 && !allPoints.some(p => p.includes(cleanLine.substring(0, 30)))) {
            allPoints.push(cleanLine);
          }
        }
      });
    });

    // Format as bullet points
    const formattedPoints = allPoints.slice(0, 20).map(point => `- ${point}`).join('\n');
    return header + formattedPoints;
  }

  // Aggregate core message
  aggregateCoreMessage(results) {
    const messages = results.map(result => {
      return result.replace(/^#[^\n]*\n*/gm, '').trim();
    }).filter(msg => msg.length > 0);

    const header = `# Core Message\n\n**Synthesized from ${messages.length} parts:**\n\n`;
    
    if (messages.length === 1) {
      return header + messages[0];
    }

    const combined = messages.join(' ');
    return header + `This comprehensive content conveys: ${combined}`;
  }

  // Aggregate tags
  aggregateTags(results) {
    const allTags = new Set();
    
    results.forEach(result => {
      const cleanResult = result.replace(/^#[^\n]*\n*/gm, '').trim();
      // Extract tags (words/phrases separated by commas, spaces, or hashtags)
      const tags = cleanResult.split(/[,\n#]/).map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 2);
      tags.forEach(tag => allTags.add(tag));
    });

    return Array.from(allTags).slice(0, 20).join(', ');
  }

  // Aggregate flashcards
  aggregateFlashcards(results) {
    const header = `# Comprehensive Flashcards\n\n**Combined from ${results.length} parts:**\n\n`;
    
    let combined = header;
    results.forEach((result, index) => {
      const cleanResult = result.replace(/^#[^\n]*\n*/gm, '').trim();
      if (cleanResult) {
        combined += `## Part ${index + 1} Cards\n\n${cleanResult}\n\n`;
      }
    });

    return combined;
  }

  // Default aggregation strategy
  aggregateDefault(results) {
    const header = `# Combined Analysis\n\n**Note**: Analysis combined from ${results.length} parts.\n\n`;
    
    let combined = header;
    results.forEach((result, index) => {
      combined += `## Part ${index + 1}\n\n${result}\n\n---\n\n`;
    });

    return combined;
  }

  // Get chunking statistics
  getChunkingStats(originalText, chunks) {
    return {
      originalLength: originalText.length,
      originalTokens: this.estimateTokens(originalText),
      totalChunks: chunks.length,
      avgChunkLength: Math.round(chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length),
      avgChunkTokens: Math.round(chunks.reduce((sum, chunk) => sum + this.estimateTokens(chunk), 0) / chunks.length),
      maxChunkTokens: Math.max(...chunks.map(chunk => this.estimateTokens(chunk)))
    };
  }
}

module.exports = TranscriptChunker;