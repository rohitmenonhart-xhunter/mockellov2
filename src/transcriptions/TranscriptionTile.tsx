import { ChatMessageType, ChatTile } from "@/components/chat/ChatTile";
import {
  TrackReferenceOrPlaceholder,
  useChat,
  useLocalParticipant,
  useTrackTranscription,
} from "@livekit/components-react";
import {
  LocalParticipant,
  Participant,
  Track,
  TranscriptionSegment,
} from "livekit-client";
import { useEffect, useState } from "react";

export function TranscriptionTile({
  agentAudioTrack,
  accentColor,
  onTranscriptionUpdate,
}: {
  agentAudioTrack: TrackReferenceOrPlaceholder;
  accentColor: string;
  onTranscriptionUpdate?: (messages: ChatMessageType[]) => void;
}) {
  const agentMessages = useTrackTranscription(agentAudioTrack);
  const localParticipant = useLocalParticipant();
  const localMessages = useTrackTranscription({
    publication: localParticipant.microphoneTrack,
    source: Track.Source.Microphone,
    participant: localParticipant.localParticipant,
  });

  const [transcripts, setTranscripts] = useState<Map<string, ChatMessageType>>(
    new Map()
  );
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const { chatMessages, send: sendChat } = useChat();

  // store transcripts
  useEffect(() => {
    const newTranscripts = new Map(transcripts);
    
    agentMessages.segments.forEach((s) =>
      newTranscripts.set(
        s.id,
        segmentToChatMessage(
          s,
          newTranscripts.get(s.id),
          agentAudioTrack.participant
        )
      )
    );
    
    localMessages.segments.forEach((s) =>
      newTranscripts.set(
        s.id,
        segmentToChatMessage(
          s,
          newTranscripts.get(s.id),
          localParticipant.localParticipant
        )
      )
    );

    const allMessages = Array.from(newTranscripts.values());
    for (const msg of chatMessages) {
      const isAgent =
        msg.from?.identity === agentAudioTrack.participant?.identity;
      const isSelf =
        msg.from?.identity === localParticipant.localParticipant.identity;
      let name = msg.from?.name;
      if (!name) {
        if (isAgent) {
          name = "HR";
        } else if (isSelf) {
          name = "You";
        } else {
          name = "Unknown";
        }
      }
      allMessages.push({
        name,
        message: msg.message,
        timestamp: msg.timestamp,
        isSelf: isSelf,
      });
    }
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    setMessages(allMessages);
    setTranscripts(newTranscripts);
    
    // Notify parent component of new messages
    if (onTranscriptionUpdate) {
      onTranscriptionUpdate(allMessages);
    }
  }, [transcripts, agentMessages.segments, localMessages.segments, chatMessages, localParticipant.localParticipant, agentAudioTrack.participant, onTranscriptionUpdate]);

  return (
    <ChatTile messages={messages} accentColor={accentColor} onSend={sendChat} />
  );
}

function segmentToChatMessage(
  s: TranscriptionSegment,
  existingMessage: ChatMessageType | undefined,
  participant: Participant
): ChatMessageType {
  const msg: ChatMessageType = {
    message: s.final ? s.text : `${s.text} ...`,
    name: participant instanceof LocalParticipant ? "You" : "HR",
    isSelf: participant instanceof LocalParticipant,
    timestamp: existingMessage?.timestamp ?? Date.now(),
  };
  return msg;
}
