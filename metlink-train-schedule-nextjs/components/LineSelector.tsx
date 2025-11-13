'use client';

import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { SERVICE_IDS, LINE_NAMES } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';

interface LineSelectorProps {
  selectedLine: LineCode;
  onLineChange: (line: LineCode) => void;
}

export function LineSelector({ selectedLine, onLineChange }: LineSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lineOptions = Object.values(SERVICE_IDS) as LineCode[];

  return (
    <div className="relative">
      <label className="block text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
        Train Line
      </label>
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="w-full pl-4 pr-8 h-[42px] bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white text-left flex items-center justify-between"
          aria-expanded={isOpen}
          aria-label="Select train line"
        >
          <span className="truncate">
            {LINE_NAMES[selectedLine] || selectedLine}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-black dark:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-hidden="true"
            />
            <div 
              className="absolute z-20 w-full mt-1 bg-white dark:bg-black border-2 border-black dark:border-white max-h-64 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 border-b-2 border-black dark:border-white flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  Select Line
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="p-2 space-y-1">
                {lineOptions.map((lineCode) => {
                  const isSelected = selectedLine === lineCode;
                  return (
                    <button
                      key={lineCode}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLineChange(lineCode);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                        isSelected ? 'bg-black/10 dark:bg-white/10 font-semibold' : ''
                      }`}
                    >
                      <span className="text-sm text-black dark:text-white">
                        {LINE_NAMES[lineCode] || lineCode}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
