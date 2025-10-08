/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  model: string;
  voice: string;
  language: string;
  systemPrompt: string;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setLanguage: (language: string) => void;
  setSystemPrompt: (prompt: string) => void;
}>(
  persist(
    set => ({
      model: DEFAULT_LIVE_API_MODEL,
      voice: DEFAULT_VOICE,
      language: AVAILABLE_LANGUAGES[0],
      systemPrompt:
        "Your sole task is to translate the user's speech into {language}. Do not add any extra commentary, greetings, or explanations. Provide only the direct translation.",
      setModel: model => set({ model }),
      setVoice: voice => set({ voice }),
      setLanguage: language => set({ language }),
      setSystemPrompt: systemPrompt => set({ systemPrompt }),
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
  setAllMuted: (isMuted: boolean) => Promise<void>;
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
  setAllMuted: async (isMuted: boolean) => {
    const localParticipantId = get().localParticipantId;
    if (!localParticipantId) {
      console.error('Local participant not found. Cannot perform mute all.');
      return;
    }

    // Optimistic UI update
    set(state => ({
      participants: state.participants.map(p =>
        p.isLocal ? p : { ...p, isMuted },
      ),
    }));

    const { error } = await supabase
      .from('participants')
      .update({ is_muted: isMuted })
      .neq('uid', localParticipantId);

    if (error) {
      console.error('Error muting/unmuting all participants:', error);
      // If there's an error, the realtime subscription will eventually correct the state.
    }
  },
}));