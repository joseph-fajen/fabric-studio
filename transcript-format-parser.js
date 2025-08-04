// Transcript Format Parser - Universal Content Intelligence Platform
// Handles multiple transcript formats: plain text, VTT, SRT, speaker-labeled

const fs = require('fs-extra');
const path = require('path');

class TranscriptFormatParser {
  constructor() {
    // RegEx patterns for format detection
    this.formatPatterns = {
      vtt: /^WEBVTT[\r\n]|^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/m,
      srt: /^\d+[\r\n]+\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/m,
      speakerLabeled: /^[A-Za-z][^:\n]*:\s*[^\n]+/m,
      youtube: /^\[\d{2}:\d{2}:\d{2}\]/m,
      timestamped: /^\d{1,2}:\d{2}(?::\d{2})?\s+/m
    };

    // Common noise patterns to clean
    this.noisePatterns = [
      /\[Music\]/gi,
      /\[Applause\]/gi,
      /\[Laughter\]/gi,
      /\[Inaudible\]/gi,
      /\[Background noise\]/gi,
      /\[Static\]/gi,
      /\[Silence\]/gi,
      /\(Music\)/gi,
      /\(Applause\)/gi,
      /\(Laughter\)/gi,
      /\(Inaudible\)/gi,
      /\(Background noise\)/gi,
      /\(Static\)/gi,
      /\(Silence\)/gi
    ];
  }

  // Detect transcript format
  detectFormat(content) {
    const cleanContent = content.trim();
    
    if (!cleanContent) {
      return { format: 'empty', confidence: 1.0 };
    }

    // Check each format pattern
    for (const [format, pattern] of Object.entries(this.formatPatterns)) {
      if (pattern.test(cleanContent)) {
        const confidence = this.calculateConfidence(cleanContent, format);
        return { format, confidence };
      }
    }

    // Default to plain text
    return { format: 'plaintext', confidence: 0.8 };
  }

  // Calculate confidence score for format detection
  calculateConfidence(content, format) {
    const lines = content.split('\n').filter(line => line.trim());
    let matchingLines = 0;

    switch (format) {
      case 'vtt':
        matchingLines = lines.filter(line => 
          line.includes('-->') || 
          line.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/) ||
          line === 'WEBVTT'
        ).length;
        break;
      
      case 'srt':
        matchingLines = lines.filter(line => 
          line.match(/^\d+$/) || 
          line.includes('-->') ||
          line.match(/^\d{2}:\d{2}:\d{2},\d{3}/)
        ).length;
        break;
      
      case 'speakerLabeled':
        matchingLines = lines.filter(line => 
          line.match(/^[A-Za-z][^:\n]*:\s*[^\n]+/)
        ).length;
        break;
      
      case 'youtube':
        matchingLines = lines.filter(line => 
          line.match(/^\[\d{2}:\d{2}:\d{2}\]/)
        ).length;
        break;
      
      case 'timestamped':
        matchingLines = lines.filter(line => 
          line.match(/^\d{1,2}:\d{2}(?::\d{2})?\s+/)
        ).length;
        break;
      
      default:
        return 0.5;
    }

    return Math.min(matchingLines / Math.max(lines.length * 0.3, 1), 1.0);
  }

  // Parse and normalize transcript content
  async parseTranscript(content, options = {}) {
    const { format: detectedFormat, confidence } = this.detectFormat(content);
    const format = options.forceFormat || detectedFormat;
    
    console.log(`🔍 Detected format: ${format} (confidence: ${(confidence * 100).toFixed(1)}%)`);

    let parsedContent;
    let metadata = {
      originalFormat: format,
      confidence: confidence,
      detectedSpeakers: [],
      estimatedDuration: null,
      lineCount: content.split('\n').length,
      characterCount: content.length
    };

    switch (format) {
      case 'vtt':
        parsedContent = this.parseVTT(content, metadata);
        break;
      case 'srt':
        parsedContent = this.parseSRT(content, metadata);
        break;
      case 'speakerLabeled':
        parsedContent = this.parseSpeakerLabeled(content, metadata);
        break;
      case 'youtube':
        parsedContent = this.parseYouTubeTimestamped(content, metadata);
        break;
      case 'timestamped':
        parsedContent = this.parseTimestamped(content, metadata);
        break;
      case 'plaintext':
      default:
        parsedContent = this.parsePlainText(content, metadata);
        break;
    }

    // Apply universal cleaning and normalization
    const cleanedContent = this.normalizeTranscript(parsedContent, options);
    
    // Generate content statistics
    metadata.processedCharacterCount = cleanedContent.length;
    metadata.estimatedTokens = Math.ceil(cleanedContent.length / 4); // Rough token estimate
    metadata.processingNotes = this.generateProcessingNotes(format, metadata);

    return {
      content: cleanedContent,
      metadata: metadata,
      originalFormat: format,
      confidence: confidence
    };
  }

  // Parse WebVTT format
  parseVTT(content, metadata) {
    const lines = content.split('\n');
    const textLines = [];
    let currentText = '';
    let speakerSet = new Set();
    let lastTimestamp = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (!line || line === 'WEBVTT' || line.startsWith('NOTE')) {
        continue;
      }

      // Skip timestamp lines
      if (line.includes('-->')) {
        const timestamps = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})/g);
        if (timestamps && timestamps.length >= 2) {
          lastTimestamp = timestamps[1]; // End timestamp
        }
        continue;
      }

      // Skip cue settings
      if (line.includes('<v ') || line.includes('</v>')) {
        const speakerMatch = line.match(/<v ([^>]+)>/);
        if (speakerMatch) {
          speakerSet.add(speakerMatch[1]);
        }
        // Extract text content, removing voice tags
        const textContent = line.replace(/<\/?v[^>]*>/g, '').trim();
        if (textContent) {
          textLines.push(textContent);
        }
        continue;
      }

      // Regular text line
      if (line) {
        textLines.push(line);
      }
    }

    metadata.detectedSpeakers = Array.from(speakerSet);
    if (lastTimestamp) {
      metadata.estimatedDuration = this.parseTimestamp(lastTimestamp);
    }

    return textLines.join(' ');
  }

  // Parse SubRip (SRT) format
  parseSRT(content, metadata) {
    const lines = content.split('\n');
    const textLines = [];
    let lastTimestamp = null;
    let inTextBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        inTextBlock = false;
        continue;
      }

      // Skip sequence numbers
      if (line.match(/^\d+$/)) {
        inTextBlock = false;
        continue;
      }

      // Handle timestamp lines
      if (line.includes('-->')) {
        const timestamps = line.match(/(\d{2}:\d{2}:\d{2},\d{3})/g);
        if (timestamps && timestamps.length >= 2) {
          lastTimestamp = timestamps[1].replace(',', '.'); // Convert to VTT format
        }
        inTextBlock = true;
        continue;
      }

      // Text content
      if (inTextBlock && line) {
        // Remove formatting tags
        const cleanLine = line.replace(/<[^>]*>/g, '').trim();
        if (cleanLine) {
          textLines.push(cleanLine);
        }
      }
    }

    if (lastTimestamp) {
      metadata.estimatedDuration = this.parseTimestamp(lastTimestamp);
    }

    return textLines.join(' ');
  }

  // Parse speaker-labeled format
  parseSpeakerLabeled(content, metadata) {
    const lines = content.split('\n');
    const textLines = [];
    const speakerSet = new Set();

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check for speaker label pattern
      const speakerMatch = trimmedLine.match(/^([A-Za-z][^:\n]*?):\s*(.+)$/);
      if (speakerMatch) {
        const speaker = speakerMatch[1].trim();
        const text = speakerMatch[2].trim();
        
        speakerSet.add(speaker);
        if (text) {
          textLines.push(text);
        }
      } else {
        // Line without speaker label
        textLines.push(trimmedLine);
      }
    }

    metadata.detectedSpeakers = Array.from(speakerSet);
    return textLines.join(' ');
  }

  // Parse YouTube timestamped format [HH:MM:SS]
  parseYouTubeTimestamped(content, metadata) {
    const lines = content.split('\n');
    const textLines = [];
    let lastTimestamp = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Remove timestamp markers
      const withoutTimestamp = trimmedLine.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
      
      // Extract timestamp for duration estimation
      const timestampMatch = trimmedLine.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
      if (timestampMatch) {
        lastTimestamp = timestampMatch[1] + '.000';
      }

      if (withoutTimestamp) {
        textLines.push(withoutTimestamp);
      }
    }

    if (lastTimestamp) {
      metadata.estimatedDuration = this.parseTimestamp(lastTimestamp);
    }

    return textLines.join(' ');
  }

  // Parse simple timestamped format
  parseTimestamped(content, metadata) {
    const lines = content.split('\n');
    const textLines = [];
    let lastTimestamp = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Remove timestamp from beginning
      const withoutTimestamp = trimmedLine.replace(/^\d{1,2}:\d{2}(?::\d{2})?\s+/, '');
      
      // Extract timestamp for duration estimation
      const timestampMatch = trimmedLine.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/);
      if (timestampMatch) {
        lastTimestamp = this.normalizeTimestamp(timestampMatch[1]);
      }

      if (withoutTimestamp) {
        textLines.push(withoutTimestamp);
      }
    }

    if (lastTimestamp) {
      metadata.estimatedDuration = this.parseTimestamp(lastTimestamp);
    }

    return textLines.join(' ');
  }

  // Parse plain text
  parsePlainText(content, metadata) {
    // Just clean up the content without removing structure
    return content.trim();
  }

  // Normalize transcript content
  normalizeTranscript(content, options = {}) {
    let normalized = content;

    // Remove noise patterns unless disabled
    if (!options.keepNoise) {
      for (const pattern of this.noisePatterns) {
        normalized = normalized.replace(pattern, '');
      }
    }

    // Clean up whitespace
    normalized = normalized
      .replace(/\s+/g, ' ')  // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n\n')  // Multiple newlines to double newline
      .trim();

    // Remove repetitive patterns (like repeated words)
    if (!options.keepRepetition) {
      normalized = this.removeRepetitiveText(normalized);
    }

    return normalized;
  }

  // Remove repetitive text patterns
  removeRepetitiveText(content) {
    // Remove immediately repeated words (word word -> word)
    content = content.replace(/\b(\w+)\s+\1\b/gi, '$1');
    
    // Remove repeated short phrases (up to 4 words)
    const sentences = content.split(/[.!?]+/);
    const cleanedSentences = sentences.map(sentence => {
      const words = sentence.trim().split(/\s+/);
      const cleaned = [];
      
      for (let i = 0; i < words.length; i++) {
        // Look ahead for repetitive patterns
        let isRepetitive = false;
        for (let patternLength = 1; patternLength <= 4 && patternLength <= words.length - i; patternLength++) {
          const pattern = words.slice(i, i + patternLength);
          const nextPattern = words.slice(i + patternLength, i + patternLength * 2);
          
          if (pattern.length === nextPattern.length && 
              pattern.every((word, idx) => word.toLowerCase() === nextPattern[idx]?.toLowerCase())) {
            // Skip the repeated pattern
            i += patternLength - 1;
            isRepetitive = true;
            break;
          }
        }
        
        if (!isRepetitive) {
          cleaned.push(words[i]);
        }
      }
      
      return cleaned.join(' ');
    });
    
    return cleanedSentences.join('. ').trim();
  }

  // Parse timestamp to seconds
  parseTimestamp(timestamp) {
    const parts = timestamp.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    }
    return null;
  }

  // Normalize timestamp format
  normalizeTimestamp(timestamp) {
    const parts = timestamp.split(':');
    if (parts.length === 2) {
      return `00:${timestamp}.000`;
    } else if (parts.length === 3 && !timestamp.includes('.')) {
      return `${timestamp}.000`;
    }
    return timestamp;
  }

  // Generate processing notes
  generateProcessingNotes(format, metadata) {
    const notes = [`Original format: ${format}`];
    
    if (metadata.detectedSpeakers.length > 0) {
      notes.push(`Detected speakers: ${metadata.detectedSpeakers.join(', ')}`);
    }
    
    if (metadata.estimatedDuration) {
      const minutes = Math.floor(metadata.estimatedDuration / 60);
      const seconds = Math.floor(metadata.estimatedDuration % 60);
      notes.push(`Estimated duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    
    const reductionPercent = metadata.originalCharacterCount && metadata.processedCharacterCount 
      ? Math.round((1 - metadata.processedCharacterCount / metadata.characterCount) * 100)
      : 0;
    
    if (reductionPercent > 0) {
      notes.push(`Content cleaned: ${reductionPercent}% reduction`);
    }

    return notes;
  }

  // Estimate content type from transcript
  estimateContentType(content, metadata) {
    const lowerContent = content.toLowerCase();
    
    // Educational content indicators
    if (lowerContent.includes('lesson') || lowerContent.includes('tutorial') || 
        lowerContent.includes('learn') || lowerContent.includes('explain')) {
      return 'educational';
    }
    
    // Interview indicators
    if (metadata.detectedSpeakers.length >= 2 || 
        lowerContent.includes('interview') || lowerContent.includes('conversation')) {
      return 'interview';
    }
    
    // Presentation indicators
    if (lowerContent.includes('presentation') || lowerContent.includes('slide') ||
        lowerContent.includes('today we will') || lowerContent.includes('agenda')) {
      return 'presentation';
    }
    
    // Podcast indicators
    if (lowerContent.includes('podcast') || lowerContent.includes('episode') ||
        lowerContent.includes('welcome back')) {
      return 'podcast';
    }
    
    return 'general';
  }

  // Get format-specific recommendations
  getFormatRecommendations(format, metadata) {
    const recommendations = [];
    
    switch (format) {
      case 'vtt':
      case 'srt':
        recommendations.push('✅ Professional subtitle format detected - optimal for analysis');
        if (metadata.detectedSpeakers.length > 0) {
          recommendations.push(`🎭 Speaker identification preserved (${metadata.detectedSpeakers.length} speakers)`);
        }
        break;
        
      case 'speakerLabeled':
        recommendations.push('🎭 Speaker-labeled format - excellent for conversation analysis');
        recommendations.push(`👥 ${metadata.detectedSpeakers.length} speakers identified`);
        break;
        
      case 'youtube':
        recommendations.push('📺 YouTube timestamp format - good for reference');
        break;
        
      case 'timestamped':
        recommendations.push('⏰ Timestamped format - useful for temporal analysis');
        break;
        
      case 'plaintext':
        recommendations.push('📝 Plain text format - ready for direct analysis');
        break;
        
      default:
        recommendations.push('📄 Standard text processing applied');
    }
    
    if (metadata.estimatedDuration) {
      const minutes = Math.floor(metadata.estimatedDuration / 60);
      if (minutes > 120) {
        recommendations.push('⚠️ Long content detected - consider using content chunking for optimal results');
      } else if (minutes > 60) {
        recommendations.push('⏳ Medium-length content - processing will use standard optimization');
      } else {
        recommendations.push('⚡ Short content - optimal processing speed expected');
      }
    }
    
    return recommendations;
  }
}

module.exports = TranscriptFormatParser;