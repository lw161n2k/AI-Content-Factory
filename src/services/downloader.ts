import { execFileSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { YT_DLP_PATH, FFMPEG_PATH, BIN_DIR, TEMP_DIR, COOKIES_FROM_BROWSER } from "../config";

export interface DownloadResult {
  videoPath: string;
  audioPath: string;
  title: string;
}

export class VideoDownloader {
  private static normalizeUrl(url: string): string {
    if (url.includes("douyin.com")) {
      const modalMatch = url.match(/modal_id=([0-9]+)/);
      if (modalMatch && modalMatch[1]) {
        const videoId = modalMatch[1];
        const normalized = `https://www.douyin.com/video/${videoId}`;
        console.log(`Normalizing Douyin URL: ${url} -> ${normalized}`);
        return normalized;
      }
    }
    return url;
  }

  private static getYtDlpArgs(extraArgs: string[]): string[] {
    const args = [
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--add-header", "Referer:https://www.douyin.com/"
    ];
    if (COOKIES_FROM_BROWSER) {
      args.push("--cookies-from-browser", COOKIES_FROM_BROWSER);
    }
    return [...args, ...extraArgs];
  }

  /**
   * Downloads a video from TikTok, Douyin, or YouTube, and extracts its audio.
   * @param url The video URL
   * @returns The paths to the downloaded video and extracted audio
   */
  public static download(url: string): DownloadResult {
    url = this.normalizeUrl(url);
    console.log(`Starting download for: ${url}`);
    
    // Get video title first
    let title = "video";
    try {
      const titleOutput = execFileSync(YT_DLP_PATH, this.getYtDlpArgs([
        "--get-title",
        url
      ])).toString().trim();
      if (titleOutput) {
        title = titleOutput.replace(/[\\/:*?"<>|]/g, "_"); // sanitize file name characters
      }
    } catch (err) {
      console.warn("Could not retrieve video title via yt-dlp, using default 'video' name.", err);
    }
    
    const videoPath = path.join(TEMP_DIR, "original.mp4");
    const audioPath = path.join(TEMP_DIR, "original_audio.mp3");

    // Clean existing files if they exist
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    console.log(`Downloading video with yt-dlp...`);
    
    // Execute yt-dlp to download video and audio
    execFileSync(YT_DLP_PATH, this.getYtDlpArgs([
      "--ffmpeg-location", BIN_DIR,
      "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "-o", videoPath,
      url
    ]), { stdio: "inherit" });

    if (!fs.existsSync(videoPath)) {
      throw new Error("yt-dlp failed to download the video file.");
    }

    console.log(`Extracting original audio track using local FFmpeg...`);
    
    // Extract audio using ffmpeg
    execFileSync(FFMPEG_PATH, [
      "-y",
      "-i", videoPath,
      "-vn", // extract audio only
      "-acodec", "libmp3lame",
      "-q:a", "2", // high quality vbr
      audioPath
    ], { stdio: "ignore" });

    if (!fs.existsSync(audioPath)) {
      throw new Error("FFmpeg failed to extract the audio track from the downloaded video.");
    }

    console.log(`Download and audio extraction completed successfully for: ${title}`);
    
    return {
      videoPath,
      audioPath,
      title
    };
  }
}
