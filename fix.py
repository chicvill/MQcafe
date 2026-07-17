import json
import os

log_path = r'C:\Users\USER\.gemini\antigravity-ide\brain\256b4491-ddb0-40f7-bde4-81c53cbff6a7\.system_generated\logs\transcript_full.jsonl'

files = {}
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call['function']['name'] == 'default_api:write_to_file':
                        args = json.loads(call['function']['arguments'])
                        files[args['TargetFile']] = args['CodeContent']
                    elif call['function']['name'] == 'default_api:multi_replace_file_content':
                        args = json.loads(call['function']['arguments'])
                        target = args['TargetFile']
                        if target in files:
                            content = files[target]
                            lines = content.split('\n')
                            for chunk in args['ReplacementChunks']:
                                start = chunk['StartLine'] - 1
                                end = chunk['EndLine']
                                replacement = chunk['ReplacementContent']
                                lines = lines[:start] + [replacement] + lines[end:]
                            files[target] = '\n'.join(lines)
        except Exception as e:
            pass

for target, content in files.items():
    if target.endswith('.tsx') or target.endswith('.ts') or target.endswith('.tsx'):
        # Fix the Grid2 issue
        content = content.replace("'@mui/material/Grid2'", "'@mui/material/Grid'")
        with open(target, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Restored:', target)
