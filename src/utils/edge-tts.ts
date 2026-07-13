import WebSocket from "ws";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";

/**
 * Custom Edge-TTS implementation in Node.js via WebSocket.
 * No API key required. Highly realistic neural voices.
 */
export function generateEdgeTTS(text: string, voice: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = uuidv4().replace(/-/g, "");
    const dateStr = new Date().toISOString();

    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D3C9E9E298&ConnectionId=${requestId}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        "Origin": "chrome-extension://jdiccjdfccgopphcaaaagociejefccaj",
      }
    });

    const audioChunks: Buffer[] = [];

    ws.on("open", () => {
      // 1. Send Configuration Message
      const configPayload = 
        `X-Timestamp:${dateStr}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            system: {
              name: "SpeechSDK",
              version: "1.12.1-rc.1",
              build: "JavaScript",
              lang: "JavaScript",
              os: {
                platform: "Browser/WebKit",
                name: "Chrome",
                version: "120.0.0.0"
              }
            }
          }
        });

      ws.send(configPayload);

      // 2. Send Synthesis Request (SSML)
      // Escape special XML characters in text
      const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

      const ssmlPayload = 
        `X-RequestId:${requestId}\r\n` +
        `X-Timestamp:${dateStr}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `Path:ssml\r\n\r\n` +
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'>` +
          `<voice name='${voice}'>` +
            `<prosody rate='+0%' pitch='+0%'>${escapedText}</prosody>` +
          `</voice>` +
        `</speak>`;

      ws.send(ssmlPayload);
    });

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        // Binary response contains audio data
        // Binary message starts with a 12-byte header.
        // First 2 bytes (Big Endian) is the length of the string metadata header.
        // Followed by that header.
        // Followed by the raw audio stream data.
        const buffer = data as Buffer;
        if (buffer.length > 2) {
          const headerLength = buffer.readUInt16BE(0);
          const audioPayload = buffer.subarray(2 + headerLength);
          if (audioPayload.length > 0) {
            audioChunks.push(audioPayload);
          }
        }
      } else {
        // Text response (contains metadata or turn events)
        const textMessage = data.toString();
        if (textMessage.includes("Path:turn.end")) {
          ws.close();
        }
      }
    });

    ws.on("close", () => {
      if (audioChunks.length === 0) {
        reject(new Error("No audio data received from Edge TTS WebSocket."));
        return;
      }
      
      const fileBuffer = Buffer.concat(audioChunks);
      try {
        fs.writeFileSync(outputPath, fileBuffer);
        resolve(outputPath);
      } catch (err) {
        reject(err);
      }
    });

    ws.on("error", (error) => {
      reject(error);
    });
  });
}
