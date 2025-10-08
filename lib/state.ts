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

import {
  DEFAULT_LIVE_API_MODEL,
  DEFAULT_VOICE,
  AVAILABLE_LANGUAGES,
} from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';
import { supabase } from './supabase';

/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  language: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setLanguage: (language: string) => void;
}>(
  persist(
    set => ({
      systemPrompt: `You are a real-time, multilingual translator.`,
      model: DEFAULT_LIVE_API_MODEL,
      voice: DEFAULT_VOICE,
      language: AVAILABLE_LANGUAGES[0],
      setSystemPrompt: prompt => set({ systemPrompt: prompt }),
      setModel: model => set({ model }),
      setVoice: voice => set({ voice }),
      setLanguage: language => set({ language }),
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
  hasJoined: boolean;
  isSidebarOpen: boolean;
  isParticipantListOpen: boolean;
  setFullScreen: (isFullScreen: boolean) => void;
  toggleFullScreen: () => void;
  setHasJoined: (hasJoined: boolean) => void;
  toggleSidebar: () => void;
  toggleParticipantList: () => void;
}>(set => ({
  isFullScreen: false,
  hasJoined: false,
  isSidebarOpen: false,
  isParticipantListOpen: window.innerWidth > 1024,
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
  setHasJoined: hasJoined => set({ hasJoined }),
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleParticipantList: () =>
    set(state => ({ isParticipantListOpen: !state.isParticipantListOpen })),
}));

/**
 * Camera State
 */
export const useCameraState = create<{
  effect: string;
  setEffect: (effect: string) => void;
}>(set => ({
  effect: 'none',
  setEffect: effect => set({ effect }),
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
  tools: [],
  template: undefined,
  setTemplate: template =>
    set({
      template,
      tools: toolTemplates[template],
    }),
  toggleTool: name =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === name ? { ...tool, isEnabled: !tool.isEnabled } : tool,
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
        tool.name === name ? updatedTool : tool,
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

/**
 * Participants
 */
export interface Participant {
  uid: string;
  name: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isLocal: boolean;
}

export const useParticipantStore = create<{
  participants: Participant[];
  localParticipantId: string | null;
  setLocalParticipantId: (uid: string | null) => void;
  addLocalParticipant: (name: string) => void;
  setParticipants: (participants: Participant[]) => void;
  addOrUpdateParticipant: (participant: Participant) => void;
  removeParticipant: (uid: string) => void;
  setMuted: (uid: string, isMuted: boolean) => Promise<void>;
  setCameraOff: (uid: string, isCameraOff: boolean) => Promise<void>;
}>((set, get) => ({
  participants: [],
  localParticipantId: null,
  setLocalParticipantId: (uid: string | null) => {
    set({ localParticipantId: uid });
  },
  addLocalParticipant: (name: string) => {
    const uid = get().localParticipantId;
    if (!uid) {
      console.error('Cannot add local participant without a session.');
      return;
    }
    const newParticipant: Participant = {
      uid,
      name: `${name} (You)`,
      isMuted: true,
      isCameraOff: true,
      isLocal: true,
    };
    set(state => ({
      // Avoid duplicates on re-join
      participants: [
        ...state.participants.filter(p => !p.isLocal),
        newParticipant,
      ],
    }));
  },
  setParticipants: (participants: Participant[]) => {
    set({ participants });
  },
  addOrUpdateParticipant: (participant: Participant) => {
    set(state => {
      const existing = state.participants.find(p => p.uid === participant.uid);
      if (existing) {
        return {
          participants: state.participants.map(p =>
            p.uid === participant.uid ? { ...p, ...participant } : p,
          ),
        };
      }
      return { participants: [...state.participants, participant] };
    });
  },
  removeParticipant: (uid: string) => {
    set(state => ({
      participants: state.participants.filter(p => p.uid !== uid),
    }));
  },
  setMuted: async (uid, isMuted) => {
    set(state => ({
      participants: state.participants.map(p =>
        p.uid === uid ? { ...p, isMuted } : p,
      ),
    }));
    if (uid === get().localParticipantId) {
      await supabase
        .from('participants')
        .update({ is_muted: isMuted })
        .eq('uid', uid);
    }
  },
  setCameraOff: async (uid, isCameraOff) => {
    set(state => ({
      participants: state.participants.map(p =>
        p.uid === uid ? { ...p, isCameraOff } : p,
      ),
    }));
    if (uid === get().localParticipantId) {
      await supabase
        .from('participants')
        .update({ is_camera_off: isCameraOff })
        .eq('uid', uid);
    }
  },
}));