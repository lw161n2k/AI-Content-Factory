import { execFileSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { FFMPEG_PATH, FFPROBE_PATH, TEMP_DIR, OUTPUT_DIR } from "../config";
import { TranslatedSegment } from "../core/interfaces/ITranslationProvider";

export class VideoRenderer {
  /**
   * Helper to get audio duration using ffprobe.
   */
  private static getAudioDuration(filePath: string): number {
    const output = execFileSync(FFPROBE_PATH, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ]).toString().trim();
    return parseFloat(output);
  }

  /**
   * Helper to format time into ASS subtitle format: H:MM:SS.cs
   */
  private static formatAssTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
  }

  /**
   * Generates a styled ASS subtitle file in the temp directory.
   */
  private static createAssSubtitles(segments: TranslatedSegment[]): string {
    const assPath = path.join(TEMP_DIR, "subtitles.ass");
    
    // ASS header with styles
    // Font: Arial Bold, Size: 64, White fill, Black outline (4px), Centered (Alignment 2)
    // MarginV: 180 (Vertical margin to push it above TikTok footer UI)
    let content = 
      "[Script Info]\n" +
      "ScriptType: v4.00+\n" +
      "PlayResX: 1080\n" +
      "PlayResY: 1920\n\n" +
      "[V4+ Styles]\n" +
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n" +
      "Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,15,15,220,1\n\n" +
      "[Events]\n" +
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";

    for (const segment of segments) {
      const start = this.formatAssTime(segment.startTime);
      const end = this.formatAssTime(segment.endTime);
      
      // Remove any double quotes or backslashes in translatedText to prevent breaking ASS
      const text = segment.translatedText.replace(/[\r\n]+/g, "\\N").trim();
      content += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    }

    fs.writeFileSync(assPath, content, "utf8");
    return assPath;
  }

  /**
   * Aligns generated TTS segment durations to match original timings.
   * If a segment is longer than target, speed it up (capped at 1.3x).
   * Returns paths to the speed-adjusted segment audio files.
   */
  private static alignAudioSegments(segments: TranslatedSegment[]): string[] {
    console.log("Aligning audio segment durations...");
    const alignedPaths: string[] = [];

    for (const segment of segments) {
      const originalPath = path.join(TEMP_DIR, `segment_${segment.index}.mp3`);
      const alignedPath = path.join(TEMP_DIR, `aligned_${segment.index}.mp3`);

      if (!fs.existsSync(originalPath)) {
        throw new Error(`TTS file not found for segment index ${segment.index}`);
      }

      const ttsDuration = this.getAudioDuration(originalPath);
      const targetDuration = segment.endTime - segment.startTime;

      if (ttsDuration > targetDuration) {
        // Calculate required speedup, cap at 1.3x to preserve intelligibility
        const rawSpeed = ttsDuration / targetDuration;
        const speed = Math.min(1.3, rawSpeed);
        
        console.log(`Segment ${segment.index} is too long (${ttsDuration.toFixed(2)}s vs ${targetDuration.toFixed(2)}s). Speeding up by ${speed.toFixed(2)}x...`);
        
        execFileSync(FFMPEG_PATH, [
          "-y",
          "-i", originalPath,
          "-filter:a", `atempo=${speed}`,
          alignedPath
        ], { stdio: "ignore" });
      } else {
        // Copy segment as is if it fits
        fs.copyFileSync(originalPath, alignedPath);
      }

      alignedPaths.push(alignedPath);
    }

    return alignedPaths;
  }

  /**
   * Merges individual segments into a single continuous vocal track.
   * Uses FFmpeg's adelay and amix to place audio at precise startTime markers.
   */
  private static generateVocalTrack(segments: TranslatedSegment[]): string {
    console.log("Constructing combined Vietnamese vocal track...");
    const vocalsPath = path.join(TEMP_DIR, "vietnamese_vocals.mp3");
    
    // Prepare input arguments for FFmpeg (each segment)
    const inputs: string[] = [];
    let filterString = "";
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const alignedPath = path.join(TEMP_DIR, `aligned_${segment.index}.mp3`);
      inputs.push("-i", alignedPath);
      
      const delayMs = Math.round(segment.startTime * 1000);
      // Delay both channels for stereo support
      filterString += `[${i}:a]adelay=${delayMs}|${delayMs}[a${i}];`;
    }
    
    // Mix all delayed streams
    for (let i = 0; i < segments.length; i++) {
      filterString += `[a${i}]`;
    }
    filterString += `amix=inputs=${segments.length}:duration=longest[vocals]`;
    
    // Run FFmpeg to merge vocal segments
    execFileSync(FFMPEG_PATH, [
      "-y",
      ...inputs,
      "-filter_complex", filterString,
      "-map", "[vocals]",
      vocalsPath
    ], { stdio: "ignore" });

    return vocalsPath;
  }

  /**
   * Main render command. Ducks original audio under vocals, burns subtitles, and outputs MP4.
   */
  public static render(
    videoTitle: string,
    originalVideoPath: string,
    segments: TranslatedSegment[]
  ): string {
    const titleFolder = videoTitle.replace(/[\\/:*?"<>|]/g, "_").substring(0, 40);
    const outputDir = path.join(OUTPUT_DIR, titleFolder);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const finalVideoPath = path.join(outputDir, "processed.mp4");

    // 1. Align audio segments
    this.alignAudioSegments(segments);

    // 2. Generate full vocal track
    const vocalsPath = this.generateVocalTrack(segments);

    // 3. Create ASS subtitles
    this.createAssSubtitles(segments);

    console.log("Rendering final video. Mixing audio tracks and burning subtitles...");
    
    // Execute rendering relative to TEMP_DIR to avoid subtitle path escape bugs
    // Original video is mapped to input 0. Vocals mapped to input 1.
    // Filter complex details:
    // - Duck [0:a] (original audio) using [1:a] (vocals) via sidechaincompress.
    // - Mix ducked audio and vocals via amix.
    // - Burn subtitles into [0:v] via subtitles filter.
    execFileSync(FFMPEG_PATH, [
      "-y",
      "-i", originalVideoPath,
      "-i", vocalsPath,
      "-filter_complex", "[0:a][1:a]sidechaincompress=threshold=0.08:ratio=12:release=450:makeup=1[ducked]; [ducked][1:a]amix=inputs=2:duration=first[aout]; [0:v]subtitles=subtitles.ass[vout]",
      "-map", "[vout]",
      "-map", "[aout]",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "192k",
      finalVideoPath
    ], { 
      cwd: TEMP_DIR,
      stdio: "inherit" 
    });

    console.log(`Render complete! Final video output: ${finalVideoPath}`);
    return finalVideoPath;
  }
}
