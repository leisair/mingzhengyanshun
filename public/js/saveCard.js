// 保存卡片为图片的功能
async function saveCardAsImage(cardElement) {
    try {
        // 创建一个新的div来包含卡片，以便更好地控制截图区域
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '400px'; // 固定宽度以确保图片质量
        
        // 克隆卡片并移除下载按钮
        const cardClone = cardElement.cloneNode(true);
        const downloadBtn = cardClone.querySelector('.save-card-btn');
        if (downloadBtn) {
            downloadBtn.remove();
        }
        
        container.appendChild(cardClone);
        document.body.appendChild(container);

        // 使用html2canvas生成图片
        const canvas = await html2canvas(cardClone, {
            scale: 2, // 提高图片质量
            backgroundColor: '#fff9f0',
            logging: false,
        });

        // 获取中文名作为文件名
        const chineseName = cardClone.querySelector('h3').textContent || '中文名';
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `${chineseName}-名片.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // 清理临时元素
        document.body.removeChild(container);
    } catch (error) {
        console.error('保存图片时出错:', error);
        alert('保存图片时出错，请稍后重试。');
    }
}

// 为卡片添加保存按钮
function addSaveButtonToCard(cardElement) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-card-btn absolute top-2 right-2 bg-[#c0392b] text-white p-2 rounded-full hover:bg-[#a5281b] active:bg-[#801f13] transition-colors duration-150 opacity-0 group-hover:opacity-100';
    saveBtn.innerHTML = '<i class="fas fa-download"></i>';
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveCardAsImage(cardElement);
    });
    cardElement.classList.add('group');
    cardElement.classList.add('relative');
    cardElement.appendChild(saveBtn);
}

// 导出函数供其他模块使用
window.addSaveButtonToCard = addSaveButtonToCard; 