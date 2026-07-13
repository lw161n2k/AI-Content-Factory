import { GoogleGenerativeAI, Schema, Type } from "@google/generative-ai";
import { GEMINI_API_KEY } from "../config";
import { TranscriptionSegment } from "../core/interfaces/ISTTProvider";
import { TranslatedSegment } from "../core/interfaces/ITranslationProvider";

const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    segments: {
      type: Type.ARRAY,
      description: "List of translated script segments.",
      items: {
        type: Type.OBJECT,
        properties: {
          index: {
            type: Type.INTEGER
          },
          startTime: {
            type: Type.NUMBER
          },
          endTime: {
            type: Type.NUMBER
          },
          speakerId: {
            type: Type.STRING
          },
          originalText: {
            type: Type.STRING
          },
          translatedText: {
            type: Type.STRING,
            description: "Vietnamese translation. Must be natural, engaging, emotional, and adapted to fit the available time window."
          }
        },
        required: ["index", "startTime", "endTime", "speakerId", "originalText", "translatedText"]
      }
    }
  },
  required: ["segments"]
};

export class VideoScriptTranslator {
  /**
   * Translates transcription segments into conversational, time-optimized Vietnamese.
   */
  public static async translate(segments: TranscriptionSegment[]): Promise<TranslatedSegment[]> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }

    console.log("Translating transcription segments using Gemini 1.5 Flash...");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const segmentsJson = JSON.stringify(segments, null, 2);

    const systemInstruction = 
      "You are a professional video translator, localized script editor, and media localization expert.\n" +
      "Your objective is to translate foreign video transcripts into high-quality, natural Vietnamese.\n\n" +
      "CRITICAL TRANSLATION RULES:\n" +
      "1. NEVER translate literally (word-for-word). Avoid machine translation feel. No literal translation of Chinese/English idioms.\n" +
      "2. Localize the language: make it sound like a native Vietnamese content creator. Use casual, engaging, and expressive spoken words (e.g. use 'mình', 'các bạn', 'bạn', 'cậu', 'tớ' appropriately based on speaker gender/age).\n" +
      "3. DUBBING TIME LIMITS: The voiceover generated from your translation must fit within the time window (duration = endTime - startTime).\n" +
      "   - On average, a person speaks 2.5 words per second in Vietnamese.\n" +
      "   - Calculate the duration of each segment. If the original text has many words but duration is short, you MUST condense and shorten the translation to make it brief yet keep the core meaning.\n" +
      "   - Do not make the translation too long. If the segment is 2 seconds long, the Vietnamese text must not exceed 5-6 words.\n" +
      "4. SUBTITLE READABILITY: Keep translations clear and split them into readable subtitle blocks (avoid long run-on sentences).\n" +
      "5. Preserve emotional tones (excited, sad, informative, sarcastic) through your word choices.\n" +
      "6. Match the speakerId: Keep speakers distinct and use pronouns consistently for each speakerId.";

    const prompt = 
      `Here is the original script JSON of the video. Please translate it into natural, time-synchronized Vietnamese:\n\n` +
      `${segmentsJson}\n\n` +
      `Output a structured JSON object strictly conforming to the requested schema. Return raw JSON text only.`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: translationSchema,
        temperature: 0.3 // balanced creativity vs accuracy
      }
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    if (!parsedData || !Array.isArray(parsedData.segments)) {
      throw new Error("Failed to parse Gemini response: 'segments' array not found in translation output.");
    }

    console.log(`Translation completed. Localized ${parsedData.segments.length} segments.`);
    return parsedData.segments as TranslatedSegment[];
  }
}
