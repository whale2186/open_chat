import type { ChatMessage, P2PStatus } from '../types';
import { createId } from '../utils/ids';

export interface PeerSignalPayload {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PeerHandlers {
  onStatusChange: (state: P2PStatus) => void;
  onMessage: (message: ChatMessage) => void;
  onLocalLog: (text: string, kind?: 'info' | 'error') => void;
  onSendSignal: (payload: PeerSignalPayload) => void;
}

export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private handlers: PeerHandlers;
  private localUserId: string;
  private roomId: string;
  private remoteUserId: string | null = null;
  private isInitiator = false;
  private closed = false;

  constructor(roomId: string, localUserId: string, handlers: PeerHandlers) {
    this.roomId = roomId;
    this.localUserId = localUserId;
    this.handlers = handlers;
  }

  setRemoteUser(remoteUserId: string) {
    this.remoteUserId = remoteUserId;
  }

  private createPeerConnection() {
    if (this.pc) return this.pc;
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
      ]
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.handlers.onSendSignal({ candidate: event.candidate.toJSON() });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.connectionState;
      if (state === 'connected') {
        this.handlers.onStatusChange('active');
        this.handlers.onLocalLog('P2P connection active.');
      } else if (state === 'connecting' || state === 'new') {
        this.handlers.onStatusChange('negotiating');
      } else if (state === 'failed' || state === 'disconnected') {
        this.handlers.onStatusChange('unavailable');
      }
    };

    this.pc.ondatachannel = (event) => {
      this.channel = event.channel;
      this.bindChannel();
    };

    return this.pc;
  }

  private bindChannel() {
    if (!this.channel) return;
    this.channel.onopen = () => {
      this.handlers.onStatusChange('active');
      this.handlers.onLocalLog('Direct connection ready.');
    };
    this.channel.onclose = () => {
      if (!this.closed) this.handlers.onStatusChange('unavailable');
    };
    this.channel.onerror = () => {
      this.handlers.onStatusChange('unavailable');
    };
    this.channel.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as {
          type: string;
          message?: ChatMessage;
          text?: string;
          messageId?: string;
          senderId?: string;
          senderNickname?: string;
          timestamp?: number;
        };

        if (payload.type === 'chat_message' && payload.message) {
          this.handlers.onMessage(payload.message);
        }
      } catch {
        this.handlers.onLocalLog('Ignored malformed P2P payload.', 'error');
      }
    };
  }

  async shouldInitiate(remoteUserId: string) {
    this.setRemoteUser(remoteUserId);
    this.isInitiator = this.localUserId < remoteUserId;
    return this.isInitiator;
  }

  async start() {
    if (!this.remoteUserId) {
      this.handlers.onStatusChange('unavailable');
      return;
    }

    const pc = this.createPeerConnection();
    this.handlers.onStatusChange('negotiating');

    if (this.isInitiator) {
      this.channel = pc.createDataChannel('chat', { ordered: true });
      this.bindChannel();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (pc.localDescription) {
        this.handlers.onSendSignal({ sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp || undefined } });
      }
    }
  }

  async handleSignal(payload: PeerSignalPayload) {
    const pc = this.createPeerConnection();
    if (payload.sdp) {
      const desc = new RTCSessionDescription(payload.sdp);
      const isOffer = desc.type === 'offer';
      const setRemote = !pc.remoteDescription || pc.remoteDescription.sdp !== desc.sdp;

      if (setRemote) {
        await pc.setRemoteDescription(desc);
      }

      if (isOffer) {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) {
          this.handlers.onSendSignal({ sdp: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp || undefined } });
        }
      }
    }

    if (payload.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        this.handlers.onLocalLog('ICE candidate could not be added.', 'error');
      }
    }
  }

  sendMessage(message: ChatMessage) {
    if (!this.channel || this.channel.readyState !== 'open') return false;
    this.channel.send(JSON.stringify({ type: 'chat_message', message }));
    return true;
  }

  close() {
    this.closed = true;
    try {
      this.channel?.close();
    } catch {
      // ignore
    }
    try {
      this.pc?.close();
    } catch {
      // ignore
    }
    this.channel = null;
    this.pc = null;
    this.handlers.onStatusChange('disabled');
  }
}
