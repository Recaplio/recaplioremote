'use client';

import { useState } from 'react';
import { 
  BookOpenIcon, 
  ClockIcon, 
  PlayIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface ReadingProgressProps {
  currentSectionIndex: number;
  totalSections: number;
  readingProgress: number;
  sectionPreviews?: Array<{
    index: number;
    title?: string;
    preview: string;
    wordCount: number;
    estimatedReadingTime: number;
    isCompleted?: boolean;
  }>;
  onSectionSelect: (sectionIndex: number) => void;
  readingVelocity?: number; // words per minute
}

export default function ReadingProgress({
  currentSectionIndex,
  totalSections,
  readingProgress,
  sectionPreviews = [],
  onSectionSelect,
  readingVelocity = 200
}: ReadingProgressProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getCompletedSections = () => {
    return sectionPreviews.filter(section => section.isCompleted || section.index < currentSectionIndex).length;
  };

  const getRemainingTime = () => {
    const remainingSections = sectionPreviews.slice(currentSectionIndex + 1);
    const remainingWords = remainingSections.reduce((total, section) => total + section.wordCount, 0);
    return Math.round(remainingWords / readingVelocity);
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Compact Progress Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <BookOpenIcon className="w-5 h-5 text-brand-500" />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Section {currentSectionIndex + 1} of {totalSections}
              </span>
              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
                <span>{getCompletedSections()} completed</span>
                {getRemainingTime() > 0 && (
                  <>
                    <span>•</span>
                    <ClockIcon className="w-3 h-3" />
                    <span>{formatTime(getRemainingTime())} remaining</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Reading Map'}
          </button>
        </div>

        {/* Progress Bar with Section Markers */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-brand-500 to-secondary-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${readingProgress}%` }}
            />
          </div>
          
          {/* Section Markers */}
          <div className="absolute top-0 left-0 w-full h-2 flex">
            {Array.from({ length: totalSections }, (_, i) => {
              const position = (i / (totalSections - 1)) * 100;
              const isCompleted = i < currentSectionIndex;
              const isCurrent = i === currentSectionIndex;
              
              return (
                <button
                  key={i}
                  onClick={() => onSectionSelect(i)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2"
                  style={{ left: `${position}%` }}
                  title={sectionPreviews[i]?.title || `Section ${i + 1}`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 transition-all duration-200 hover:scale-125 ${
                    isCurrent 
                      ? 'bg-brand-500 border-white shadow-lg' 
                      : isCompleted 
                        ? 'bg-green-500 border-white' 
                        : 'bg-white border-gray-300 hover:border-brand-400'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expanded Reading Map */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="px-4 py-4">
            <div className="grid gap-3 max-h-64 overflow-y-auto">
              {sectionPreviews.map((section, index) => {
                const isCompleted = section.isCompleted || index < currentSectionIndex;
                const isCurrent = index === currentSectionIndex;
                const isUpcoming = index > currentSectionIndex;
                
                return (
                  <button
                    key={index}
                    onClick={() => onSectionSelect(index)}
                    className={`text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      isCurrent 
                        ? 'bg-brand-50 border-brand-200 shadow-sm' 
                        : isCompleted 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-1">
                          {/* Status Icon */}
                          <div className="mr-2 flex-shrink-0">
                            {isCompleted ? (
                              <CheckCircleIconSolid className="w-4 h-4 text-green-500" />
                            ) : isCurrent ? (
                              <PlayIcon className="w-4 h-4 text-brand-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                          
                          {/* Section Title */}
                          <span className={`text-sm font-medium truncate ${
                            isCurrent ? 'text-brand-700' : isCompleted ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {section.title || `Section ${index + 1}`}
                          </span>
                          
                          {/* Status Badge */}
                          {isCurrent && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-brand-100 text-brand-700 rounded-full">
                              Reading
                            </span>
                          )}
                        </div>
                        
                        {/* Section Preview */}
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {section.preview}
                        </p>
                        
                        {/* Reading Stats */}
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <div className="flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            <span>{formatTime(section.estimatedReadingTime)}</span>
                          </div>
                          <span>{section.wordCount.toLocaleString()} words</span>
                          {isUpcoming && (
                            <span className="text-brand-600">• Upcoming</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Section Number */}
                      <div className="ml-3 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded ${
                          isCurrent 
                            ? 'bg-brand-100 text-brand-700' 
                            : isCompleted 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Reading Statistics */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {getCompletedSections()}
                  </div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-brand-600">
                    {readingProgress}%
                  </div>
                  <div className="text-xs text-gray-500">Progress</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatTime(getRemainingTime())}
                  </div>
                  <div className="text-xs text-gray-500">Remaining</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 