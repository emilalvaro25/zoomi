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
  INITIAL_AVAILABLE_VOICES,
  TTS_PROVIDERS,
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
  availableVoices: string[];
  cartesiaApiKey: string;
  huggingfaceApiKey: string;
  openaiApiKey: string;
  activeTtsProvider: string;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setLanguage: (language: string) => void;
  setSystemPrompt: (prompt: string) => void;
  addVoice: (voice: string) => void;
  setCartesiaApiKey: (key: string) => void;
  setHuggingfaceApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setActiveTtsProvider: (provider: string) => void;
}>(
  persist(
    (set, get) => ({
      model: DEFAULT_LIVE_API_MODEL,
      voice: DEFAULT_VOICE,
      language: AVAILABLE_LANGUAGES[0],
      systemPrompt:
        "Your sole task is to translate the user's speech into {language}. Do not add any extra commentary, greetings, or explanations. Provide only the direct translation.",
      availableVoices: INITIAL_AVAILABLE_VOICES,
      cartesiaApiKey: '',
      huggingfaceApiKey: '',
      openaiApiKey: '',
      activeTtsProvider: TTS_PROVIDERS[0],
      setModel: model => set({ model }),
      setVoice: voice => set({ voice }),
      setLanguage: language => set({ language }),
      setSystemPrompt: systemPrompt => set({ systemPrompt }),
      addVoice: (newVoice: string) => {
        if (newVoice && !get().availableVoices.includes(newVoice)) {
          set(state => ({
            availableVoices: [...state.availableVoices, newVoice].sort(),
          }));
        }
      },
      setCartesiaApiKey: key => set({ cartesiaApiKey: key }),
      setHuggingfaceApiKey: key => set({ huggingfaceApiKey: key }),
      setOpenaiApiKey: key => set({ openaiApiKey: key }),
      setActiveTtsProvider: provider => set({ activeTtsProvider: provider }),
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
  isShareModalOpen: boolean;
  meetingId: string | null;
  isServerSettingsUnlocked: boolean;
  setFullScreen: (isFullScreen: boolean) => void;
  toggleFullScreen: () => void;
  setHasJoined: (hasJoined: boolean) => void;
  toggleSidebar: () => void;
  toggleParticipantList: () => void;
  setShareModalOpen: (isOpen: boolean) => void;
  setMeetingId: (id: string | null) => void;
  setServerSettingsUnlocked: (unlocked: boolean) => void;
}>(set => ({
  isFullScreen: false,
  hasJoined: false,
  isSidebarOpen: false,
  isParticipantListOpen: window.innerWidth > 1024,
  isShareModalOpen: false,
  meetingId: null,
  isServerSettingsUnlocked: false,
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
  setShareModalOpen: isOpen => set({ isShareModalOpen: isOpen }),
  setMeetingId: id => set({ meetingId: id }),
  setServerSettingsUnlocked: unlocked =>
    set({ isServerSettingsUnlocked: unlocked }),
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
  isHandRaised: boolean;
  role: 'host' | 'student';
  language?: string;
  isLocal?: boolean;
}

export const useParticipantStore = create<{
  participants: Participant[];
  localParticipant: Participant | null;
  localParticipantUid: string | null;
  speakingParticipantUid: string | null;
  pinnedParticipantUid: string | null;
  remoteVideoFrames: Record<string, string>;
  setPinnedParticipant: (uid: string | null) => void;
  setSpeakingParticipant: (uid: string | null) => void;
  setLocalParticipantUid: (uid: string | null) => void;
  addLocalParticipant: (
    name: string,
    role: 'host' | 'student',
    uid: string,
    language?: string,
  ) => void;
  setParticipants: (participants: Participant[]) => void;
  addOrUpdateParticipant: (participant: Omit<Participant, 'isLocal'>) => void;
  removeParticipant: (uid: string) => void;
  setMuted: (uid: string, isMuted: boolean) => Promise<void>;
  setCameraOff: (uid: string, isCameraOff: boolean) => Promise<void>;
  setHandRaised: (uid: string, isHandRaised: boolean) => Promise<void>;
  setLanguage: (uid: string, language: string) => Promise<void>;
  setAllMuted: (isMuted: boolean) => Promise<void>;
  setRemoteVideoFrame: (uid: string, frame: string) => void;
  clearRemoteVideoFrame: (uid: string) => void;
}>((set, get) => ({
  participants: [],
  localParticipant: null,
  localParticipantUid: null,
  speakingParticipantUid: null,
  pinnedParticipantUid: null,
  remoteVideoFrames: {},
  setPinnedParticipant: uid => set({ pinnedParticipantUid: uid }),
  setSpeakingParticipant: (uid: string | null) =>
    set({ speakingParticipantUid: uid }),
  setLocalParticipantUid: (uid: string | null) => {
    set({ localParticipantUid: uid });
    if (uid) {
      const p = get().participants.find(p => p.uid === uid);
      if (p) {
        set({ localParticipant: { ...p, isLocal: true } });
      }
    } else {
      set({ localParticipant: null });
    }
  },
  addLocalParticipant: (
    name: string,
    role: 'host' | 'student',
    uid: string,
    language?: string,
  ) => {
    if (!uid) {
      console.error('Cannot add local participant without a uid.');
      return;
    }
    const newParticipant: Participant = {
      uid,
      name: `${name} (You)`,
      isMuted: role === 'student', // Students are muted by default
      isCameraOff: true,
      isHandRaised: false,
      isLocal: true,
      role,
      language,
    };
    set(state => {
      // Avoid duplicates on re-join
      const otherParticipants = state.participants.filter(p => p.uid !== uid);
      return {
        participants: [...otherParticipants, newParticipant],
        localParticipant: newParticipant,
        localParticipantUid: uid,
      };
    });
  },
  setParticipants: (participants: Participant[]) => {
    set({ participants });
  },
  addOrUpdateParticipant: (participant: Omit<Participant, 'isLocal'>) => {
    if (participant.isCameraOff) {
      get().clearRemoteVideoFrame(participant.uid);
    }
    set(state => {
      const isForLocalUser = participant.uid === state.localParticipantUid;
      const finalParticipant = { ...participant, isLocal: isForLocalUser };

      const existing = state.participants.find(p => p.uid === finalParticipant.uid);
      const newParticipants = existing
        ? state.participants.map(p =>
            p.uid === finalParticipant.uid ? { ...p, ...finalParticipant } : p,
          )
        : [...state.participants, finalParticipant];

      const newLocalParticipant = isForLocalUser
        ? finalParticipant
        : state.localParticipant;

      return {
        participants: newParticipants,
        localParticipant: newLocalParticipant,
      };
    });
  },
  removeParticipant: (uid: string) => {
    get().clearRemoteVideoFrame(uid);
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
    // Only local user can update their own status in DB
    if (uid === get().localParticipant?.uid) {
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
    if (uid === get().localParticipant?.uid) {
      await supabase
        .from('participants')
        .update({ is_camera_off: isCameraOff })
        .eq('uid', uid);
    }
  },
  setHandRaised: async (uid, isHandRaised) => {
    set(state => ({
      participants: state.participants.map(p =>
        p.uid === uid ? { ...p, isHandRaised } : p,
      ),
    }));
    if (uid === get().localParticipant?.uid) {
      await supabase
        .from('participants')
        .update({ is_hand_raised: isHandRaised })
        .eq('uid', uid);
    }
  },
  setLanguage: async (uid: string, language: string) => {
    set(state => ({
      participants: state.participants.map(p =>
        p.uid === uid ? { ...p, language } : p,
      ),
      localParticipant:
        uid === state.localParticipantUid
          ? { ...state.localParticipant!, language }
          : state.localParticipant,
    }));
    if (uid === get().localParticipantUid) {
      await supabase
        .from('participants')
        .update({ language: language })
        .eq('uid', uid);
    }
  },
  setAllMuted: async (isMuted: boolean) => {
    const localParticipantId = get().localParticipant?.uid;
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
  setRemoteVideoFrame: (uid: string, frame: string) => {
    set(state => ({
      remoteVideoFrames: {
        ...state.remoteVideoFrames,
        [uid]: frame,
      },
    }));
  },
  clearRemoteVideoFrame: (uid: string) => {
    set(state => {
      const newFrames = { ...state.remoteVideoFrames };
      delete newFrames[uid];
      return { remoteVideoFrames: newFrames };
    });
  },
}));
