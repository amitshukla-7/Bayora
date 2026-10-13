import fs from 'fs';
import readline from 'readline';
import path from 'path';

const TRANSCRIPT_PATH = "C:\\Users\\Milind Garg\\.gemini\\antigravity-ide\\brain\\73712ac5-e07e-4e8d-9d25-b5b34715575c\\.system_generated\\logs\\transcript_full.jsonl";
const OUTPUT_PATH = path.resolve('c:/Projects/Bayora/Bayora_Sentinel_Chat_Export.md');

async function exportChat() {
  if (!fs.existsSync(TRANSCRIPT_PATH)) {
    console.error(`Transcript file not found at: ${TRANSCRIPT_PATH}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(TRANSCRIPT_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const out = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf-8' });

  out.write(`# Bayora Sentinel — Complete Conversation & Engineering Transcript Export\n\n`);
  out.write(`- **Project:** Bayora Sentinel (Adversarial AI Security Verification)\n`);
  out.write(`- **Conversation ID:** \`73712ac5-e07e-4e8d-9d25-b5b34715575c\`\n`);
  out.write(`- **Export Date:** ${new Date().toLocaleString()}\n`);
  out.write(`- **Repository:** https://github.com/amitshukla-7/Bayora\n\n`);
  out.write(`---\n\n`);

  let userCount = 0;
  let assistantCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);

      if (obj.type === 'USER_INPUT') {
        const content = (obj.content || '').trim();
        // Skip automated system messages or empty inputs
        if (!content || content.includes('<SYSTEM_MESSAGE>')) continue;

        // Clean user request tags if present
        let cleanText = content;
        const match = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
        if (match) {
          cleanText = match[1].trim();
        }

        userCount++;
        out.write(`\n## 👤 User (Turn #${userCount} · Step ${obj.step_index})\n\n`);
        out.write(`${cleanText}\n\n`);
        out.write(`---\n\n`);
      } else if (obj.type === 'PLANNER_RESPONSE' && obj.content) {
        const content = obj.content.trim();
        if (!content) continue;

        assistantCount++;
        out.write(`\n## 🤖 Antigravity AI Assistant (Response #${assistantCount} · Step ${obj.step_index})\n\n`);
        out.write(`${content}\n\n`);
        out.write(`---\n\n`);
      }
    } catch {
      // ignore parse errors for partial lines
    }
  }

  out.end();
  console.log(`Chat export successfully created at: ${OUTPUT_PATH}`);
  console.log(`Exported ${userCount} user prompts and ${assistantCount} assistant responses.`);
}

exportChat();
