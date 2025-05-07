const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// 从用户 cURL 示例中获取的火山引擎 API Key
const VOLC_API_KEY = "7afc4c4a-c0bd-4b7a-9d25-ceb6ad9817b4";
const VOLC_API_HOST = "ark.cn-beijing.volces.com";
const VOLC_API_PATH = "/api/v3/chat/completions";
const MODEL_NAME = "doubao-1-5-thinking-pro-250415"; // 用户指定的模型
const API_TIMEOUT = 60000; // API 请求超时时间（毫秒）

const server = http.createServer(async (req, res) => {
    // 设置CORS头部，允许所有来源（开发时），生产环境应配置具体来源
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    if (parsedUrl.pathname === '/api/generate-name' && req.method === 'POST') {
        let requestBody = '';
        req.on('data', chunk => {
            requestBody += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { englishName } = JSON.parse(requestBody);

                if (!englishName || typeof englishName !== 'string' || englishName.trim() === '') {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'English name is required and must be a non-empty string.' }));
                    return;
                }

                // 为AI精心设计的系统提示和用户提示
                const systemPromptContent = `你是人工智能助手。你的任务是为外国人根据他们的英文名生成3个带有幽默感和中国文化元素的中文名。
每个名字都需要提供中文和英文的寓意解释。请确保名字有趣、独特，可以适当使用网络梗，但要保持积极向上、文雅且易于发音。
返回格式应该是一个JSON对象数组，每个对象包含 "chineseName", "chineseMeaning", "englishMeaning" 三个字段。例如：
[
  { "chineseName": "雷霆", "chineseMeaning": "象征力量和速度，如雷电般迅猛。", "englishMeaning": "Symbolizes power and speed, as swift as thunder." },
  { "chineseName": "夏雨荷", "chineseMeaning": "美丽的名字，让人联想到夏日雨后的荷花，清新脱俗。", "englishMeaning": "A beautiful name reminiscent of lotus flowers after a summer rain, fresh and refined." }
]
请确保返回严格的JSON格式的数组，不要包含任何JSON以外的解释性文本或markdown代码块标记。`;
                
                const userPromptContent = `请为英文名 \"${englishName}\" 生成三个符合上述要求的中文名。`;

                const volcEngineRequestBody = JSON.stringify({
                    model: MODEL_NAME,
                    messages: [
                        // System message to guide the AI's role and output format
                        { role: "system", content: systemPromptContent },
                        // User message providing the specific task (the English name)
                        { role: "user", content: userPromptContent }
                    ],
                });

                const options = {
                    hostname: VOLC_API_HOST,
                    path: VOLC_API_PATH,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${VOLC_API_KEY}`,
                        'Content-Length': Buffer.byteLength(volcEngineRequestBody)
                    },
                    timeout: API_TIMEOUT,
                };

                const volcRequest = https.request(options, (volcRes) => {
                    let volcData = '';
                    volcRes.setEncoding('utf8');
                    volcRes.on('data', (chunk) => {
                        volcData += chunk;
                    });
                    volcRes.on('end', () => {
                        if (volcRes.statusCode >= 200 && volcRes.statusCode < 300) {
                            try {
                                const parsedResponse = JSON.parse(volcData);
                                if (parsedResponse.choices && parsedResponse.choices.length > 0 && parsedResponse.choices[0].message && parsedResponse.choices[0].message.content) {
                                    let namesContent = parsedResponse.choices[0].message.content;
                                    // 尝试移除AI可能添加的Markdown代码块标记
                                    namesContent = namesContent.replace(/^```json\s*|```\s*$/g, '').trim();
                                    
                                    try {
                                        const namesArray = JSON.parse(namesContent);
                                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                                        res.end(JSON.stringify(namesArray));
                                    } catch (parseError) {
                                        console.error('Error parsing AI response content JSON:', parseError);
                                        console.error('Raw AI response content (after cleaning):', namesContent);
                                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                                        res.end(JSON.stringify({ error: 'AI response content is not valid JSON.', details: namesContent }));
                                    }
                                } else {
                                    console.error('Unexpected AI response structure:', volcData);
                                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                                    res.end(JSON.stringify({ error: 'Unexpected AI response structure.', details: volcData }));
                                }
                            } catch (e) {
                                console.error('Error parsing VolcEngine JSON response envelope:', e);
                                console.error('Raw VolcEngine response:', volcData);
                                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                                res.end(JSON.stringify({ error: 'Error processing AI response structure.', details: volcData }));
                            }
                        } else {
                            console.error(`VolcEngine API error: ${volcRes.statusCode}`, volcData);
                            res.writeHead(volcRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({ error: `AI service error: ${volcRes.statusCode}`, details: volcData }));
                        }
                    });
                });

                volcRequest.on('error', (e) => {
                    console.error('Error calling VolcEngine API:', e.message);
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Failed to call AI service.', details: e.message }));
                });

                volcRequest.on('timeout', () => {
                    volcRequest.destroy();
                    console.error('VolcEngine API request timed out');
                    res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'AI service request timed out.' }));
                });

                volcRequest.write(volcEngineRequestBody);
                volcRequest.end();

            } catch (parseError) {
                console.error('Error parsing request body:', parseError);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Invalid request body. Expecting JSON.' }));
            }
        });
    } else if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        serveStaticFile(filePath, 'text/html; charset=utf-8', res);
    } else if (parsedUrl.pathname.startsWith('/public/')) {
        const resourcePath = parsedUrl.pathname.substring('/public'.length);
        const filePath = path.join(__dirname, 'public', resourcePath);
        
        let contentType = 'text/plain; charset=utf-8';
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.css') {
            contentType = 'text/css; charset=utf-8';
        } else if (ext === '.js') {
            contentType = 'application/javascript; charset=utf-8';
        } else if (ext === '.png') {
            contentType = 'image/png';
        } else if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        } else if (ext === '.svg') {
            contentType = 'image/svg+xml';
        } else if (ext === '.woff2') {
            contentType = 'font/woff2';
        } else if (ext === '.woff') {
            contentType = 'font/woff';
        }

        serveStaticFile(filePath, contentType, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

function serveStaticFile(filePath, contentType, res) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('File not found');
            } else {
                console.error(`Error serving file ${filePath}:`, err);
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`API endpoint for name generation: POST http://localhost:${PORT}/api/generate-name`);
    console.log('Ensure index.html and files in public/ (e.g., public/js/script.js) are created.');
    
    // 创建 public 目录及其子目录（如果不存在）
    const publicDir = path.join(__dirname, 'public');
    const publicJsDir = path.join(publicDir, 'js');
    const publicCssDir = path.join(publicDir, 'css');
    const publicImgDir = path.join(publicDir, 'img');

    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
    if (!fs.existsSync(publicJsDir)) fs.mkdirSync(publicJsDir);
    if (!fs.existsSync(publicCssDir)) fs.mkdirSync(publicCssDir);
    if (!fs.existsSync(publicImgDir)) fs.mkdirSync(publicImgDir);
    console.log('Checked/created /public, /public/js, /public/css, /public/img directories.');
}); 