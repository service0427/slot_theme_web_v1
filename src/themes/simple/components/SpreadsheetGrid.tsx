import React from 'react';
import { ReactSpreadsheetGrid } from '@/adapters/react/components/SpreadsheetGrid';
import { SpreadsheetProps } from '@/core/components/SpreadsheetGrid';

interface SimpleSpreadsheetGridProps extends SpreadsheetProps {
  title?: React.ReactNode;
  description?: string;
  noWrapper?: boolean; // 모달 등에서 사용할 때 래퍼 스타일 제거
}

export const SimpleSpreadsheetGrid: React.FC<SimpleSpreadsheetGridProps> = ({
  title,
  description,
  noWrapper = false,
  ...props
}) => {
  return (
    <div className={`bg-white overflow-hidden ${noWrapper ? '' : 'rounded-lg shadow-md'}`}>
      {(title || description) && (
        <div className="px-4 py-3 border-b border-gray-200">
          {title && (
            typeof title === 'string' ? (
              <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
            ) : (
              <div>{title}</div>
            )
          )}
          {description && (
            <p className="text-gray-600 text-sm">{description}</p>
          )}
        </div>
      )}
      
      <div className={noWrapper ? "p-2" : "p-3"}>
        <ReactSpreadsheetGrid
          {...props}
          className="simple-theme-spreadsheet"
        />
      </div>
      
      <style>{`
        .simple-theme-spreadsheet {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        .simple-theme-spreadsheet table {
          border-collapse: collapse;
          width: 100%;
        }
        
        .simple-theme-spreadsheet th {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 6px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 12px;
          color: #495057;
          user-select: none;
        }
        
        .simple-theme-spreadsheet td {
          border: 1px solid #dee2e6;
          padding: 0;
          height: 28px;
          vertical-align: middle;
          background-color: white;
          transition: background-color 0.1s ease;
          color: #000000;
        }
        
        .simple-theme-spreadsheet td:hover {
          background-color: #f8f9fa;
        }
        
        .simple-theme-spreadsheet td.selected {
          background-color: #e3f2fd;
          border: 2px solid #2196f3;
          box-shadow: inset 0 0 0 1px #2196f3;
        }
        
        .simple-theme-spreadsheet td.editing {
          background-color: white;
          border: 2px solid #4caf50;
          box-shadow: 0 0 0 1px #4caf50;
          z-index: 10;
        }
        
        .simple-theme-spreadsheet td.error {
          background-color: #ffebee;
          border-color: #f44336;
        }
        
        .simple-theme-spreadsheet input,
        .simple-theme-spreadsheet textarea,
        .simple-theme-spreadsheet select {
          width: 100%;
          height: 100%;
          border: none;
          outline: none;
          padding: 4px 8px;
          font-size: 13px;
          background: transparent;
          resize: none;
          color: #000000;
        }
        
        .simple-theme-spreadsheet input:focus,
        .simple-theme-spreadsheet textarea:focus,
        .simple-theme-spreadsheet select:focus {
          background-color: white;
        }
        
        .simple-theme-spreadsheet .cell-content {
          padding: 3px 6px;
          height: 28px;
          display: flex;
          align-items: center;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #000000;
        }
        
        .simple-theme-spreadsheet .cell-content.empty {
          color: #9e9e9e;
          font-style: italic;
        }
        
        .simple-theme-spreadsheet .row-number {
          background-color: #f5f5f5;
          border-right: 2px solid #ddd;
          text-align: center;
          font-weight: 500;
          color: #666;
          user-select: none;
          width: 48px;
          min-width: 48px;
          max-width: 48px;
        }
        
        .simple-theme-spreadsheet .toolbar {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .simple-theme-spreadsheet .toolbar button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          color: #333;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .simple-theme-spreadsheet .toolbar button:hover {
          background-color: #f8f9fa;
          border-color: #adb5bd;
        }
        
        .simple-theme-spreadsheet .toolbar button.primary {
          background-color: #007bff;
          border-color: #007bff;
          color: white;
        }
        
        .simple-theme-spreadsheet .toolbar button.primary:hover {
          background-color: #0056b3;
          border-color: #0056b3;
        }
        
        .simple-theme-spreadsheet .footer {
          padding: 8px 12px;
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
        }
        
        .simple-theme-spreadsheet .validation-errors {
          margin-top: 16px;
          padding: 12px;
          background-color: #fff5f5;
          border: 1px solid #fed7d7;
          border-radius: 4px;
          font-size: 13px;
        }
        
        .simple-theme-spreadsheet .validation-errors .title {
          font-weight: 600;
          color: #c53030;
          margin-bottom: 8px;
        }
        
        .simple-theme-spreadsheet .validation-errors ul {
          margin: 0;
          padding-left: 20px;
          color: #e53e3e;
        }
        
        .simple-theme-spreadsheet .validation-errors li {
          margin-bottom: 4px;
        }
        
        .simple-theme-spreadsheet .error-indicator {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 6px;
          height: 6px;
          background-color: #f44336;
          border-radius: 50%;
          border: 1px solid white;
        }
        
        /* 반응형 */
        @media (max-width: 768px) {
          .simple-theme-spreadsheet {
            font-size: 12px;
          }
          
          .simple-theme-spreadsheet th,
          .simple-theme-spreadsheet td {
            min-width: 100px;
          }
          
          .simple-theme-spreadsheet .toolbar {
            gap: 4px;
          }
          
          .simple-theme-spreadsheet .toolbar button {
            padding: 4px 8px;
            font-size: 12px;
          }
        }
        
        /* 다크 모드 지원 */
        @media (prefers-color-scheme: dark) {
          .simple-theme-spreadsheet th {
            background-color: #2d3748;
            color: #e2e8f0;
            border-color: #4a5568;
          }
          
          .simple-theme-spreadsheet td {
            background-color: #1a202c;
            border-color: #4a5568;
            color: #e2e8f0;
          }
          
          .simple-theme-spreadsheet td:hover {
            background-color: #2d3748;
          }
          
          .simple-theme-spreadsheet td.selected {
            background-color: #2b6cb0;
            border-color: #3182ce;
          }
          
          .simple-theme-spreadsheet .row-number {
            background-color: #2d3748;
            color: #a0aec0;
            border-color: #4a5568;
          }
          
          .simple-theme-spreadsheet .footer {
            background-color: #2d3748;
            border-color: #4a5568;
          }
        }
      `}</style>
    </div>
  );
};