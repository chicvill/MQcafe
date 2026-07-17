const fs = require('fs');
const readline = require('readline');

const log_path = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\256b4491-ddb0-40f7-bde4-81c53cbff6a7\\.system_generated\\logs\\transcript_full.jsonl';

const files = {};

async function processLineByLine() {
    const fileStream = fs.createReadStream(log_path);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line) continue;
        try {
            const data = JSON.parse(line);
            if (data.tool_calls) {
                for (const call of data.tool_calls) {
                    if (call.function.name === 'default_api:write_to_file') {
                        const args = JSON.parse(call.function.arguments);
                        files[args.TargetFile] = args.CodeContent;
                    } else if (call.function.name === 'default_api:multi_replace_file_content') {
                        const args = JSON.parse(call.function.arguments);
                        const target = args.TargetFile;
                        if (files[target]) {
                            let contentLines = files[target].split('\n');
                            for (const chunk of args.ReplacementChunks) {
                                const start = chunk.StartLine - 1;
                                const end = chunk.EndLine;
                                const replacement = chunk.ReplacementContent;
                                contentLines.splice(start, end - start, replacement);
                            }
                            files[target] = contentLines.join('\n');
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore parse errors on individual lines
        }
    }

    // Now write out the fixed files
    for (const [target, content] of Object.entries(files)) {
        if (target.endsWith('.tsx') || target.endsWith('.ts')) {
            const fixedContent = content.replace(/'@mui\/material\/Grid2'/g, "'@mui/material/Grid'");
            fs.writeFileSync(target, fixedContent, 'utf-8');
            console.log('Restored:', target);
        }
    }
}

processLineByLine().catch(console.error);
