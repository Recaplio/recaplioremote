"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, ClockIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface SectionSelectorProps {
  basePath: string;
  currentSectionIndex: number;
  totalSections: number;
  sectionPreviews?: Array<{
    index: number;
    title?: string;
    preview: string;
    wordCount: number;
    estimatedReadingTime: number;
  }>;
  disabled?: boolean;
}

export default function SectionSelector({
  basePath,
  currentSectionIndex,
  totalSections,
  sectionPreviews = [],
  disabled = false,
}: SectionSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSectionSelect = (sectionIndex: number) => {
    router.push(`${basePath}?chunk=${sectionIndex}`);
    setIsOpen(false);
  };

  const getCurrentSectionTitle = () => {
    const currentSection = sectionPreviews.find(s => s.index === currentSectionIndex);
    return currentSection?.title || `Section ${currentSectionIndex + 1}`;
  };

  const formatReadingTime = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  if (disabled || totalSections === 0) {
    return (
      <div className="relative">
        <button
          className="flex items-center justify-between w-full min-w-[200px] px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed opacity-50"
          disabled
        >
          <span className="truncate">
            {totalSections > 0 ? getCurrentSectionTitle() : "No Sections"}
          </span>
          <ChevronDownIcon className="w-4 h-4 ml-2 flex-shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Section Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[200px] px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
      >
        <div className="flex items-center min-w-0">
          <DocumentTextIcon className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <span className="truncate font-medium">
            {getCurrentSectionTitle()}
          </span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                Book Sections ({totalSections})
              </span>
              <span className="text-xs text-gray-500">
                Current: {currentSectionIndex + 1}
              </span>
            </div>
          </div>

          {/* Section List */}
          <div className="max-h-80 overflow-y-auto">
            {Array.from({ length: totalSections }, (_, i) => {
              const sectionPreview = sectionPreviews.find(s => s.index === i);
              const isCurrentSection = i === currentSectionIndex;
              
              return (
                <button
                  key={i}
                  onClick={() => handleSectionSelect(i)}
                  className={`w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                    isCurrentSection ? 'bg-brand-50 border-brand-100' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Section Title */}
                      <div className="flex items-center mb-1">
                        <span className={`text-sm font-medium ${
                          isCurrentSection ? 'text-brand-700' : 'text-gray-900'
                        }`}>
                          {sectionPreview?.title || `Section ${i + 1}`}
                        </span>
                        {isCurrentSection && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-brand-100 text-brand-700 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      
                      {/* Section Preview */}
                      {sectionPreview?.preview && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {sectionPreview.preview}
                        </p>
                      )}
                      
                      {/* Reading Stats */}
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        {sectionPreview?.estimatedReadingTime && (
                          <div className="flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            <span>{formatReadingTime(sectionPreview.estimatedReadingTime)}</span>
                          </div>
                        )}
                        {sectionPreview?.wordCount && (
                          <span>{sectionPreview.wordCount.toLocaleString()} words</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Section Number */}
                    <div className="ml-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded ${
                        isCurrentSection 
                          ? 'bg-brand-100 text-brand-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {i + 1}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 