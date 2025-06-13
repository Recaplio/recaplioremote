'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Play, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Brain
} from 'lucide-react';

interface Flashcard {
  id: number;
  front_text: string;
  back_text: string;
  difficulty_level: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  review_count: number;
  correct_count: number;
  created_at: string;
  updated_at: string;
  annotation_id: number | null;
}

interface FlashcardsManagerProps {
  userBookId: number;
  bookTitle: string;
  userTier: 'FREE' | 'PREMIUM' | 'PRO';
}

export default function FlashcardsManager({ userBookId, bookTitle, userTier }: FlashcardsManagerProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [statistics, setStatistics] = useState({
    totalCards: 0,
    dueCards: 0,
    averageAccuracy: 0,
    bookTitle: ''
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [studyMode, setStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);

  const fetchFlashcards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/flashcards/${userBookId}`);
      if (response.ok) {
        const data = await response.json();
        setFlashcards(data.flashcards);
        setStatistics(data.statistics);
      } else {
        console.error('Failed to fetch flashcards');
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error);
    } finally {
      setLoading(false);
    }
  }, [userBookId]);

  useEffect(() => {
    if (userTier === 'PRO') {
      fetchFlashcards();
    }
  }, [fetchFlashcards, userTier]);

  const generateFlashcards = async (textSelection: string, count: number = 5) => {
    try {
      setLoading(true);
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userBookId,
          textSelection,
          count
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchFlashcards(); // Refresh the list
        return data;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate flashcards');
      }
    } catch (error) {
      console.error('Error generating flashcards:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const reviewCard = async (cardId: number, correct: boolean, difficulty?: number) => {
    try {
      const response = await fetch(`/api/flashcards/card/${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct, difficulty })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the card in our local state
        setFlashcards(prev => prev.map(card => 
          card.id === cardId ? data.flashcard : card
        ));
        return data;
      } else {
        throw new Error('Failed to record review');
      }
    } catch (error) {
      console.error('Error reviewing card:', error);
      throw error;
    }
  };

  const deleteCard = async (cardId: number) => {
    try {
      const response = await fetch(`/api/flashcards/card/${cardId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFlashcards(prev => prev.filter(card => card.id !== cardId));
        await fetchFlashcards(); // Refresh statistics
      } else {
        throw new Error('Failed to delete card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const startStudySession = () => {
    const dueCards = flashcards.filter(card => 
      !card.next_review_at || new Date(card.next_review_at) <= new Date()
    );
    setStudyCards(dueCards);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setStudyMode(true);
  };

  const handleStudyResponse = async (correct: boolean) => {
    const currentCard = studyCards[currentCardIndex];
    if (!currentCard) return;

    await reviewCard(currentCard.id, correct);
    
    // Move to next card
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // Study session complete
      setStudyMode(false);
      await fetchFlashcards(); // Refresh data
    }
  };

  const formatAccuracy = (card: Flashcard) => {
    if (card.review_count === 0) return 'New';
    return `${Math.round((card.correct_count / card.review_count) * 100)}%`;
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 5: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading flashcards...</p>
        </CardContent>
      </Card>
    );
  }

  if (studyMode) {
    const currentCard = studyCards[currentCardIndex];
    if (!currentCard) {
      return (
        <Card className="w-full">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">Study Session Complete!</h3>
            <p className="text-gray-600 mb-4">
              You&apos;ve reviewed all due cards. Great job!
            </p>
            <Button onClick={() => setStudyMode(false)}>
              Back to Overview
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Study Session
            </CardTitle>
            <Badge variant="outline">
              {currentCardIndex + 1} / {studyCards.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="min-h-[200px] flex flex-col justify-center">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium mb-4">
                {showAnswer ? 'Answer:' : 'Question:'}
              </h3>
              <p className="text-xl leading-relaxed">
                {showAnswer ? currentCard.back_text : currentCard.front_text}
              </p>
            </div>

            {!showAnswer ? (
              <Button 
                onClick={() => setShowAnswer(true)}
                className="w-full"
              >
                Show Answer
              </Button>
            ) : (
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => handleStudyResponse(false)}
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Incorrect
                </Button>
                <Button
                  onClick={() => handleStudyResponse(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Correct
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Difficulty: Level {currentCard.difficulty_level}</span>
              <span>Accuracy: {formatAccuracy(currentCard)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userTier !== 'PRO') {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm">
        <div className="p-6 text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Flashcards - Pro Feature</h3>
          <p className="text-gray-600 mb-4">
            Create AI-powered flashcards from your highlights and study with spaced repetition.
          </p>
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-md">
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Flashcards - {bookTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalCards}</div>
              <div className="text-sm text-gray-600">Total Cards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.dueCards}</div>
              <div className="text-sm text-gray-600">Due for Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(statistics.averageAccuracy * 100)}%
              </div>
              <div className="text-sm text-gray-600">Avg. Accuracy</div>
            </div>
            <div className="text-center">
              <Button 
                onClick={startStudySession}
                disabled={statistics.dueCards === 0}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Study Now
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">All Cards</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {flashcards.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No flashcards yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first flashcards from highlights or custom text.
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Flashcards
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {flashcards.map((card) => (
                    <Card key={card.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-medium mb-2">{card.front_text}</p>
                            <p className="text-gray-600 text-sm">{card.back_text}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCard(card.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex gap-2">
                            <Badge className={getDifficultyColor(card.difficulty_level)}>
                              Level {card.difficulty_level}
                            </Badge>
                            <Badge variant="outline">
                              {formatAccuracy(card)}
                            </Badge>
                          </div>
                          <div className="text-gray-500">
                            {card.next_review_at && new Date(card.next_review_at) > new Date() 
                              ? `Next: ${new Date(card.next_review_at).toLocaleDateString()}`
                              : 'Due now'
                            }
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <FlashcardGenerator 
                onGenerate={generateFlashcards}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Flashcard Generator Component
interface FlashcardGeneratorProps {
  onGenerate: (text: string, count: number) => Promise<unknown>;
  loading: boolean;
}

function FlashcardGenerator({ onGenerate, loading }: FlashcardGeneratorProps) {
  const [text, setText] = useState('');
  const [count, setCount] = useState(5);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    try {
      await onGenerate(text, count);
      setText('');
      alert('Flashcards generated successfully!');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Failed to generate flashcards. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Generate New Flashcards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Text to convert to flashcards:
          </label>
          <Textarea
            value={text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
            placeholder="Paste text, highlights, or notes that you want to turn into flashcards..."
            rows={6}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Number of flashcards to generate:
          </label>
          <Input
            type="number"
            value={count}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCount(parseInt(e.target.value) || 5)}
            min={1}
            max={20}
            className="w-32"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!text.trim() || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Generate {count} Flashcards
            </>
          )}
        </Button>

        <p className="text-sm text-gray-600">
          AI will analyze your text and create question-answer pairs optimized for learning and retention.
        </p>
      </CardContent>
    </Card>
  );
} 