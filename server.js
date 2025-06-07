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

        req.on('end', () => {
            try {
                const { englishName, mbti, gender } = JSON.parse(requestBody);

                if (!englishName || typeof englishName !== 'string' || englishName.trim() === '') {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'English name is required and must be a non-empty string.' }));
                    return;
                }

                // 为AI精心设计的系统提示和用户提示
                let systemPromptContent = `你是人工智能助手，一位精通中国文化、语言艺术、个性心理学（如MBTI）及传统玄学（如简易风水、生肖、姓名学）的起名大师。
你的任务是为外国人根据他们提供的英文名、MBTI人格类型（如果提供）和性别（如果提供）生成3个富有创意、带有幽默感和深厚中国文化底蕴的中文名。

每个名字都需要提供以下信息：
1.  中文名 (chineseName)
2.  中文寓意 (chineseMeaning): 解释名字的字面意思和引申含义，体现文化和美好祝愿。
3.  英文寓意 (englishMeaning): 对中文寓意的英文翻译和解释。
4.  玄学浅析 (fengShuiMeaning): 从简化的风水、五行、生肖或姓名学等角度，趣味性地解读名字可能带来的吉祥寓意或能量导向，可以幽默一些，不必过于严肃精准，点到为止。

请在生成名字时：
-   如果用户提供了MBTI，尝试将MBTI的某些特质巧妙地融入部分名字的寓意或选字中，或在玄学浅析中提及性格相关的祝福。
-   如果用户提供了性别，请确保名字在音韵和字义上符合对应性别的气质，当然也可以考虑一些中性或突破传统印象的名字如果合适的话。
-   名字应有趣、独特、积极向上、文雅且易于发音。
-   可以适当使用一些轻松的网络梗或幽默元素，但要避免低俗或冒犯性的内容。
-   重点理解英文名的发音或含义，并在此基础上进行意译或音译创新，赋予中文名新的生命力。

返回格式严格要求为一个JSON对象数组，每个对象包含 "chineseName", "chineseMeaning", "englishMeaning", "fengShuiMeaning" 四个字段。例如：
[
  {
    "chineseName": "雷笑天",
    "chineseMeaning": "'雷'象征力量与声势，'笑天'寓意乐观开朗，笑对人生，响彻云天。适合性格外向、有活力的人。",
    "englishMeaning": "'Lei' (Thunder) symbolizes power and presence. 'XiaoTian' (Laughing at the Sky) implies optimism, facing life with a laugh that resounds in the heavens. Suitable for an outgoing and energetic person.",
    "fengShuiMeaning": "名字带水带火，若八字喜水火则为佳。'天'字有助拓展视野和心胸，笑口常开，好运自然来。MBTI中E型人格或有此名，社交场合如鱼得水。"
  }
]
请确保返回严格的JSON格式的数组，不要包含任何JSON以外的解释性文本或markdown代码块标记。`;
                
                let userPromptContent = `请为英文名 \"${englishName}\" 生成三个符合上述要求的中文名。`;
                if (mbti && mbti.trim() !== '') {
                    userPromptContent += ` 其MBTI人格类型是 ${mbti.trim()}。`;
                }
                if (gender && gender.trim() !== '') {
                    userPromptContent += ` 性别是 ${gender.trim()}。`;
                }

                const volcEngineRequestBody = JSON.stringify({
                    model: MODEL_NAME,
                    messages: [
                        { role: "system", content: systemPromptContent },
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

                let hasResponded = false;

                const volcRequest = https.request(options, (volcRes) => {
                    let volcData = '';
                    volcRes.setEncoding('utf8');
                    volcRes.on('data', (chunk) => {
                        volcData += chunk;
                    });
                    volcRes.on('end', () => {
                        if (hasResponded) return;
                        hasResponded = true;

                        if (volcRes.statusCode >= 200 && volcRes.statusCode < 300) {
                            try {
                                const parsedResponse = JSON.parse(volcData);
                                if (parsedResponse.choices && parsedResponse.choices.length > 0 && 
                                    parsedResponse.choices[0].message && parsedResponse.choices[0].message.content) {
                                    let namesContent = parsedResponse.choices[0].message.content;
                                    namesContent = namesContent.replace(/^```json\s*|```\s*$/g, '').trim();
                                    
                                    try {
                                        const namesArray = JSON.parse(namesContent);
                                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                                        res.end(JSON.stringify(namesArray));
                                    } catch (parseError) {
                                        console.error('Error parsing AI response content JSON:', parseError);
                                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                                        res.end(JSON.stringify({ 
                                            error: 'AI response content is not valid JSON.',
                                            details: namesContent 
                                        }));
                                    }
                                } else {
                                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                                    res.end(JSON.stringify({ 
                                        error: 'Unexpected AI response structure.',
                                        details: volcData 
                                    }));
                                }
                            } catch (e) {
                                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                                res.end(JSON.stringify({ 
                                    error: 'Error processing AI response structure.',
                                    details: volcData 
                                }));
                            }
                        } else {
                            res.writeHead(volcRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({ 
                                error: `AI service error: ${volcRes.statusCode}`,
                                details: volcData 
                            }));
                        }
                    });
                });

                volcRequest.on('error', (e) => {
                    if (hasResponded) return;
                    hasResponded = true;

                    console.error('Error calling VolcEngine API:', e.message);
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ 
                        error: 'Failed to call AI service.',
                        details: e.message 
                    }));
                });

                volcRequest.on('timeout', () => {
                    if (hasResponded) return;
                    hasResponded = true;

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