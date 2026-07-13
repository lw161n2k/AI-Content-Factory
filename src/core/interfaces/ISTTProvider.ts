export interface TranscriptionSegment {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  speakerId?: string;
}

export interface ISTTProvider {
  transcribe(audioPath: string): Promise<TranscriptionSegment[]>;
}
