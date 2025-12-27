
export enum AppMode {
  IDLE = 'IDLE',
  CREATOR = 'CREATOR',
  JOINER = 'JOINER'
}

export interface SignalingData {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  creatorIceCandidates?: RTCIceCandidateInit[];
  joinerIceCandidates?: RTCIceCandidateInit[];
  status?: string;
}

export type AudioQuality = 'low' | 'medium' | 'high';
