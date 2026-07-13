import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { GEMINI_API_KEY, OUTPUT_DIR } from "../config";
import { TranslatedSegment } from "../core/interfaces/ITranslationProvider";

export class MetadataGenerator {
  /**
   * Generates viral metadata and safety audits for the translated video.
   */
  public static async generate(
    videoTitle: string,
    segments: TranslatedSegment[]
  ): Promise<string> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }

    const titleFolder = videoTitle.replace(/[\\/:*?"<>|]/g, "_").substring(0, 40);
    const outputDir = path.join(OUTPUT_DIR, titleFolder);
    const outputPath = path.join(outputDir, "metadata.txt");

    console.log("Generating viral metadata via Gemini...");

    const scriptText = segments
      .map((s) => `[SPEAKER_${s.speakerId || 1}]: ${s.translatedText}`)
      .join("\n");

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const systemInstruction = 
      "You are a master social media growth hacker, product manager, and SEO specialist.\n" +
      "Your goal is to take a translated video script and write highly optimized viral metadata in Vietnamese.\n" +
      "Format your output in a clear, easy-to-read text report.";

    const prompt = 
      `Based on the following Vietnamese video script, generate viral distribution metadata:\n\n` +
      `SCRIPT:\n${scriptText}\n\n` +
      `Please provide the following sections in Vietnamese:\n` +
      `1. TIÊU ĐỀ VIRAL (Generate 3 options: clickbait, curiosity, and benefit-driven. Keep it under 60 characters).\n` +
      `2. CAPTION / MÔ TẢ (Write a highly engaging short hook for TikTok and YouTube Shorts, including call-to-actions like 'Follow' or 'Comment').\n` +
      `3. HASHTAGS (Provide 10-15 trending hashtags, mixed between general viral hashtags like #xuhuong, #fyp and niche script-related ones).\n` +
      `4. TỪ KHÓA SEO (List 10 highly searched SEO tags/keywords related to this topic).\n` +
      `5. CẢNH BÁO NỘI DUNG NHẠY CẢM (Audit the script for sensitive topics: violence, politics, adult themes, copyright-prone words. If safe, write 'Nội dung an toàn, sẵn sàng đăng!'. If sensitive, clearly state the warning and recommendations).`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction,
      generationConfig: {
        temperature: 0.7
      }
    });

    const metadataText = result.response.text().trim();

    // Ensure output folder exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write metadata to file
    fs.writeFileSync(outputPath, metadataText, "utf8");
    console.log(`Viral metadata saved successfully to: ${outputPath}`);

    return metadataText;
  }
}
