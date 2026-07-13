import * as path from "path";
import * as fs from "fs";
import { generateEdgeTTS } from "../utils/edge-tts";
import { TEMP_DIR, DEFAULT_FEMALE_VOICE, DEFAULT_MALE_VOICE } from "../config";
import { TranslatedSegment } from "../core/interfaces/ITranslationProvider";

export interface TTSSegmentResult {
  segmentIndex: number;
  audioPath: string;
}

export class TTSService {
  /**
   * Generates audio for a single text segment using the Edge-TTS voice.
   */
  public static async generateSpeechForSegment(
    text: string, 
    speakerId: string, 
    index: number
  ): Promise<string> {
    const filename = `segment_${index}.mp3`;
    const outputPath = path.join(TEMP_DIR, filename);

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    // Determine voice gender mapping
    const isFemale = speakerId.toLowerCase().includes("1") || speakerId.toLowerCase().includes("female") || index % 2 === 0;
    
    // Edge-TTS default
    const voice = isFemale ? DEFAULT_FEMALE_VOICE : DEFAULT_MALE_VOICE;
    console.log(`[EdgeTTS] Synthesizing segment ${index} using ${voice}...`);
    await generateEdgeTTS(text, voice, outputPath);
    return outputPath;
  }

  /**
   * Generates audio for all script segments sequentially.
   */
  public static async generateSpeechForAll(
    segments: TranslatedSegment[]
  ): Promise<TTSSegmentResult[]> {
    console.log(`Generating speech for ${segments.length} segments...`);
    const results: TTSSegmentResult[] = [];

    for (const segment of segments) {
      const audioPath = await this.generateSpeechForSegment(
        segment.translatedText,
        segment.speakerId || "SPEAKER_1",
        segment.index
      );
      results.push({
        segmentIndex: segment.index,
        audioPath
      });
    }

    console.log("All audio segments generated.");
    return results;
  }
}

