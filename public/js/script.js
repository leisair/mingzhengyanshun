document.addEventListener('DOMContentLoaded', () => {
    const englishNameInput = document.getElementById('english-name');
    const generateBtn = document.getElementById('generate-btn');
    const resultsSection = document.getElementById('results-section');
    const nameCardTemplate = document.getElementById('name-card-template');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const errorTextSpan = document.getElementById('error-text');
    const mbtiInput = document.getElementById('mbti-type');
    const genderSelect = document.getElementById('gender');

    generateBtn.addEventListener('click', async () => {
        const englishName = englishNameInput.value.trim();
        const mbti = mbtiInput.value.trim();
        const gender = genderSelect.value;

        if (!englishName) {
            showError('请输入您的英文名 (Please enter your English name).');
            englishNameInput.focus();
            return;
        }

        resultsSection.innerHTML = '';
        hideError();
        showLoading(true);

        try {
            const response = await fetch('/api/generate-name', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ englishName, mbti, gender })
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
            
            if (meaningParagraphs.length >= 6) {
                meaningParagraphs[1].textContent = nameData.chineseMeaning || '暂无中文释义。';
                meaningParagraphs[3].textContent = nameData.englishMeaning || 'No English explanation available.';
                meaningParagraphs[5].textContent = nameData.fengShuiMeaning || '暂无玄学解析。';
            } else {
                console.error("Card template structure doesn't match expected for meanings.");
                meaningParagraphs[1].textContent = nameData.chineseMeaning || '暂无中文释义。';
                if (meaningParagraphs.length >=4) meaningParagraphs[3].textContent = nameData.englishMeaning || 'No English explanation available.';
            }

            const imgElement = cardArticle.querySelector('img');
            if(imgElement) imgElement.classList.add('hidden');

            // 添加保存按钮功能
            window.addSaveButtonToCard(cardArticle);

            resultsSection.appendChild(cardClone);
        });
    }
    
    englishNameInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            generateBtn.click();
        }
    });
}); 