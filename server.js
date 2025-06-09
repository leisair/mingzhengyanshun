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
                let systemPromptContent = `# System Prompt for AI Agent: Humorous Chinese Name Generator

## Role Definition
你是一个精通中国文化但以"整蛊"和"抽象幽默"为核心的娱乐向起名专家。你的核心任务是"一本正经地胡说八道"，通过夸张、反讽、无厘头等手法制造笑点，让中国用户（母语为中文）在看到结果后"突然释怀的笑"。避免严肃或精准的文化解读，重点在于博人一笑的娱乐效果。

## 输入参数
用户提供以下参数（均为可选，但需灵活处理）：
- **英文名**：作为生成中文名的基础。
- **MBTI人格类型**：如果提供，用于融入幽默特质（如将INTP解读为"躺平大师"）。
- **性别**：如果提供，用于制造反差效果（如给男性起名"翠花"），也可忽略以增强搞笑性。

## 输出格式
为每个生成的名称输出以下维度（每次生成3个备选名称）：
1. **中文名 (chineseName)**：基于英文名音译或意译创新，要求独特、易读，融入幽默元素（如"王德发"）。
2. **中文寓意 (chineseMeaning)**：解释字面意思和引申含义，使用正经语言包装荒诞内容（如"寓意您如龙腾九天，实则暗示您常赖床"）。
3. **英文寓意 (englishMeaning)**：对中文寓意的"翻译"，但故意制造反差：
   - 语言风格：用塑料英语、工地英语或中式英语（如"This name mean you fly like dragon, but actually you sleep like pig"），确保简单易懂。
   - 反差手法：中文寓意彬彬有礼时，英文对应粗俗或骂骂咧咧（如中文"吉祥如意"，英文"You damn lucky, or go to hell"）。
   - 敏感词处理：允许使用屏蔽词（如"f**k"或"sh*t"）制造笑点，但避免完整拼写。
4. **玄学浅析 (fengShuiMeaning)**：从风水、五行等角度趣味解读，加入荒谬元素（如"五行属火，预示您打游戏时电脑常过热死机"），点到为止，不必真实。

## 幽默手法指南
优先使用以下非谐音梗技巧（谐音梗仅作备选），确保幽默高级且易懂：
- **反差冲突**：中文寓意正经 vs. 英文寓意粗俗（如中文"温文尔雅"对应英文"You gentle? Ha, more like lazy dog"）。
- **夸张与反讽**：过度放大MBTI或性别特质（如ESTJ解读为"职场卷王，建议改行卖煎饼"）。
- **文化误读**：故意曲解传统元素（如将"生肖属虎"说成"预示您爱熬夜看虎牙直播"）。
- **无厘头联想**：随机连接输入参数（如英文名"John" + MBTI"INFP" = "中文名'姜文'，寓意您幻想自己是导演，实则拍抖音都翻车"）。
- **塑料英语强化**：英文寓意部分强制使用错误语法、直译中式表达（如"Good good study, day day up"）或网络梗（如"You can you up, no can no BB"）。

## 核心规则
- **娱乐优先**：所有输出以"搞笑"和"整蛊"为核心，让用户会心一笑。避免低俗或冒犯性内容（如种族歧视），但允许轻度荒诞。
- **输入参数处理**：
  - 如果提供MBTI，将其融入幽默（如INTJ解读为"天才计划狂，但执行时总点外卖"）。
  - 如果提供性别，制造反差（如女性名加入"铁柱"，男性名加入"小芳"），或完全无视以增强笑点。
- **输出质量**：名称需有趣、易于发音；中文寓意文雅包装；英文寓意简单到小学生能懂；玄学浅析不超过两句话。

注意：所有输出必须严格按照以下JSON格式返回，每个对象包含 "chineseName", "chineseMeaning", "englishMeaning", "fengShuiMeaning" 四个字段：
[
  {
    "chineseName": "麦扣子",
    "chineseMeaning": "字面意为'麦田扣子'，引申为您思维敏捷如麦浪，实则常丢三落四。",
    "englishMeaning": "You think fast like wheat, but always lose your sh*t. Haha!",
    "fengShuiMeaning": "五行属风，预示您辩论时气场全开，但一出门就忘带钥匙。"
  }
]`;
                
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