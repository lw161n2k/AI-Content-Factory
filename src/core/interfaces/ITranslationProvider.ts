import { TranscriptionSegment } from "./ISTTProvider";

export interface TranslatedSegment {
  index: number;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText: string;
  speakerId?: string;
}

export interface ViralMetadata {
  title: string;
  description: string;
  tags: string[];
  keywords: string[];
}

export interface ITranslationProvider {
  translateScript(segments: TranscriptionSegment[]): Promise<TranslatedSegment[]>;
  generateViralMetadata(scriptText: string): Promise<ViralMetadata>;
}
