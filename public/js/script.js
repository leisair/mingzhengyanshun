document.addEventListener('DOMContentLoaded', () => {
    const englishNameInput = document.getElementById('english-name');
    const generateBtn = document.getElementById('generate-btn');
    const resultsSection = document.getElementById('results-section');
    const nameCardTemplate = document.getElementById('name-card-template');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const errorTextSpan = document.getElementById('error-text');
    // New input fields
    const mbtiInput = document.getElementById('mbti-type');
    const genderSelect = document.getElementById('gender');

    // Define some Unsplash placeholder image keywords related to Chinese culture / good fortune
    // These are just ideas; actual image fetching logic is not implemented here
    const imageKeywords = [
        'chinese dragon pixel art', 'chinese lantern pixel art', 'panda pixel art', 
        'bamboo forest pixel art', 'great wall pixel art', 'temple pixel art', 
        'lucky charm pixel art', 'koi fish pixel art', 'chinese calligraphy pixel art'
    ];

    generateBtn.addEventListener('click', async () => {
        const englishName = englishNameInput.value.trim();
        const mbti = mbtiInput.value.trim(); // Get MBTI value
        const gender = genderSelect.value; // Get Gender value

        if (!englishName) {
            showError('请输入您的英文名 (Please enter your English name).');
            englishNameInput.focus();
            return;
        }

        // Clear previous results and errors
        resultsSection.innerHTML = '';
        hideError();
        showLoading(true);

        try {
            const response = await fetch('/api/generate-name', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ englishName, mbti, gender }) // Send mbti and gender
            });

            showLoading(false);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to process the request on the server.' , details: `Status: ${response.status}`}));
                let errMsg = errorData.error || '起名失败，请稍后再试。';
                if(errorData.details && typeof errorData.details === 'string') errMsg += ` (${errorData.details})`;
                if(response.status === 504) errMsg = "请求超时，AI可能正在思考宇宙的奥秘，请稍后再试！";
                if(response.status === 500 && errorData.details && errorData.details.includes("not valid JSON")) errMsg = "AI返回的内容有点奇怪，我们正在努力解读！请稍后再试。";
                showError(errMsg);
                console.error('Server error:', errorData);
                return;
            }

            const names = await response.json();

            if (names && names.length > 0) {
                displayNames(names);
            } else {
                showError('未能生成中文名，AI可能今天没灵感，换个名字试试？');
            }

        } catch (err) {
            showLoading(false);
            showError('发生网络错误或无法连接到服务器，请检查您的网络连接。');
            console.error('Fetch error:', err);
        }
    });

    function showLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.classList.remove('hidden');
            generateBtn.disabled = true;
            generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            loadingIndicator.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    function showError(message) {
        errorTextSpan.textContent = message;
        errorMessageDiv.classList.remove('hidden');
    }

    function hideError() {
        errorMessageDiv.classList.add('hidden');
        errorTextSpan.textContent = '';
    }

    function displayNames(names) {
        names.forEach((nameData, index) => {
            const cardClone = nameCardTemplate.content.cloneNode(true);
            const cardArticle = cardClone.querySelector('article');
            
            cardArticle.querySelector('h3').textContent = nameData.chineseName || '（无名氏）';
            const meaningParagraphs = cardArticle.querySelectorAll('p');
            // p[0] is label for Chinese Meaning, p[1] is its value
            // p[2] is label for English Meaning, p[3] is its value
            // p[4] is label for FengShui Meaning, p[5] is its value
            if (meaningParagraphs.length >= 6) {
                 meaningParagraphs[1].textContent = nameData.chineseMeaning || '暂无中文释义。';
                 meaningParagraphs[3].textContent = nameData.englishMeaning || 'No English explanation available.';
                 meaningParagraphs[5].textContent = nameData.fengShuiMeaning || '暂无玄学解析。'; // Populate FengShui meaning
            } else {
                // Fallback or error if template structure is not as expected
                console.error("Card template structure doesn't match expected for meanings.");
                 meaningParagraphs[1].textContent = nameData.chineseMeaning || '暂无中文释义。';
                 if (meaningParagraphs.length >=4) meaningParagraphs[3].textContent = nameData.englishMeaning || 'No English explanation available.';
            }

            const imgElement = cardArticle.querySelector('img');
            // Simple Unsplash URL based on keywords for visual flair - using Unsplash Source for random images
            // This is a placeholder. For production, you'd ideally fetch curated images or use a backend service for Unsplash API.
            const randomKeyword = imageKeywords[index % imageKeywords.length]; // Cycle through keywords
            // Using a placeholder image service that provides pixel art style images, if available, would be better.
            // For now, using Unsplash source with relevant keywords. Actual pixel art might not be guaranteed.
            // Example: imgElement.src = `https://source.unsplash.com/300x200/?${randomKeyword.replace(/ /g, ',')}`;
            // Since finding good pixel art on Unsplash is hard, and to avoid external calls without API key, we'll use a local placeholder or keep it hidden.
            // For simplicity, using a generic local placeholder path. Ensure you have an image there or keep it hidden.
            // imgElement.src = `/public/img/placeholder-${(index % 3) + 1}.png`; // e.g. placeholder-1.png, placeholder-2.png
            // imgElement.alt = `Illustration for ${nameData.chineseName}`;
            // imgElement.classList.remove('hidden'); // Show the image if you have placeholders
            
            // For now, keep image hidden as per original plan if no specific images are provided.
            // If you have images, uncomment the lines above and ensure the image paths are correct.
             if(imgElement) imgElement.classList.add('hidden'); // Keep hidden for now

            resultsSection.appendChild(cardClone);
        });
    }
    
    // Optional: Allow Enter key to trigger generation from input field
    englishNameInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if it were inside a form
            generateBtn.click();
        }
    });
}); 