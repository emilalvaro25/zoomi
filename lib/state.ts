/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { virtualProductionTools } from './tools';
import { customerSupportTools } from './tools/customer-support';
import { navigationSystemTools } from './tools/navigation-system';
import { personalAssistantTools } from './tools/personal-assistant';

import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
}>(
  persist(
    set => ({
      systemPrompt: `You are a virtual production assistant. You can control the camera zoom and lighting. Use the provided tools to adjust the scene based on user requests.`,
      model: DEFAULT_LIVE_API_MODEL,
      voice: DEFAULT_VOICE,
      setSystemPrompt: prompt => set({ systemPrompt: prompt }),
      setModel: model => set({ model }),
      setVoice: voice => set({ voice }),
    }),
    {
      name: 'zoom-settings-storage',
    },
  ),
);

/**
 * UI
 */
export const useUI = create<{
  isFullScreen: boolean;
  setFullScreen: (isFullScreen: boolean) => void;
  toggleFullScreen: () => void;
}>(set => ({
  isFullScreen: false,
  setFullScreen: isFullScreen => set({ isFullScreen }),
  toggleFullScreen: () =>
    set(state => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        return { isFullScreen: true };
      } else {
        document.exitFullscreen();
        return { isFullScreen: false };
      }
    }),
}));

/**
 * Camera State
 */
export const ZOOM_LEVELS = [1, 1.25, 1.5, 1.75, 2];
export const LIGHT_TYPES = ['none', 'warm', 'cool', 'daylight'];

export const useCameraState = create<{
  zoom: number;
  lightType: string;
  setZoom: (zoom: number) => void;
  setLightType: (lightType: string) => void;
}>(set => ({
  zoom: 1,
  lightType: 'none',
  setZoom: zoom => set({ zoom: Math.max(1, zoom) }), // Ensure zoom is not less than 1
  setLightType: lightType => set({ lightType }),
}));

/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description?: string;
  parameters?: any;
  isEnabled: boolean;
  scheduling?: FunctionResponseScheduling;
}

// FIX: Export Template type and refactor useTools store for consistency.
export type Template =
  | 'customer-support'
  | 'personal-assistant'
  | 'navigation-system';

const toolTemplates: Record<Template, FunctionCall[]> = {
  'customer-support': customerSupportTools,
  'personal-assistant': personalAssistantTools,
  'navigation-system': navigationSystemTools,
};

export const useTools = create<{
  tools: FunctionCall[];
  template?: Template;
  setTemplate: (template: Template) => void;
  toggleTool: (name: string) => void;
  addTool: () => void;
  removeTool: (name: string) => void;
  updateTool: (name: string, updatedTool: FunctionCall) => void;
}>((set, get) => ({
  tools: virtualProductionTools,
  template: undefined,
  setTemplate: template =>
    set({
      template,
      tools: toolTemplates[template],
    }),
  toggleTool: name =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === name ? { ...tool, isEnabled: !tool.isEnabled } : tool
      ),
    })),
  addTool: () =>
    set(state => ({
      tools: [
        ...state.tools,
        {
          name: `new_function_${state.tools.length + 1}`,
          description: '',
          parameters: { type: 'OBJECT', properties: {} },
          isEnabled: false,
        },
      ],
    })),
  removeTool: name =>
    set(state => ({
      tools: state.tools.filter(tool => tool.name !== name),
    })),
  updateTool: (name, updatedTool) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === name ? updatedTool : tool
      ),
    })),
}));


/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));