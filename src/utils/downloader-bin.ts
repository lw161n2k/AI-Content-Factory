import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { execSync } from "child_process";
import { BIN_DIR, FFMPEG_PATH, FFPROBE_PATH, YT_DLP_PATH, initFolders } from "../config";

const YT_DLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const FFMPEG_ZIP_URL = "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-win-64.zip";
const FFPROBE_ZIP_URL = "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffprobe-6.1-win-64.zip";

async function downloadFile(url: string, outputPath: string) {
  console.log(`Downloading ${url} -> ${outputPath}...`);
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream"
  });

  response.data.pipe(writer);

  return new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

function extractZip(zipPath: string, destDir: string) {
  console.log(`Extracting ${zipPath} to ${destDir}...`);
  try {
    // Windows 10/11 comes with tar.exe pre-installed, which can extract .zip files!
    execSync(`tar -xf "${zipPath}" -C "${destDir}"`, { stdio: "inherit" });
    fs.unlinkSync(zipPath); // Delete zip after extraction
  } catch (error) {
    console.error(`Failed to extract using tar: ${error}. Trying PowerShell...`);
    try {
      execSync(`powershell.exe -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: "inherit" });
      fs.unlinkSync(zipPath);
    } catch (psError) {
      console.error(`PowerShell extraction also failed: ${psError}`);
      throw new Error(`Failed to extract ${zipPath}. Please extract it manually to ${destDir}`);
    }
  }
}

export async function checkAndDownloadBinaries() {
  initFolders();

  // Check yt-dlp
  if (!fs.existsSync(YT_DLP_PATH)) {
    console.log("yt-dlp.exe not found. Downloading...");
    await downloadFile(YT_DLP_URL, YT_DLP_PATH);
    console.log("yt-dlp.exe downloaded successfully.");
  } else {
    console.log("yt-dlp.exe is already present.");
  }

  // Check ffmpeg
  if (!fs.existsSync(FFMPEG_PATH)) {
    console.log("ffmpeg.exe not found. Downloading...");
    const ffmpegZip = path.join(BIN_DIR, "ffmpeg.zip");
    await downloadFile(FFMPEG_ZIP_URL, ffmpegZip);
    extractZip(ffmpegZip, BIN_DIR);
    console.log("ffmpeg.exe extracted successfully.");
  } else {
    console.log("ffmpeg.exe is already present.");
  }

  // Check ffprobe
  if (!fs.existsSync(FFPROBE_PATH)) {
    console.log("ffprobe.exe not found. Downloading...");
    const ffprobeZip = path.join(BIN_DIR, "ffprobe.zip");
    await downloadFile(FFPROBE_ZIP_URL, ffprobeZip);
    extractZip(ffprobeZip, BIN_DIR);
    console.log("ffprobe.exe extracted successfully.");
  } else {
    console.log("ffprobe.exe is already present.");
  }

  console.log("All dependency binaries are ready!");
}

// If run directly
if (require.main === module) {
  checkAndDownloadBinaries().catch((err) => {
    console.error("Binary download script failed:", err);
    process.exit(1);
  });
}
