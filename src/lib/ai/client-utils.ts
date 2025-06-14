export type UserTier = 'FREE' | 'PREMIUM' | 'PRO';
export type ReadingMode = 'fiction' | 'non-fiction';
export type KnowledgeLens = 'literary' | 'knowledge';

// Quick action button configurations
export interface QuickActionButton {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  category: 'analysis' | 'summary' | 'character' | 'context' | 'learning' | 'creative' | 'discussion' | 'connections';
  isPrimary?: boolean; // For persistent display
}

export function getQuickActionButtons(readingMode: ReadingMode, knowledgeLens: KnowledgeLens): QuickActionButton[] {
  const baseButtons: QuickActionButton[] = [
    {
      id: 'summarize_chunk',
      label: 'Summarize This Section',
      prompt: 'Please provide a clear, well-structured summary of this current section, highlighting the most important points and key developments.',
      icon: '📝',
      category: 'summary',
      isPrimary: true
    }
  ];

  if (readingMode === 'fiction') {
    if (knowledgeLens === 'literary') {
      return [
        ...baseButtons,
        // Primary actions (always visible)
        {
          id: 'character_analysis',
          label: 'Character Analysis',
          prompt: 'Analyze the characters in this section. What are their motivations, development, and relationships? How do they contribute to the story?',
          icon: '👥',
          category: 'character',
          isPrimary: true
        },
        {
          id: 'themes_symbolism',
          label: 'Themes & Symbolism',
          prompt: 'What themes and symbolic elements are present in this section? How do they connect to the broader narrative and author\'s message?',
          icon: '🎭',
          category: 'analysis',
          isPrimary: true
        },
        {
          id: 'literary_devices',
          label: 'Literary Techniques',
          prompt: 'What literary devices and techniques is the author using here? How do they enhance the storytelling and create meaning?',
          icon: '✍️',
          category: 'analysis',
          isPrimary: true
        },
        {
          id: 'plot_significance',
          label: 'Plot Significance',
          prompt: 'How does this section advance the plot? What are the key events and their significance to the overall story arc?',
          icon: '📖',
          category: 'context',
          isPrimary: true
        },
        
        // Expanded actions (appear on expand)
        {
          id: 'mood_atmosphere',
          label: 'Mood & Atmosphere',
          prompt: 'Describe the mood and atmosphere created in this section. How does the author establish the emotional tone and setting?',
          icon: '🌙',
          category: 'analysis'
        },
        {
          id: 'narrative_perspective',
          label: 'Narrative Perspective',
          prompt: 'Analyze the narrative perspective and point of view in this section. How does it affect our understanding of events and characters?',
          icon: '👁️',
          category: 'analysis'
        },
        {
          id: 'dialogue_analysis',
          label: 'Dialogue Analysis',
          prompt: 'Examine the dialogue in this section. What does it reveal about characters, relationships, and the story\'s progression?',
          icon: '💬',
          category: 'character'
        },
        {
          id: 'foreshadowing_hints',
          label: 'Foreshadowing & Hints',
          prompt: 'Identify any foreshadowing, hints, or clues in this section. What might they suggest about future events?',
          icon: '🔮',
          category: 'analysis'
        },
        {
          id: 'setting_significance',
          label: 'Setting & Place',
          prompt: 'How does the setting contribute to this section? What role does place, time, and environment play in the narrative?',
          icon: '🏞️',
          category: 'context'
        },
        {
          id: 'author_craft',
          label: 'Author\'s Craft',
          prompt: 'Examine the author\'s craftsmanship in this section. What specific techniques make this passage effective or memorable?',
          icon: '🎨',
          category: 'analysis'
        },
        {
          id: 'emotional_impact',
          label: 'Emotional Impact',
          prompt: 'What emotions does this section evoke? How does the author create emotional resonance with readers?',
          icon: '💝',
          category: 'learning'
        },
        {
          id: 'creative_interpretation',
          label: 'Creative Interpretation',
          prompt: 'Offer a creative interpretation of this section. What alternative meanings or perspectives could be explored?',
          icon: '🎪',
          category: 'creative'
        },
        {
          id: 'discussion_questions',
          label: 'Discussion Questions',
          prompt: 'Generate thought-provoking discussion questions based on this section that would spark interesting conversations.',
          icon: '❓',
          category: 'discussion'
        },
        {
          id: 'literary_connections',
          label: 'Literary Connections',
          prompt: 'What connections can you draw between this section and other literary works, movements, or authors?',
          icon: '🔗',
          category: 'connections'
        },
        {
          id: 'reader_response',
          label: 'Reader Response',
          prompt: 'How might different readers respond to this section? What personal connections or reactions might it evoke?',
          icon: '🤔',
          category: 'learning'
        }
      ];
    } else { // knowledge lens
      return [
        ...baseButtons,
        // Primary actions (always visible)
        {
          id: 'key_insights',
          label: 'Key Insights',
          prompt: 'What are the main insights and takeaways from this section? What can we learn from the characters\' actions and decisions?',
          icon: '💡',
          category: 'analysis',
          isPrimary: true
        },
        {
          id: 'character_lessons',
          label: 'Character Lessons',
          prompt: 'What lessons about human nature, relationships, or life can we extract from the characters and their experiences in this section?',
          icon: '🎓',
          category: 'character',
          isPrimary: true
        },
        {
          id: 'historical_context',
          label: 'Historical Context',
          prompt: 'What historical, social, or cultural context is important for understanding this section? How does it reflect the time period?',
          icon: '🏛️',
          category: 'context',
          isPrimary: true
        },
        {
          id: 'practical_wisdom',
          label: 'Practical Wisdom',
          prompt: 'What practical wisdom or life principles can be drawn from this section? How might these insights apply to modern life?',
          icon: '🧭',
          category: 'analysis',
          isPrimary: true
        },
        
        // Expanded actions (appear on expand)
        {
          id: 'moral_dilemmas',
          label: 'Moral Dilemmas',
          prompt: 'What moral or ethical dilemmas are presented in this section? How do characters navigate difficult choices?',
          icon: '⚖️',
          category: 'learning'
        },
        {
          id: 'life_lessons',
          label: 'Life Lessons',
          prompt: 'What specific life lessons can modern readers learn from the events and character decisions in this section?',
          icon: '📚',
          category: 'learning'
        },
        {
          id: 'relationship_dynamics',
          label: 'Relationship Dynamics',
          prompt: 'Analyze the relationship dynamics in this section. What can we learn about human connections and interactions?',
          icon: '🤝',
          category: 'character'
        },
        {
          id: 'personal_growth',
          label: 'Personal Growth',
          prompt: 'How do characters grow or change in this section? What does this teach us about personal development?',
          icon: '🌱',
          category: 'character'
        },
        {
          id: 'social_commentary',
          label: 'Social Commentary',
          prompt: 'What social issues or commentary does this section address? How are they relevant to contemporary society?',
          icon: '🏛️',
          category: 'context'
        },
        {
          id: 'universal_themes',
          label: 'Universal Themes',
          prompt: 'What universal human themes are explored in this section? How do they transcend time and culture?',
          icon: '🌍',
          category: 'connections'
        },
        {
          id: 'modern_parallels',
          label: 'Modern Parallels',
          prompt: 'Draw parallels between the situations in this section and modern life. What similarities can you identify?',
          icon: '🔄',
          category: 'connections'
        },
        {
          id: 'reflection_prompts',
          label: 'Reflection Prompts',
          prompt: 'Create personal reflection prompts based on this section to help readers connect the story to their own lives.',
          icon: '🪞',
          category: 'learning'
        },
        {
          id: 'creative_applications',
          label: 'Creative Applications',
          prompt: 'How could the ideas or situations from this section inspire creative projects, writing, or artistic expression?',
          icon: '🎨',
          category: 'creative'
        },
        {
          id: 'book_club_discussion',
          label: 'Book Club Discussion',
          prompt: 'Generate engaging book club discussion topics and questions based on this section.',
          icon: '📖',
          category: 'discussion'
        }
      ];
    }
  } else { // non-fiction
    if (knowledgeLens === 'literary') {
      return [
        ...baseButtons,
        // Primary actions (always visible)
        {
          id: 'argument_structure',
          label: 'Argument Structure',
          prompt: 'How is the author structuring their argument in this section? What rhetorical techniques and evidence are they using?',
          icon: '🏗️',
          category: 'analysis',
          isPrimary: true
        },
        {
          id: 'writing_style',
          label: 'Writing Style',
          prompt: 'Analyze the author\'s writing style in this section. How do their word choices, tone, and structure serve their purpose?',
          icon: '🖋️',
          category: 'analysis',
          isPrimary: true
        },
        {
          id: 'persuasive_elements',
          label: 'Persuasive Elements',
          prompt: 'What persuasive techniques is the author using? How effectively do they build their case and engage the reader?',
          icon: '🎯',
          category: 'analysis',
          isPrimary: true
        },
        
        // Expanded actions (appear on expand)
        {
          id: 'rhetorical_devices',
          label: 'Rhetorical Devices',
          prompt: 'Identify and analyze the rhetorical devices used in this section. How do they enhance the author\'s message?',
          icon: '🎭',
          category: 'analysis'
        },
        {
          id: 'audience_analysis',
          label: 'Audience & Purpose',
          prompt: 'Who is the intended audience for this section? What is the author\'s primary purpose in writing it?',
          icon: '🎪',
          category: 'context'
        },
        {
          id: 'logical_structure',
          label: 'Logical Structure',
          prompt: 'Examine the logical flow and organization of ideas in this section. How does the structure support the argument?',
          icon: '🧩',
          category: 'analysis'
        },
        {
          id: 'evidence_quality',
          label: 'Evidence Quality',
          prompt: 'Evaluate the quality and credibility of evidence presented in this section. How convincing is it?',
          icon: '🔍',
          category: 'analysis'
        },
        {
          id: 'counterarguments',
          label: 'Counterarguments',
          prompt: 'What potential counterarguments or opposing views does the author address or ignore in this section?',
          icon: '⚔️',
          category: 'analysis'
        },
        {
          id: 'historical_rhetoric',
          label: 'Historical Context',
          prompt: 'How does this section reflect the rhetorical conventions and concerns of its historical period?',
          icon: '📜',
          category: 'context'
        },
        {
          id: 'comparative_analysis',
          label: 'Comparative Analysis',
          prompt: 'Compare this section\'s approach to similar arguments or topics by other authors or in other works.',
          icon: '📊',
          category: 'connections'
        },
        {
          id: 'teaching_moments',
          label: 'Teaching Moments',
          prompt: 'What makes this section particularly effective for teaching about rhetoric, argumentation, or writing?',
          icon: '👨‍🏫',
          category: 'learning'
        },
        {
          id: 'creative_response',
          label: 'Creative Response',
          prompt: 'How might you creatively respond to or reimagine the arguments presented in this section?',
          icon: '🎨',
          category: 'creative'
        },
        {
          id: 'debate_topics',
          label: 'Debate Topics',
          prompt: 'Generate debate topics or discussion questions based on the arguments and ideas in this section.',
          icon: '🗣️',
          category: 'discussion'
        }
      ];
    } else { // knowledge lens
      return [
        ...baseButtons,
        // Primary actions (always visible)
        {
          id: 'core_concepts',
          label: 'Core Concepts',
          prompt: 'What are the main concepts, theories, or frameworks presented in this section? How do they connect to the broader topic?',
          icon: '🧠',
          category: 'analysis',
          isPrimary: true
        },
        {
          id: 'evidence_analysis',
          label: 'Evidence & Data',
          prompt: 'What evidence, data, or examples does the author provide? How strong and relevant is this support for their arguments?',
          icon: '📊',
          category: 'analysis',
          isPrimary: true
        },
        {
          id: 'practical_applications',
          label: 'Practical Applications',
          prompt: 'How can the ideas in this section be applied practically? What are the real-world implications and uses?',
          icon: '⚙️',
          category: 'context',
          isPrimary: true
        },
        {
          id: 'critical_evaluation',
          label: 'Critical Evaluation',
          prompt: 'Critically evaluate the arguments and ideas in this section. What are the strengths, weaknesses, and potential counterarguments?',
          icon: '⚖️',
          category: 'analysis',
          isPrimary: true
        },
        
        // Expanded actions (appear on expand)
        {
          id: 'key_definitions',
          label: 'Key Definitions',
          prompt: 'Define and explain the key terms, concepts, and terminology introduced in this section.',
          icon: '📖',
          category: 'learning'
        },
        {
          id: 'methodology_analysis',
          label: 'Methodology',
          prompt: 'Analyze the research methods, approaches, or frameworks the author uses to support their points.',
          icon: '🔬',
          category: 'analysis'
        },
        {
          id: 'implications_consequences',
          label: 'Implications',
          prompt: 'What are the broader implications and potential consequences of the ideas presented in this section?',
          icon: '🌊',
          category: 'context'
        },
        {
          id: 'interdisciplinary_connections',
          label: 'Cross-Disciplinary Links',
          prompt: 'How do the ideas in this section connect to other fields, disciplines, or areas of knowledge?',
          icon: '🔗',
          category: 'connections'
        },
        {
          id: 'case_studies',
          label: 'Case Studies',
          prompt: 'Identify or create case studies that illustrate the concepts and principles discussed in this section.',
          icon: '📋',
          category: 'learning'
        },
        {
          id: 'problem_solving',
          label: 'Problem-Solving',
          prompt: 'How can the concepts in this section be used to solve real-world problems or challenges?',
          icon: '🧩',
          category: 'learning'
        },
        {
          id: 'future_research',
          label: 'Future Research',
          prompt: 'What questions for future research or investigation does this section raise or suggest?',
          icon: '🔮',
          category: 'learning'
        },
        {
          id: 'implementation_guide',
          label: 'Implementation Guide',
          prompt: 'Create a practical guide for implementing or applying the ideas from this section in real situations.',
          icon: '📝',
          category: 'learning'
        },
        {
          id: 'alternative_perspectives',
          label: 'Alternative Views',
          prompt: 'What alternative perspectives or competing theories exist regarding the topics discussed in this section?',
          icon: '🔄',
          category: 'analysis'
        },
        {
          id: 'creative_synthesis',
          label: 'Creative Synthesis',
          prompt: 'How might you creatively combine or synthesize the ideas in this section with other concepts or fields?',
          icon: '🎨',
          category: 'creative'
        },
        {
          id: 'workshop_activities',
          label: 'Workshop Activities',
          prompt: 'Design workshop activities or exercises that would help others learn and apply the concepts from this section.',
          icon: '🛠️',
          category: 'discussion'
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