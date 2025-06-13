export type UserTier = 'FREE' | 'PREMIUM' | 'PRO';
export type ReadingMode = 'fiction' | 'non-fiction';
export type KnowledgeLens = 'literary' | 'knowledge';

// Quick action button configurations
export interface QuickActionButton {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  category: 'analysis' | 'summary' | 'character' | 'context';
}

export function getQuickActionButtons(readingMode: ReadingMode, knowledgeLens: KnowledgeLens): QuickActionButton[] {
  const baseButtons: QuickActionButton[] = [
    {
      id: 'summarize_chunk',
      label: 'Summarize This Section',
      prompt: 'Please provide a clear, well-structured summary of this current section, highlighting the most important points and key developments.',
      icon: '📝',
      category: 'summary'
    }
  ];

  if (readingMode === 'fiction') {
    if (knowledgeLens === 'literary') {
      return [
        ...baseButtons,
        {
          id: 'character_analysis',
          label: 'Character Analysis',
          prompt: 'Analyze the characters in this section. What are their motivations, development, and relationships? How do they contribute to the story?',
          icon: '👥',
          category: 'character'
        },
        {
          id: 'themes_symbolism',
          label: 'Themes & Symbolism',
          prompt: 'What themes and symbolic elements are present in this section? How do they connect to the broader narrative and author\'s message?',
          icon: '🎭',
          category: 'analysis'
        },
        {
          id: 'literary_devices',
          label: 'Literary Techniques',
          prompt: 'What literary devices and techniques is the author using here? How do they enhance the storytelling and create meaning?',
          icon: '✍️',
          category: 'analysis'
        },
        {
          id: 'plot_significance',
          label: 'Plot Significance',
          prompt: 'How does this section advance the plot? What are the key events and their significance to the overall story arc?',
          icon: '📖',
          category: 'context'
        }
      ];
    } else { // knowledge lens
      return [
        ...baseButtons,
        {
          id: 'key_insights',
          label: 'Key Insights',
          prompt: 'What are the main insights and takeaways from this section? What can we learn from the characters\' actions and decisions?',
          icon: '💡',
          category: 'analysis'
        },
        {
          id: 'character_lessons',
          label: 'Character Lessons',
          prompt: 'What lessons about human nature, relationships, or life can we extract from the characters and their experiences in this section?',
          icon: '🎓',
          category: 'character'
        },
        {
          id: 'historical_context',
          label: 'Historical Context',
          prompt: 'What historical, social, or cultural context is important for understanding this section? How does it reflect the time period?',
          icon: '🏛️',
          category: 'context'
        },
        {
          id: 'practical_wisdom',
          label: 'Practical Wisdom',
          prompt: 'What practical wisdom or life principles can be drawn from this section? How might these insights apply to modern life?',
          icon: '🧭',
          category: 'analysis'
        }
      ];
    }
  } else { // non-fiction
    if (knowledgeLens === 'literary') {
      return [
        ...baseButtons,
        {
          id: 'argument_structure',
          label: 'Argument Structure',
          prompt: 'How is the author structuring their argument in this section? What rhetorical techniques and evidence are they using?',
          icon: '🏗️',
          category: 'analysis'
        },
        {
          id: 'writing_style',
          label: 'Writing Style',
          prompt: 'Analyze the author\'s writing style in this section. How do their word choices, tone, and structure serve their purpose?',
          icon: '🖋️',
          category: 'analysis'
        },
        {
          id: 'persuasive_elements',
          label: 'Persuasive Elements',
          prompt: 'What persuasive techniques is the author using? How effectively do they build their case and engage the reader?',
          icon: '🎯',
          category: 'analysis'
        }
      ];
    } else { // knowledge lens
      return [
        ...baseButtons,
        {
          id: 'core_concepts',
          label: 'Core Concepts',
          prompt: 'What are the main concepts, theories, or frameworks presented in this section? How do they connect to the broader topic?',
          icon: '🧠',
          category: 'analysis'
        },
        {
          id: 'evidence_analysis',
          label: 'Evidence & Data',
          prompt: 'What evidence, data, or examples does the author provide? How strong and relevant is this support for their arguments?',
          icon: '📊',
          category: 'analysis'
        },
        {
          id: 'practical_applications',
          label: 'Practical Applications',
          prompt: 'How can the ideas in this section be applied practically? What are the real-world implications and uses?',
          icon: '⚙️',
          category: 'context'
        },
        {
          id: 'critical_evaluation',
          label: 'Critical Evaluation',
          prompt: 'Critically evaluate the arguments and ideas in this section. What are the strengths, weaknesses, and potential counterarguments?',
          icon: '⚖️',
          category: 'analysis'
        }
      ];
    }
  }
}

// Client-side utility functions for query analysis
export function analyzeQueryComplexity(query: string): 'simple' | 'moderate' | 'advanced' {
  const queryLower = query.toLowerCase();
  
  // Simple queries
  if (queryLower.includes('what is') || queryLower.includes('who is') || queryLower.includes('summarize')) {
    return 'simple';
  }
  
  // Advanced queries
  if (queryLower.includes('analyze') || queryLower.includes('compare') || 
      queryLower.includes('evaluate') || queryLower.includes('critique') ||
      queryLower.includes('interpret') || queryLower.includes('significance')) {
    return 'advanced';
  }
  
  return 'moderate';
}

export function extractTopicsFromQuery(query: string): string[] {
  const topicKeywords = {
    'character': ['character', 'protagonist', 'antagonist', 'personality', 'motivation'],
    'theme': ['theme', 'meaning', 'message', 'symbolism', 'metaphor'],
    'plot': ['plot', 'story', 'narrative', 'events', 'sequence'],
    'style': ['style', 'writing', 'language', 'tone', 'voice'],
    'context': ['context', 'historical', 'background', 'setting', 'period'],
    'analysis': ['analyze', 'examine', 'evaluate', 'critique', 'interpret']
  };

  const queryLower = query.toLowerCase();
  const detectedTopics: string[] = [];

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      detectedTopics.push(topic);
    }
  }

  return detectedTopics;
} 