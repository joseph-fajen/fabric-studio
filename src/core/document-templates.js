// Document Templates - Professional document generation templates based on the sophisticated prompt system

class DocumentTemplates {
  constructor() {
    // Enhanced prompt for AI-powered document generation
    this.masterPrompt = `You are an expert content strategist and technical writer with deep expertise across multiple domains. Your mission is to transform processed content files into a comprehensive document that serves specific professional audiences with actionable, high-value content.

## DOCUMENT GENERATION INSTRUCTIONS

### Content Excellence Standards:
- **Authority**: Write with expertise level appropriate to subject matter complexity
- **Synthesis**: Combine insights from multiple sources into coherent narratives  
- **Actionability**: Provide specific, implementable guidance with clear next steps
- **Professional Polish**: Industry-standard formatting, terminology, and presentation
- **Audience Optimization**: Appropriate depth, pace, and complexity for target users

### Document Structure Guidelines:
- **Executive Summary**: Key takeaways accessible in 2 minutes
- **Clear Navigation**: Logical flow with descriptive headings and subheadings
- **Progressive Disclosure**: Basic concepts before advanced implementation
- **Practical Elements**: Examples, templates, checklists where appropriate
- **Cross-References**: Links between related concepts

### Content Synthesis Methodology:
- **Theme Integration**: Weave insights from multiple sources into unified perspectives
- **Conflict Resolution**: Address conflicting information with nuanced analysis
- **Gap Filling**: Use domain expertise to complete logical connections
- **Context Preservation**: Maintain original insights while improving presentation
- **Value Amplification**: Extract maximum utility from available information

Generate a comprehensive {DOCUMENT_TYPE} document targeting {TARGET_AUDIENCE} with the following purpose: {DOCUMENT_PURPOSE}

Source content includes: {SOURCE_PATTERNS}

Focus on {COMPLEXITY_LEVEL} complexity level and ensure the document is {ESTIMATED_LENGTH}.
`;

    // Document-specific templates
    this.documentTemplates = {
      'setup-guide': {
        structure: `# {TITLE}

## Prerequisites & Requirements
{PREREQUISITES_SECTION}

## Quick Start Guide
{QUICKSTART_SECTION}

## Detailed Configuration
{CONFIGURATION_SECTION}

## Troubleshooting Common Issues
{TROUBLESHOOTING_SECTION}

## Security Considerations
{SECURITY_SECTION}

## Advanced Configuration
{ADVANCED_SECTION}

## Best Practices
{BEST_PRACTICES_SECTION}

## Additional Resources
{RESOURCES_SECTION}`,
        prompts: {
          PREREQUISITES_SECTION: "Extract and organize all prerequisite requirements, dependencies, and setup conditions needed before implementation.",
          QUICKSTART_SECTION: "Create a streamlined quick start guide with the minimum steps needed to get up and running.",
          CONFIGURATION_SECTION: "Provide detailed configuration steps with explanations, code examples, and validation procedures.",
          TROUBLESHOOTING_SECTION: "Identify common issues and provide clear diagnostic and resolution procedures.",
          SECURITY_SECTION: "Highlight security considerations, best practices, and compliance requirements.",
          ADVANCED_SECTION: "Cover advanced configuration options, optimization techniques, and expert-level customizations.",
          BEST_PRACTICES_SECTION: "Synthesize industry best practices and proven patterns from the content.",
          RESOURCES_SECTION: "Compile additional resources, tools, and references for further learning."
        }
      },

      'market-analysis': {
        structure: `# {TITLE}

## Executive Summary
{EXECUTIVE_SUMMARY}

## Market Landscape Overview
{MARKET_LANDSCAPE}

## Competitive Analysis
{COMPETITIVE_ANALYSIS}

## Technology Trends & Drivers  
{TECHNOLOGY_TRENDS}

## Opportunities & Threats
{OPPORTUNITIES_THREATS}

## Strategic Recommendations
{STRATEGIC_RECOMMENDATIONS}

## Implementation Roadmap
{IMPLEMENTATION_ROADMAP}

## Risk Assessment
{RISK_ASSESSMENT}

## Success Metrics & KPIs
{SUCCESS_METRICS}`,
        prompts: {
          EXECUTIVE_SUMMARY: "Create a 2-3 paragraph executive summary highlighting the key strategic insights and recommendations.",
          MARKET_LANDSCAPE: "Analyze the current market conditions, size, growth, and key dynamics based on the content.",
          COMPETITIVE_ANALYSIS: "Identify key competitors, their strengths/weaknesses, and competitive positioning insights.",
          TECHNOLOGY_TRENDS: "Extract and analyze technology trends, innovations, and market drivers affecting this space.",
          OPPORTUNITIES_THREATS: "Identify specific market opportunities and potential threats or challenges.",
          STRATEGIC_RECOMMENDATIONS: "Provide actionable strategic recommendations with clear rationale and expected outcomes.",
          IMPLEMENTATION_ROADMAP: "Create a phased implementation approach with timelines and milestones.",
          RISK_ASSESSMENT: "Identify key risks and mitigation strategies for recommended approaches.",
          SUCCESS_METRICS: "Define measurable success criteria and key performance indicators."
        }
      },

      'learning-path': {
        structure: `# {TITLE}

## Learning Objectives  
{LEARNING_OBJECTIVES}

## Prerequisites Assessment
{PREREQUISITES_ASSESSMENT}

## Learning Path Overview
{LEARNING_PATH_OVERVIEW}

## Foundation Level (Beginner)
{FOUNDATION_LEVEL}

## Intermediate Level
{INTERMEDIATE_LEVEL}

## Advanced Level  
{ADVANCED_LEVEL}

## Hands-on Exercises
{HANDS_ON_EXERCISES}

## Assessment & Validation
{ASSESSMENT_VALIDATION}

## Continuing Education
{CONTINUING_EDUCATION}

## Resources & References
{RESOURCES_REFERENCES}`,
        prompts: {
          LEARNING_OBJECTIVES: "Define clear, measurable learning objectives that students will achieve by completing this path.",
          PREREQUISITES_ASSESSMENT: "Identify prerequisite knowledge and skills needed to succeed in this learning path.",
          LEARNING_PATH_OVERVIEW: "Provide a high-level roadmap of the learning journey with estimated timelines.",
          FOUNDATION_LEVEL: "Create foundational learning content covering essential concepts and basic skills.",
          INTERMEDIATE_LEVEL: "Develop intermediate content building on foundations with practical applications.",
          ADVANCED_LEVEL: "Design advanced content covering expert-level concepts and complex scenarios.",
          HANDS_ON_EXERCISES: "Create practical exercises and projects that reinforce learning objectives.",
          ASSESSMENT_VALIDATION: "Design assessment methods to validate learning progress and competency.",
          CONTINUING_EDUCATION: "Suggest ongoing learning opportunities and advanced specializations.",
          RESOURCES_REFERENCES: "Compile additional learning resources, tools, and reference materials."
        }
      },

      'business-case': {
        structure: `# {TITLE}

## Executive Summary
{EXECUTIVE_SUMMARY}

## Business Problem & Opportunity
{BUSINESS_PROBLEM}

## Proposed Solution Overview
{SOLUTION_OVERVIEW}

## Financial Analysis & ROI
{FINANCIAL_ANALYSIS}

## Implementation Plan
{IMPLEMENTATION_PLAN}

## Resource Requirements
{RESOURCE_REQUIREMENTS}

## Risk Analysis & Mitigation
{RISK_ANALYSIS}

## Success Metrics & Measurement
{SUCCESS_METRICS}

## Recommendations & Next Steps
{RECOMMENDATIONS}`,
        prompts: {
          EXECUTIVE_SUMMARY: "Create a compelling executive summary that clearly states the business case and expected outcomes.",
          BUSINESS_PROBLEM: "Define the specific business problem or opportunity this solution addresses.",
          SOLUTION_OVERVIEW: "Describe the proposed solution and how it addresses the identified business needs.",
          FINANCIAL_ANALYSIS: "Develop financial projections, cost-benefit analysis, and ROI calculations.",
          IMPLEMENTATION_PLAN: "Create a detailed implementation plan with phases, timelines, and milestones.",
          RESOURCE_REQUIREMENTS: "Identify required human, technical, and financial resources for implementation.",
          RISK_ANALYSIS: "Assess implementation risks and provide detailed mitigation strategies.",
          SUCCESS_METRICS: "Define measurable success criteria and tracking mechanisms.",
          RECOMMENDATIONS: "Provide clear recommendations and specific next steps for decision-makers."
        }
      },

      'quick-reference': {
        structure: `# {TITLE}

## Quick Start Checklist
{QUICK_START_CHECKLIST}

## Key Commands & Shortcuts
{KEY_COMMANDS}

## Common Patterns & Examples
{COMMON_PATTERNS}

## Troubleshooting Quick Fixes
{TROUBLESHOOTING_QUICK_FIXES}

## Configuration Reference
{CONFIGURATION_REFERENCE}

## Best Practices Summary
{BEST_PRACTICES_SUMMARY}

## Additional Resources
{ADDITIONAL_RESOURCES}`,
        prompts: {
          QUICK_START_CHECKLIST: "Create a concise checklist for getting started quickly with key validation points.",
          KEY_COMMANDS: "Extract and organize the most important commands, shortcuts, and procedures.",
          COMMON_PATTERNS: "Identify and present common usage patterns with brief examples.",
          TROUBLESHOOTING_QUICK_FIXES: "Provide quick diagnostic steps and solutions for common issues.",
          CONFIGURATION_REFERENCE: "Create a reference for key configuration options and settings.",
          BEST_PRACTICES_SUMMARY: "Summarize the most important best practices and guidelines.",
          ADDITIONAL_RESOURCES: "List essential resources for quick access to additional help."
        }
      },

      'executive-briefing': {
        structure: `# {TITLE}

## Key Takeaways (30-second read)
{KEY_TAKEAWAYS}

## Strategic Context  
{STRATEGIC_CONTEXT}

## Business Impact & Opportunities
{BUSINESS_IMPACT}

## Technology Implications
{TECHNOLOGY_IMPLICATIONS}

## Resource & Investment Considerations
{RESOURCE_CONSIDERATIONS}

## Risk Factors & Mitigation
{RISK_FACTORS}

## Recommended Actions
{RECOMMENDED_ACTIONS}`,
        prompts: {
          KEY_TAKEAWAYS: "Create 3-5 bullet points that capture the most critical insights for executives.",
          STRATEGIC_CONTEXT: "Provide strategic business context and why this matters for the organization.",
          BUSINESS_IMPACT: "Highlight specific business opportunities, competitive advantages, or revenue implications.",
          TECHNOLOGY_IMPLICATIONS: "Summarize key technology trends and their business implications.",
          RESOURCE_CONSIDERATIONS: "Outline investment requirements and resource implications at a high level.",
          RISK_FACTORS: "Identify key business risks and high-level mitigation approaches.",
          RECOMMENDED_ACTIONS: "Provide clear, actionable recommendations for executive decision-making."
        }
      }
    };

    // Audience-specific voice and tone guidelines
    this.audienceProfiles = {
      'technical': {
        tone: 'precise, detailed, assumes domain knowledge',
        complexity: 'high',
        examples: 'code samples, technical diagrams, implementation details',
        language: 'technical terminology, specific metrics, concrete specifications'
      },
      'strategic': {
        tone: 'strategic focus, ROI-oriented, outcome-focused',
        complexity: 'medium-high',
        examples: 'market data, competitive analysis, financial projections',
        language: 'business terminology, strategic frameworks, measurable outcomes'
      },
      'educational': {
        tone: 'progressive, supportive, example-rich',
        complexity: 'variable based on level',
        examples: 'step-by-step tutorials, exercises, assessments',
        language: 'clear explanations, learning-focused, scaffolded complexity'
      },
      'operational': {
        tone: 'concise, action-oriented, practical',
        complexity: 'low-medium',
        examples: 'checklists, procedures, quick references',
        language: 'clear instructions, minimal jargon, immediate applicability'
      }
    };
  }

  // Get complete document generation prompt for AI
  getDocumentPrompt(docSpec, sourceContent) {
    const template = this.documentTemplates[docSpec.type];
    const audienceProfile = this.audienceProfiles[docSpec.tier];
    
    if (!template || !audienceProfile) {
      throw new Error(`Template not found for ${docSpec.tier}-${docSpec.type}`);
    }

    // Build the complete prompt
    let prompt = this.masterPrompt
      .replace('{DOCUMENT_TYPE}', docSpec.title)
      .replace('{TARGET_AUDIENCE}', docSpec.audience)
      .replace('{DOCUMENT_PURPOSE}', docSpec.purpose)
      .replace('{SOURCE_PATTERNS}', Object.keys(sourceContent.byPattern).join(', '))
      .replace('{COMPLEXITY_LEVEL}', docSpec.complexity)
      .replace('{ESTIMATED_LENGTH}', docSpec.estimatedLength);

    // Add document structure
    prompt += `\n\n## DOCUMENT STRUCTURE TO FOLLOW:\n\n${template.structure}`;

    // Add section-specific prompts
    prompt += `\n\n## SECTION GENERATION GUIDELINES:\n\n`;
    Object.entries(template.prompts).forEach(([section, sectionPrompt]) => {
      prompt += `**${section}**: ${sectionPrompt}\n\n`;
    });

    // Add audience-specific guidelines
    prompt += `\n\n## AUDIENCE-SPECIFIC REQUIREMENTS:\n\n`;
    prompt += `- **Tone**: ${audienceProfile.tone}\n`;
    prompt += `- **Complexity**: ${audienceProfile.complexity}\n`;
    prompt += `- **Examples**: ${audienceProfile.examples}\n`;
    prompt += `- **Language**: ${audienceProfile.language}\n`;

    // Add source content
    prompt += `\n\n## SOURCE CONTENT:\n\n`;
    Object.entries(sourceContent.byPattern).forEach(([pattern, content]) => {
      prompt += `### ${pattern.replace(/_/g, ' ').toUpperCase()}\n${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}\n\n`;
    });

    // Final instructions
    prompt += `\n\n## FINAL INSTRUCTIONS:\n\n`;
    prompt += `Generate a complete, professional ${docSpec.title} document that synthesizes the source content according to the structure and guidelines above. `;
    prompt += `Ensure the document is immediately useful for ${docSpec.audience} and addresses their specific needs and context. `;
    prompt += `The document should be comprehensive, actionable, and professionally formatted.`;

    return prompt;
  }

  // Get available document types
  getAvailableDocumentTypes() {
    const documentTypes = {};
    
    Object.entries(this.documentTemplates).forEach(([type, template]) => {
      documentTypes[type] = {
        type,
        hasTemplate: true,
        sections: Object.keys(template.prompts).length,
        structure: template.structure.split('\n').filter(line => line.startsWith('#')).length
      };
    });

    return documentTypes;
  }

  // Validate document specification
  validateDocumentSpec(docSpec) {
    const errors = [];

    if (!docSpec.type || !this.documentTemplates[docSpec.type]) {
      errors.push(`Unknown document type: ${docSpec.type}`);
    }

    if (!docSpec.tier || !this.audienceProfiles[docSpec.tier]) {
      errors.push(`Unknown audience tier: ${docSpec.tier}`);
    }

    if (!docSpec.title) {
      errors.push('Document title is required');
    }

    if (!docSpec.audience) {
      errors.push('Target audience is required');
    }

    if (!docSpec.purpose) {
      errors.push('Document purpose is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get template structure for preview
  getTemplatePreview(documentType) {
    const template = this.documentTemplates[documentType];
    
    if (!template) {
      return null;
    }

    return {
      type: documentType,
      structure: template.structure,
      sections: Object.keys(template.prompts),
      estimatedSections: Object.keys(template.prompts).length
    };
  }
}

module.exports = DocumentTemplates;