import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/files";
import { GEMINI_API_KEY } from "../config";
import { TranscriptionSegment } from "../core/interfaces/ISTTProvider";

const transcriptionSchema = {
  type: "OBJECT",
  properties: {
    segments: {
      type: "ARRAY",
      description: "List of transcribed speech segments in chronological order.",
      items: {
        type: "OBJECT",
        properties: {
          index: {
            type: "INTEGER",
            description: "1-based incremental index of the segment."
          },
          startTime: {
            type: "NUMBER",
            description: "Start time of the speech in seconds (decimal format)."
          },
          endTime: {
            type: "NUMBER",
            description: "End time of the speech in seconds (decimal format)."
          },
          text: {
            type: "STRING",
            description: "The transcription of what was said in the original spoken language."
          },
          speakerId: {
            type: "STRING",
            description: "An identifier for the speaker, e.g. SPEAKER_1, SPEAKER_2. Perform speaker diarization to separate voices."
          }
        },
        required: ["index", "startTime", "endTime", "text", "speakerId"]
      }
    }
  },
  required: ["segments"]
};

export class VideoTranscriber {
  /**
   * Transcribes an audio file into timestamps and speakers using Gemini 1.5 Flash.
   */
  public static async transcribe(audioPath: string): Promise<TranscriptionSegment[]> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }

    console.log("Uploading audio track to Gemini File Manager...");
    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    const uploadResult = await fileManager.uploadFile(audioPath, {
      mimeType: "audio/mp3",
      displayName: "Vocal Audio Extract"
    });

    const fileName = uploadResult.file.name;
    console.log(`Audio uploaded successfully. Processing file: ${fileName}`);

    try {
      // Poll file state until it's active
      let file = await fileManager.getFile(fileName);
      while (file.state === "PROCESSING") {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await fileManager.getFile(fileName);
      }

      console.log(""); // new line after dots

      if (file.state === "FAILED") {
        throw new Error("Gemini File Manager reports that the uploaded audio processing failed.");
      }

      console.log("Audio file is active in Gemini. Transcribing and diarizing...");
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      
      // Use gemini-1.5-flash for fast and cost-effective transcription
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash"
      });

      const prompt = 
        "You are an expert audio transcriber and editor. " +
        "Analyze the uploaded audio file and transcribe all spoken content. " +
        "Perform speaker diarization to identify who is speaking (use SPEAKER_1, SPEAKER_2, etc.). " +
        "Output the transcript as a structured JSON object strictly conforming to the requested schema. " +
        "Do not output markdown code blocks wrapper, output raw JSON content only.";

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: transcriptionSchema,
          temperature: 0.1 // Keep it deterministic for timestamps
        } as any
      });

      const responseText = result.response.text();
      const parsedData = JSON.parse(responseText);

      if (!parsedData || !Array.isArray(parsedData.segments)) {
        throw new Error("Failed to parse Gemini response: 'segments' array not found.");
      }

      console.log(`Transcription completed. Found ${parsedData.segments.length} segments.`);
      return parsedData.segments as TranscriptionSegment[];

    } finally {
      // Clean up file in Gemini Storage
      try {
        console.log(`Cleaning up uploaded file ${fileName} from Gemini storage...`);
        await fileManager.deleteFile(fileName);
        console.log("Gemini storage cleaned.");
      } catch (err) {
        console.warn(`Failed to delete temporary file ${fileName} from Gemini storage:`, err);
      }
    }
  }
}
