'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '../providers/AuthProvider';
import {
  Terminal as TerminalIcon,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
  Sparkles,
  Folder,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  path?: string;
  timestamp: string;
}

interface RoomTerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  initialFolderId?: string | null;
  onWorkspaceMutated?: () => void;
}

// Convert basic ANSI terminal color codes to Tailwind classes
function formatAnsi(text: string): React.ReactNode[] {
  const parts = text.split(/(\x1b\[[0-9;]*m)/g);
  let currentClass = 'text-slate-200';
  let isBold = false;

  return parts.map((part, index) => {
    if (part.startsWith('\x1b[')) {
      if (part === '\x1b[0m') {
        currentClass = 'text-slate-200';
        isBold = false;
      } else if (part.includes('32m')) {
        currentClass = 'text-emerald-400 font-semibold';
      } else if (part.includes('34m') || part.includes('36m')) {
        currentClass = 'text-cyan-400 font-semibold';
      } else if (part.includes('33m')) {
        currentClass = 'text-amber-400';
      } else if (part.includes('31m')) {
        currentClass = 'text-rose-400';
      } else if (part.includes('35m')) {
        currentClass = 'text-purple-400 font-bold';
      } else if (part.includes('1m')) {
        isBold = true;
      }
      return null;
    }
    return (
      <span key={index} className={`${currentClass} ${isBold ? 'font-bold' : ''}`}>
        {part}
      </span>
    );
  });
}

export const RoomTerminalDrawer: React.FC<RoomTerminalDrawerProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  initialFolderId = null,
  onWorkspaceMutated,
}) => {
  const { user } = useAuth();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  const [currentPath, setCurrentPath] = useState('/');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAgyMode, setIsAgyMode] = useState(false);

  // Command History
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize terminal banner
  useEffect(() => {
    if (isOpen && lines.length === 0) {
      setLines([
        {
          id: 'welcome-1',
          type: 'system',
          text: `CollabRoom Cloud Shell v1.0 [Workspace: ${roomName}]`,
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          id: 'welcome-2',
          type: 'system',
          text: `Type 'agy' to launch Google Antigravity Agent, or 'help' for available commands.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, [isOpen, roomName]);

  // Sync initial folder
  useEffect(() => {
    setCurrentFolderId(initialFolderId);
  }, [initialFolderId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [lines, isOpen, isAgyMode]);

  if (!isOpen) return null;

  const handleExecute = async (cmdToRun?: string) => {
    const rawCommand = (cmdToRun !== undefined ? cmdToRun : inputVal).trim();
    if (!rawCommand) return;

    // Add to history
    setHistory((prev) => [rawCommand, ...prev.filter((c) => c !== rawCommand)]);
    setHistoryIndex(-1);
    setInputVal('');

    // Handle client-side 'clear'
    if (rawCommand.toLowerCase() === 'clear' || rawCommand.toLowerCase() === 'cls') {
      setLines([]);
      return;
    }

    // Handle Antigravity Mode Transitions
    if (isAgyMode) {
      if (rawCommand.toLowerCase() === 'exit' || rawCommand.toLowerCase() === 'quit') {
        setIsAgyMode(false);
        setLines((prev) => [
          ...prev,
          {
            id: `line-${Date.now()}`,
            type: 'input',
            text: rawCommand,
            path: 'agy',
            timestamp: new Date().toLocaleTimeString(),
          },
          {
            id: `out-${Date.now()}`,
            type: 'system',
            text: 'Exited Antigravity mode. Returned to standard workspace shell.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        return;
      }
    } else {
      if (rawCommand.toLowerCase() === 'agy' || rawCommand.toLowerCase() === 'antigravity') {
        setIsAgyMode(true);
      }
    }

    // Wrap in agy command if currently in interactive Antigravity mode
    let commandToSend = rawCommand;
    if (isAgyMode && !rawCommand.toLowerCase().startsWith('agy ') && rawCommand.toLowerCase() !== 'agy') {
      commandToSend = `agy "${rawCommand}"`;
    }

    // Append user input line
    const userLineId = `line-${Date.now()}`;
    setLines((prev) => [
      ...prev,
      {
        id: userLineId,
        type: 'input',
        text: rawCommand,
        path: isAgyMode ? 'agy' : currentPath,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    setIsExecuting(true);

    try {
      const res = await api.post<any>(`/rooms/${roomId}/terminal`, {
        command: commandToSend,
        currentFolderId,
        currentPath,
      });

      if (res.success && res.data) {
        const result = res.data;

        // Update working directory if changed by 'cd'
        if (result.newFolderId !== undefined) {
          setCurrentFolderId(result.newFolderId);
        }
        if (result.newPath !== undefined) {
          setCurrentPath(result.newPath);
        }

        // Notify parent if files/folders were modified
        if (result.filesAffected && result.filesAffected.length > 0 && onWorkspaceMutated) {
          onWorkspaceMutated();
        }

        if (result.output) {
          setLines((prev) => [
            ...prev,
            {
              id: `out-${Date.now()}`,
              type: result.isError ? 'error' : 'output',
              text: result.output,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      } else {
        setLines((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: res.message || 'Command failed with unknown error',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err: any) {
      setLines((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          text: err.message || 'Execution failed',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const handleCopyAll = () => {
    const text = lines.map((l) => (l.type === 'input' ? `$ ${l.text}` : l.text)).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickChips = [
    { label: '✨ agy', cmd: 'agy' },
    { label: 'agy status', cmd: 'agy status' },
    { label: 'agy skills', cmd: 'agy skills' },
    { label: 'ls -l', cmd: 'ls -l' },
    { label: 'tree', cmd: 'tree' },
    { label: 'status', cmd: 'status' },
    { label: 'help', cmd: 'help' },
  ];

  const userNameSlug = (user?.fullName || 'user').toLowerCase().replace(/\s+/g, '_');

  return (
    <div
      className={`fixed z-50 bg-[#050B14]/95 backdrop-blur-xl border-t border-slate-700 shadow-2xl flex flex-col transition-all duration-200 font-mono ${
        isMaximized
          ? 'inset-0 w-full h-full'
          : 'bottom-0 right-0 left-64 h-[420px] rounded-t-2xl border-x'
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 rounded-t-2xl select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-700 text-xs font-semibold text-slate-300">
            <TerminalIcon className={`w-4 h-4 ${isAgyMode ? 'text-purple-400' : 'text-emerald-400'}`} />
            <span>CollabRoom Shell</span>
            <span className="text-[11px] text-muted font-normal">• {roomName}</span>
            {isAgyMode ? (
              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-sans font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>ANTIGRAVITY v2.0 ACTIVE</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-bold">
                LIVE CMD
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {isAgyMode && (
            <button
              onClick={() => handleExecute('exit')}
              className="px-2 py-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors text-xs font-sans"
              title="Exit Antigravity Mode"
            >
              Exit agy (exit)
            </button>
          )}

          <button
            onClick={handleCopyAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
            title="Copy Terminal Output"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setLines([])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Clear Terminal (Ctrl+L)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsMaximized((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMaximized ? 'Restore View' : 'Maximize View'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
            title="Close Terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Output Console Stream */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 text-xs font-mono leading-relaxed cursor-text select-text"
      >
        {lines.map((line) => (
          <div key={line.id} className="space-y-0.5">
            {line.type === 'input' && (
              <div className="flex items-center gap-2 text-slate-300">
                {line.path === 'agy' ? (
                  <>
                    <span className="text-purple-400 font-bold">agy (v2.0)</span>
                    <span className="text-purple-400 font-bold">&gt;</span>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-400 font-bold">{userNameSlug}@collabroom</span>
                    <span className="text-muted">:</span>
                    <span className="text-cyan-400 font-semibold">{line.path || '/'}</span>
                    <span className="text-muted">$</span>
                  </>
                )}
                <span className="text-white font-medium">{line.text}</span>
              </div>
            )}

            {line.type === 'system' && (
              <div className="text-indigo-300/90 italic flex items-center gap-1.5 py-0.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>{line.text}</span>
              </div>
            )}

            {line.type === 'error' && (
              <div className="text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-900/50 whitespace-pre-wrap">
                {line.text}
              </div>
            )}

            {line.type === 'output' && (
              <div className="text-slate-200 whitespace-pre-wrap pl-2 border-l-2 border-slate-800">
                {formatAnsi(line.text)}
              </div>
            )}
          </div>
        ))}

        {isExecuting && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{isAgyMode ? 'Antigravity is reasoning...' : 'Executing command...'}</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-4 py-1.5 bg-slate-950/80 border-t border-slate-900 flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-muted flex-shrink-0">Suggestions:</span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleExecute(chip.cmd)}
            disabled={isExecuting}
            className={`px-2 py-0.5 rounded border transition-colors whitespace-nowrap flex-shrink-0 font-mono text-[10px] ${
              chip.label.includes('agy')
                ? 'bg-purple-950/60 border-purple-800/60 text-purple-300 hover:text-white'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-cyan-300'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Interactive Input Prompt Bar */}
      <div className={`p-3 bg-slate-950 border-t flex items-center gap-2 ${isAgyMode ? 'border-purple-800/50' : 'border-slate-800'}`}>
        <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
          {isAgyMode ? (
            <>
              <span className="text-purple-400 font-bold">agy (v2.0)</span>
              <span className="text-purple-400 font-bold">&gt;</span>
            </>
          ) : (
            <>
              <span className="text-emerald-400 font-bold">{userNameSlug}@collabroom</span>
              <span className="text-muted">:</span>
              <span className="text-cyan-400 font-semibold">{currentPath}</span>
              <span className="text-muted">$</span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          placeholder={
            isAgyMode
              ? "Ask Antigravity to generate code, refactor, /plan, /boost, /goal... (Type 'exit' to leave)"
              : "Type command (e.g. agy, ls, mkdir, touch, cat, python, status)..."
          }
          className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder:text-slate-600"
          spellCheck={false}
          autoComplete="off"
        />

        <button
          type="button"
          onClick={() => handleExecute()}
          disabled={isExecuting || !inputVal.trim()}
          className={`p-1.5 rounded-lg transition-colors ${
            isAgyMode
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-primary hover:bg-primary-hover text-white'
          } disabled:opacity-40`}
          title="Send Command (Enter)"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
