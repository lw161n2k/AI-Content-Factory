import { checkAndDownloadBinaries } from "./utils/downloader-bin";
import { VideoDownloader } from "./services/downloader";
import { VideoTranscriber } from "./services/transcriber";
import { VideoScriptTranslator } from "./services/translator";
import { TTSService } from "./services/tts";
import { VideoRenderer } from "./services/renderer";
import { MetadataGenerator } from "./services/metadata";
import { GEMINI_API_KEY, initFolders, cleanTempFolder } from "./config";
import * as path from "path";
import * as fs from "fs";

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.log("=================================================================");
    console.log("             AI CONTENT FACTORY - LOCAL CLI                      ");
    console.log("=================================================================");
    console.log("Usage:");
    console.log("  npm start <URL>");
    console.log("\nExamples:");
    console.log("  npm start https://www.tiktok.com/@username/video/1234567890");
    console.log("  npm start https://www.youtube.com/watch?v=abcdefghijk");
    console.log("  npm start https://www.youtube.com/shorts/abcdefgh");
    console.log("=================================================================");
    process.exit(1);
  }

  // 0. Setup folder structure & verify API Key
  initFolders();

  if (!GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY is not set in the .env file.");
    console.error("Please open '.env' and paste your Gemini API key.");
    process.exit(1);
  }

  const startTime = Date.now();
  console.log("-----------------------------------------------------------------");
  console.log(`[AI Content Factory] Starting pipeline for URL: ${url}`);
  console.log("-----------------------------------------------------------------");

  try {
    // 1. Ensure yt-dlp & FFmpeg binaries are ready
    await checkAndDownloadBinaries();

    // 2. Download media
    const media = VideoDownloader.download(url);

    // 3. Transcription & Speaker Diarization
    const transcription = await VideoTranscriber.transcribe(media.audioPath);
    if (transcription.length === 0) {
      throw new Error("No speech segments found in the video audio track.");
    }

    // 4. Localized Translation & Length Optimization
    const translation = await VideoScriptTranslator.translate(transcription);

    // 5. Generate Vietnamese Speech (Neural Edge-TTS)
    await TTSService.generateSpeechForAll(translation);

    // 6. Audio Sync, Ducking & Video Subtitle Render
    const renderedVideoPath = VideoRenderer.render(media.title, media.videoPath, translation);

    // 7. Viral Metadata & SEO Tags Generator
    const metadata = await MetadataGenerator.generate(media.title, translation);

    // 8. Completed successfully
    const durationMin = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log("\n=================================================================");
    console.log("🎉 SUCCESS: VIDEO TRANSLATION AND local DUBBING COMPLETED!");
    console.log(`⏱️ Total Time Elapsed: ${durationMin} minutes`);
    console.log(`📁 Output Folder: ${path.dirname(renderedVideoPath)}`);
    console.log(`🎥 Rendered Video: ${path.basename(renderedVideoPath)}`);
    console.log(`📝 Viral Description & Tags: metadata.txt`);
    console.log("=================================================================");
    
    // 9. Clean up temporary files
    console.log("Cleaning up temporary assets...");
    cleanTempFolder();
    console.log("Temporary assets cleaned. Workspace tidy!");

  } catch (error: any) {
    console.error("\n❌ PIPELINE FAILED!");
    console.error(error.message || error);
    console.log("-----------------------------------------------------------------");
    process.exit(1);
  }
}

main();
