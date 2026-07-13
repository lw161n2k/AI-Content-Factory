# AI Content Factory - Local CLI 🎬🤖

**AI Content Factory** là một công cụ chạy trên dòng lệnh (CLI) giúp tự động hóa quá trình Việt hóa và tối ưu hóa nội dung video nước ngoài (TikTok, Douyin, YouTube, YouTube Shorts) thành các video lồng tiếng Việt chất lượng cao sẵn sàng để đăng tải nhằm tối ưu hóa lượt xem và doanh thu.

Không giống như các công cụ dịch video thông thường, AI Content Factory tập trung vào việc tạo ra sản phẩm hoàn chỉnh, tự nhiên như người Việt biên tập và tối ưu hóa cho khả năng phân phối viral.

---

## ✨ Tính năng nổi bật

1. **Auto-Downloader cho FFmpeg/yt-dlp**: Tự động kiểm tra và tải các file nhị phân (`yt-dlp.exe`, `ffmpeg.exe`, `ffprobe.exe`) cần thiết về máy cục bộ ngay trong lần chạy đầu tiên. Không cần cài đặt hệ thống phức tạp.
2. **Dịch thuật & Biên tập Tối ưu thời lượng (Gemini 1.5 Flash)**:
   * Bản dịch tự nhiên, thuần Việt, phù hợp với văn hóa nói của người Việt.
   * **Tự động co ngắn kịch bản**: Nếu câu gốc ngắn nhưng nói nhiều từ, AI sẽ tự động rút gọn câu dịch để khi lồng tiếng không bị nhanh hoặc tràn sang phân đoạn khác.
3. **Nhận diện giọng nói & Diarization**: Phân tích giọng nói gốc và gán giọng đọc tương ứng ( SPEAKER_1 lồng giọng Nữ, SPEAKER_2 lồng giọng Nam).
4. **Text-To-Speech (Edge-TTS) Miễn phí**:
   * Sử dụng giọng đọc Neural đỉnh cao của Microsoft Edge (`vi-VN-HoaiMyNeural` cho giọng nữ và `vi-VN-NamMinhNeural` cho giọng nam).
   * Giọng đọc truyền cảm, tốc độ đọc tự nhiên, **hoàn toàn miễn phí** và không giới hạn ký tự.
5. **Đồng bộ âm thanh (Audio Sync & Speedup)**: Tự động đo độ dài audio lồng tiếng, điều chỉnh tốc độ nói (tối đa 1.3x) thông qua bộ lọc `atempo` của FFmpeg để đảm bảo khớp khẩu hình và thời lượng của video gốc.
6. **Lọc Ducking giữ nhạc nền gốc (Sidechain Compress)**: Nhạc nền và hiệu ứng âm thanh (tiếng cười, tiếng động môi trường) của video gốc sẽ **tự động giảm âm lượng đi 18dB** mỗi khi có giọng lồng tiếng Việt cất lên và tự động to lại khi hết câu nói.
7. **Phụ đề ASS chuyên nghiệp**: Tự động chèn phụ đề định dạng ASS cao cấp có viền đen dày nổi bật trên mọi khung hình, được căn lề đẩy cao (MarginV) để tránh bị đè bởi giao diện nút bấm trên TikTok/Shorts.
8. **Tạo nội dung Viral & Kiểm duyệt (Safe Audit)**: Tự động tạo 3 tùy chọn tiêu đề thu hút, captions có hook, 15 hashtags xu hướng, SEO tags và cảnh báo nếu video chứa nội dung nhạy cảm.

---

## 🛠️ Yêu cầu hệ thống

* **Node.js** phiên bản 18 trở lên.
* **Git** (để clone dự án).
* **Kết nối Internet** (để tải các binary phụ thuộc trong lần đầu chạy và gọi Gemini API).
* **Gemini API Key** (Nhận miễn phí tại [Google AI Studio](https://aistudio.google.com/)).

---

## 🚀 Hướng dẫn cài đặt & Chạy dự án

### Bước 1: Clone dự án về máy
Mở Terminal/Command Prompt trên máy của bạn và chạy lệnh:
```bash
git clone https://github.com/lw161n2k/AI-Content-Factory.git
cd AI-Content-Factory
```

### Bước 2: Cài đặt các thư viện Node.js
```bash
npm install
```

### Bước 3: Cấu hình khóa API (Environment Variables)
1. Tạo một file tên `.env` ở thư mục gốc của dự án (hoặc đổi tên file `.env.example` nếu có).
2. Thêm khóa API Gemini của bạn vào file `.env`:
   ```env
   GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere..."
   ```

*(Lưu ý: Bạn cũng có thể cấu hình ElevenLabs API Key tại đây nếu muốn sử dụng công nghệ clone giọng nói trả phí, mặc định hệ thống sẽ dùng Edge-TTS miễn phí).*

### Bước 4: Chạy dự án
Chạy lệnh khởi động kèm theo đường dẫn video (TikTok, Douyin, YouTube, YouTube Shorts) mà bạn muốn xử lý:

```bash
npm start <URL_VIDEO>
```

**Ví dụ:**
```bash
npm start https://www.youtube.com/shorts/3i_p5Y_2g28
```

---

## 📂 Kết quả đầu ra (Output)

Sau khi xử lý thành công, toàn bộ file tạm sẽ được dọn dẹp sạch sẽ để tiết kiệm ổ cứng. Kết quả hoàn chỉnh sẽ nằm trong thư mục `output/[Tên_Video_Gốc]/` bao gồm:
* 🎥 `processed.mp4`: Video chất lượng gốc đã được chèn sub đẹp, lồng tiếng Việt và ducking nhạc nền tự động.
* 📝 `metadata.txt`: File chứa 3 tiêu đề viral gợi ý, caption đăng bài, danh sách hashtags, bộ từ khóa SEO phục vụ đăng bài đa nền tảng và báo cáo kiểm duyệt nội dung an toàn.

---

## 📐 Kiến trúc dự án (Clean Architecture)

Dự án được thiết kế theo mô hình Clean Architecture để dễ dàng mở rộng thêm các AI Provider hoặc các module Publisher (tự động đăng bài lên TikTok/Facebook) trong tương lai:
* `src/core/`: Định nghĩa các Interface và thực thể (STT, TTS, Translation, Publisher).
* `src/services/`: Triển khai các dịch vụ chức năng (Gemini Transcriber, FFmpeg Renderer, Edge-TTS,...).
* `src/utils/`: Chứa các tiện ích tải binary tự động và client WebSocket Edge-TTS.
* `src/index.ts`: Bộ điều phối chính (Orchestrator CLI).

---

## 📝 Giấy phép
Dự án được phân phối dưới giấy phép MIT License.
