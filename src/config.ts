import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config();

export const WORKSPACE_DIR = path.resolve(__dirname, "..");
export const BIN_DIR = path.join(WORKSPACE_DIR, "bin");
export const TEMP_DIR = path.join(WORKSPACE_DIR, "temp");
export const OUTPUT_DIR = path.join(WORKSPACE_DIR, "output");

export const FFMPEG_PATH = path.join(BIN_DIR, "ffmpeg.exe");
export const FFPROBE_PATH = path.join(BIN_DIR, "ffprobe.exe");
export const YT_DLP_PATH = path.join(BIN_DIR, "yt-dlp.exe");

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export const DEFAULT_FEMALE_VOICE = process.env.DEFAULT_FEMALE_VOICE || "vi-VN-HoaiMyNeural";
export const DEFAULT_MALE_VOICE = process.env.DEFAULT_MALE_VOICE || "vi-VN-NamMinhNeural";

// Ensure folders exist
export function initFolders() {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// Clean up temp directory
export function cleanTempFolder() {
  if (fs.existsSync(TEMP_DIR)) {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(TEMP_DIR, file));
    }
  }
}
