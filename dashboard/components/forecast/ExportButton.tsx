/**
 * Export Button Component
 * 
 * Button with dropdown menu for exporting forecast data in various formats.
 * 
 * Features:
 * - CSV export option
 * - JSON export option
 * - Dropdown menu with glassmorphic styling
 * - Loading state during export
 * - Success feedback
 * 
 * Requirements: 19.8 (Historical Data and Trends)
 * Task: 10.4 - Add forecast export functionality
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { HourlyForecastData } from '@/lib/api/types';
import { exportForecastData, ExportFormat } from '@/lib/utils/exportUtils';

export interface ExportButtonProps {
  forecasts: HourlyForecastData[];
  location: string;
  disabled?: boolean;
}

/**
 * ExportButton Component
 * 
 * Provides a button with dropdown menu for exporting forecast data.
 */
export function ExportButton({ forecasts, location, disabled = false }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    
    return undefined;
  }, [isOpen]);

  // Handle export action
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Export data
      exportForecastData(forecasts, format, location, {
        includeMetadata: true,
      });

      // Show success feedback
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
      // Could add error toast here
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || forecasts.length === 0}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          backdrop-blur-lg bg-white/10 border border-white/20
          text-white font-medium text-sm
          transition-all duration-300
          ${disabled || forecasts.length === 0
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-white/20 hover:scale-105 active:scale-95'
          }
          ${exportSuccess ? 'bg-green-500/30 border-green-400/50' : ''}
        `}
        aria-label="Export forecast data"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* Icon */}
        {isExporting ? (
          <svg
            className="w-5 h-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : exportSuccess ? (
          <svg
            className="w-5 h-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        )}

        {/* Button Text */}
        <span>
          {isExporting ? 'Exporting...' : exportSuccess ? 'Exported!' : 'Export'}
        </span>

        {/* Dropdown Arrow */}
        {!isExporting && !exportSuccess && (
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute right-0 mt-2 w-48 z-50
            backdrop-blur-lg bg-white/10 border border-white/20
            rounded-lg shadow-glass overflow-hidden
            animate-fade-in
          "
          role="menu"
          aria-orientation="vertical"
        >
          {/* CSV Option */}
          <button
            onClick={() => handleExport('csv')}
            className="
              w-full px-4 py-3 text-left
              text-white text-sm font-medium
              hover:bg-white/10 transition-colors duration-200
              flex items-center gap-3
            "
            role="menuitem"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div>
              <div className="font-semibold">Export as CSV</div>
              <div className="text-xs text-white/70">Spreadsheet format</div>
            </div>
          </button>

          {/* Divider */}
          <div className="h-px bg-white/10" />

          {/* JSON Option */}
          <button
            onClick={() => handleExport('json')}
            className="
              w-full px-4 py-3 text-left
              text-white text-sm font-medium
              hover:bg-white/10 transition-colors duration-200
              flex items-center gap-3
            "
            role="menuitem"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <div>
              <div className="font-semibold">Export as JSON</div>
              <div className="text-xs text-white/70">Developer format</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
