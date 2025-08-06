// Document Laboratory - Advanced Content Analysis & Document Generation
// Transforms processed content files into comprehensive, audience-specific documents

const fs = require('fs-extra');
const path = require('path');
const FabricTranscriptIntegration = require('./fabric-transcript-integration');

class DocumentLaboratory {
  constructor(fabricTranscriptIntegration) {
    this.fabric = fabricTranscriptIntegration;
    if (!this.fabric) {
      throw new Error('FabricTranscriptIntegration instance is required for DocumentLaboratory');
    }
    this.maxConcurrent = 2; // Conservative for document generation
    this.timeoutMs = 120000; // 2 minutes for complex document generation
    
    // Document type definitions with audience targeting
    this.documentTypes = {
      // Technical Implementation Tier
      technical: {
        'setup-guide': {
          title: 'Setup & Configuration Guide',
          audience: 'Developers, DevOps Engineers, System Administrators',
          purpose: 'Step-by-step implementation guidance',
          complexity: 'high',
          estimatedLength: '2000-4000 words'
        },
        'security-framework': {
          title: 'Security & Compliance Framework',
          audience: 'Security Engineers, Compliance Officers',
          purpose: 'Security implementation and compliance guidance',
          complexity: 'high',
          estimatedLength: '1500-3000 words'
        },
        'integration-blueprint': {
          title: 'Integration Blueprint',
          audience: 'Solution Architects, Integration Engineers',
          purpose: 'System integration patterns and architectures',
          complexity: 'high',
          estimatedLength: '2500-4000 words'
        }
      },
      
      // Strategic Business Tier
      strategic: {
        'market-analysis': {
          title: 'Market Analysis & Competitive Intelligence',
          audience: 'Executives, Product Managers, VCs',
          purpose: 'Strategic market positioning and competitive landscape',
          complexity: 'medium',
          estimatedLength: '1500-2500 words'
        },
        'business-case': {
          title: 'ROI Framework & Business Case',
          audience: 'Engineering Managers, CTOs, Finance Teams',
          purpose: 'Financial justification and ROI modeling',
          complexity: 'medium',
          estimatedLength: '1000-2000 words'
        },
        'technology-strategy': {
          title: 'Technology Strategy Guide',
          audience: 'Tech Leads, Solution Architects, CTOs',
          purpose: 'Long-term technology planning and decision-making',
          complexity: 'high',
          estimatedLength: '2000-3500 words'
        }
      },
      
      // Educational & Training Tier
      educational: {
        'learning-path': {
          title: 'Fundamentals Learning Path',
          audience: 'Junior Developers, New Team Members',
          purpose: 'Structured learning progression from basics to advanced',
          complexity: 'low',
          estimatedLength: '1500-2500 words'
        },
        'practitioner-guide': {
          title: 'Advanced Practitioner Guide',
          audience: 'Senior Engineers, Technical Leads',
          purpose: 'Deep-dive technical mastery and advanced patterns',
          complexity: 'high',
          estimatedLength: '2500-4000 words'
        },
        'training-curriculum': {
          title: 'Workshop & Training Curriculum',
          audience: 'Training Teams, HR Development',
          purpose: 'Complete training program with exercises and assessments',
          complexity: 'medium',
          estimatedLength: '2000-3000 words'
        }
      },
      
      // Operational Excellence Tier
      operational: {
        'quick-reference': {
          title: 'Quick Reference & Cheat Sheet',
          audience: 'Active Practitioners, Daily Users',
          purpose: 'Fast access to key information and commands',
          complexity: 'low',
          estimatedLength: '500-1000 words'
        },
        'troubleshooting-guide': {
          title: 'Troubleshooting & Diagnostic Guide',
          audience: 'Support Teams, Operations Staff',
          purpose: 'Problem resolution and diagnostic procedures',
          complexity: 'medium',
          estimatedLength: '1500-2500 words'
        },
        'executive-briefing': {
          title: 'Executive Briefing (5-minute read)',
          audience: 'C-Suite, Board Members',
          purpose: 'High-level strategic overview and key decisions',
          complexity: 'low',
          estimatedLength: '400-800 words'
        }
      }
    };
  }

  // Analyze content files to identify document generation opportunities
  async analyzeContentOpportunities(outputDir) {
    try {
      console.log(`Analyzing content opportunities in: ${outputDir}`);
      
      // Read all fabric pattern files
      const files = await fs.readdir(outputDir);
      const textFiles = files.filter(file => file.endsWith('.txt'));
      
      if (textFiles.length < 13) { // Ensure all 13 files are present
        throw new Error('Insufficient content files for document generation. Expected 13 files.');
      }

      let combinedContent = '';
      for (const file of textFiles) {
        const content = await fs.readFile(path.join(outputDir, file), 'utf8');
        combinedContent += `--- ${file} ---\n${content}\n\n`;
      }

      const promptPath = path.join(__dirname, '../outputs/2025-07-22_Im-HOOKED-on-Claude-Code-Hooks-Advanced-Agentic-Co_c2b4ecca/prompt-for-deriving-documents/content-analysis-to-targeted-documents-prompt_Gemini-CLI_v2.md');
      const promptContent = await fs.readFile(promptPath, 'utf8');

      const fullPrompt = `${promptContent}\n\n## Input Content\n\n${combinedContent}`;

      console.log('Running fabric for document opportunity analysis...');
      const fabricResult = await this.fabric.runFabricPattern(
        'document_opportunity_analysis', // A dummy pattern name for this specific use case
        fullPrompt,
        'text', // Expecting text output from fabric
        true // isRawPrompt
      );

      let opportunities = [];
      let analysis = {};

      try {
        const jsonResult = JSON.parse(fabricResult.output);
        if (jsonResult && jsonResult.recommended_documents) {
          opportunities = jsonResult.recommended_documents;
          analysis = { // Basic analysis object based on opportunities
            totalDocumentsRecommended: opportunities.length,
            highestConfidence: opportunities.length > 0 ? opportunities[0].confidence_score : 0
          };
        }
      } catch (jsonError) {
        console.error('Failed to parse JSON from fabric output:', jsonError);
        console.error('Fabric output:', fabricResult.output);
        throw new Error('Invalid JSON response from document analysis.');
      }

      return {
        success: true,
        analysis: analysis,
        opportunities: opportunities
      };

    } catch (error) {
      console.error('Error analyzing content opportunities with fabric:', error);
      return {
        success: false,
        error: error.message,
        opportunities: []
      };
    }
  }

  

  // Generate documents based on selected opportunities
  async generateDocuments(outputDir, selectedDocuments, progressCallback = null) {
    try {
      const results = {
        success: true,
        documentsGenerated: [],
        errors: []
      };

      // Create derived documents folder
      const derivedDir = path.join(outputDir, 'derived-documents');
      await fs.ensureDir(derivedDir);

      // Read all source content
      const sourceContent = await this.readSourceContent(outputDir);
      
      // Generate documents in batches
      const batches = this.createBatches(selectedDocuments, this.maxConcurrent);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        const batchPromises = batch.map(async (docSpec) => {
          if (progressCallback) {
            progressCallback({
              type: 'document_progress',
              documentId: docSpec.id,
              status: 'generating',
              title: docSpec.title
            });
          }

          try {
            const document = await this.generateSingleDocument(docSpec, sourceContent);
            const fileName = `${docSpec.tier}-${docSpec.type}.md`;
            const filePath = path.join(derivedDir, fileName);
            
            await fs.writeFile(filePath, document);
            
            results.documentsGenerated.push({
              id: docSpec.id,
              title: docSpec.title,
              fileName: fileName,
              path: filePath,
              wordCount: document.split(' ').length
            });

            if (progressCallback) {
              progressCallback({
                type: 'document_progress',
                documentId: docSpec.id,
                status: 'completed',
                title: docSpec.title,
                fileName: fileName
              });
            }

          } catch (error) {
            console.error(`Error generating document ${docSpec.id}:`, error);
            results.errors.push({
              documentId: docSpec.id,
              title: docSpec.title,
              error: error.message
            });

            if (progressCallback) {
              progressCallback({
                type: 'document_progress', 
                documentId: docSpec.id,
                status: 'failed',
                title: docSpec.title,
                error: error.message
              });
            }
          }
        });

        await Promise.all(batchPromises);
      }

      // Generate index file for derived documents
      await this.generateDerivedDocumentsIndex(derivedDir, results.documentsGenerated);

      return results;

    } catch (error) {
      console.error('Error in document generation:', error);
      return {
        success: false,
        error: error.message,
        documentsGenerated: [],
        errors: []
      };
    }
  }

  // Read and combine all source content files
  async readSourceContent(outputDir) {
    const files = await fs.readdir(outputDir);
    const textFiles = files.filter(file => file.endsWith('.txt'));
    
    const sourceContent = {
      combined: '',
      byPattern: {}
    };

    for (const file of textFiles) {
      const content = await fs.readFile(path.join(outputDir, file), 'utf8');
      sourceContent.combined += content + '\n\n---\n\n';
      
      // Extract pattern name from filename (e.g., "01-youtube_summary.txt" -> "youtube_summary")
      const patternMatch = file.match(/\d+-(.+)\.txt$/);
      if (patternMatch) {
        sourceContent.byPattern[patternMatch[1]] = content;
      }
    }

    return sourceContent;
  }

  // Create processing batches to avoid overwhelming the system
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // Generate a single document based on specification and source content
  async generateSingleDocument(docSpec, sourceContent) {
    const prompt = `You are an expert technical writer and content creator. Your task is to generate a high-quality professional document based on the provided content analysis from a YouTube video. The document should be tailored for the audience and purpose specified.

Document Specification:
- Title: ${docSpec.title}
- Tier: ${docSpec.tier}
- Audience: ${docSpec.audience}
- Purpose: ${docSpec.purpose}
- Estimated Length: ${docSpec.estimatedLength}

Source Content (from YouTube video analysis):
${sourceContent.combined}

Generate the full content of the document in Markdown format. Ensure it is well-structured, clear, concise, and directly addresses the document's purpose and audience. Do NOT include any introductory or concluding remarks outside the document content itself.`;

    console.log(`Generating document: ${docSpec.title}`);
    const fabricResult = await this.fabric.runFabricPattern(
      `generate_document_${docSpec.id}`, // Unique pattern name for this document generation
      prompt,
      'text', // Expecting text output from fabric
      true // isRawPrompt
    );

    return fabricResult.output;
  }

  // Get document template based on type and tier
  getDocumentTemplate(docSpec) {
    // Template structure for different document types
    const baseTemplate = `# ${docSpec.title}

**Target Audience**: ${docSpec.audience}
**Purpose**: ${docSpec.purpose}
**Document Type**: ${docSpec.tier.charAt(0).toUpperCase() + docSpec.tier.slice(1)} - ${docSpec.type}

---

## Executive Summary

[2-minute overview of key takeaways and value propositions]

## Content Overview

[Main content organized for target audience]

## Key Insights

[Primary insights extracted from source material]

## Actionable Recommendations  

[Specific, implementable guidance]

## Next Steps

[Clear action items and follow-up recommendations]

---

*Generated by Fabric Studio - Document Laboratory*
*Source: Fabric pattern analysis of video content*
*Generated: ${new Date().toISOString()}*
`;

    return baseTemplate;
  }

  // Populate template with actual content (simplified version)
  populateTemplate(template, docSpec, sourceContent) {
    // In a full implementation, this would use AI to intelligently
    // populate the template with relevant content from sourceContent
    
    // For now, we'll create a basic document structure
    let document = template;
    
    // Add some source content insights
    if (sourceContent.byPattern.extract_insights) {
      document = document.replace(
        '[Primary insights extracted from source material]',
        sourceContent.byPattern.extract_insights.substring(0, 1000) + '...'
      );
    }
    
    if (sourceContent.byPattern.extract_recommendations) {
      document = document.replace(
        '[Specific, implementable guidance]',
        sourceContent.byPattern.extract_recommendations.substring(0, 1000) + '...'
      );
    }

    return document;
  }

  // Generate index file for derived documents folder
  async generateDerivedDocumentsIndex(derivedDir, documentsGenerated) {
    const indexContent = `# Derived Documents Index

Generated on: ${new Date().toISOString()}

## Document Portfolio

${documentsGenerated.map(doc => `
### ${doc.title}
- **File**: ${doc.fileName}
- **Word Count**: ${doc.wordCount}
- **Type**: Professional Document
`).join('\n')}

## Usage Guide

These documents have been generated from the source fabric pattern analysis to serve specific professional audiences and use cases. Each document is optimized for its target audience and purpose.

---

*Generated by Fabric Studio - Document Laboratory*
`;

    await fs.writeFile(path.join(derivedDir, 'index.md'), indexContent);
  }
}

module.exports = DocumentLaboratory;