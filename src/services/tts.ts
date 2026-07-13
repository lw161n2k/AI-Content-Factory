import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { generateEdgeTTS } from "../utils/edge-tts";
import { TEMP_DIR, ELEVENLABS_API_KEY, DEFAULT_FEMALE_VOICE, DEFAULT_MALE_VOICE } from "../config";
import { TranslatedSegment } from "../core/interfaces/ITranslationProvider";

export interface TTSSegmentResult {
  segmentIndex: number;
  audioPath: string;
}

export class TTSService {
  /**
   * Generates audio for a single text segment using the appropriate voice.
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
    
    if (ELEVENLABS_API_KEY) {
      console.log(`[ElevenLabs] Synthesizing segment ${index} for ${speakerId}...`);
      try {
        // ElevenLabs default voices:
        // Rachel (Female): 21m00Tcm4TlvDq8ikWAM
        // Adam (Male): pNInz6obpgq5paNsJ7vm
        const voiceId = isFemale ? "21m00Tcm4TlvDq8ikWAM" : "pNInz6obpgq5paNsJ7vm";
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        
        const response = await axios({
          method: "POST",
          url,
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
          },
          data: {
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          },
          responseType: "stream"
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        return outputPath;
      } catch (err) {
        console.warn(`ElevenLabs TTS failed for segment ${index}. Falling back to Edge-TTS. Error:`, err);
        // Fall back to Edge TTS
      }
    }

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
