document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素獲取
    const videoContainer = document.getElementById('video-container');
    const video = document.getElementById('video');
    const overlayText1 = document.getElementById('overlay-text-1');
    const overlayText2 = document.getElementById('overlay-text-2');
    const overlayText3 = document.getElementById('overlay-text-3');
    const overlay = [overlayText1, overlayText2, overlayText3];
 
    // 等待隊列
    const messageQueue = [];
 
    // 建立 SSE 連接
    const eventSource = new EventSource('/stream');
    
    // 監聽消息
    eventSource.onmessage = function(event) {
        const text = event.data;
        
        // 檢查所有軌道狀態
        const availableTracks = overlay.filter(track => {
            const texts = Array.from(track.children);
            if (texts.length === 0) return true;
 
            // 獲取軌道上最右側的文字元素
            const rightmostText = texts.reduce((rightmost, current) => {
                const currentRect = current.getBoundingClientRect();
                const rightmostRect = rightmost.getBoundingClientRect();
                return currentRect.right > rightmostRect.right ? current : rightmost;
            });
 
            // 計算最右側文字與父元素右邊界的距離
            const trackRect = track.getBoundingClientRect();
            const textRect = rightmostText.getBoundingClientRect();
            const distance = trackRect.right - textRect.right;
 
            // 如果距離大於父元素寬度的 5%，則可以放置新文字
            return distance > trackRect.width * 0.05;
        });
 
        if (availableTracks.length > 0) {
            // 有可用軌道時，顯示文字
            displayText(text, availableTracks);
        } else {
            // 沒有可用軌道時，加入等待隊列
            messageQueue.push(text);
        }
    };
 
    // 處理錯誤
    eventSource.onerror = function(error) {
        console.error('SSE Error:', error);
        eventSource.close();
    };
 
    // 顯示文字的函數
    function displayText(text, availableTracks) {
        const textElement = document.createElement('div');
        textElement.textContent = text;
        textElement.classList.add('comment');
 
        // 隨機選擇一個可用軌道
        const randomIndex = Math.floor(Math.random() * availableTracks.length);
        const selectedTrack = availableTracks[randomIndex];
 
        // 添加到軌道
        selectedTrack.appendChild(textElement);
 
        // 計算移動距離
        const containerWidth = selectedTrack.offsetWidth;
        const textWidth = textElement.offsetWidth;
        const moveDistance = -(containerWidth + textWidth);
        
        // 設置動畫
        textElement.style.setProperty('--move-distance', `${moveDistance}px`);
        textElement.style.animation = 'slideLeft 10s linear';
 
        // 監聽動畫結束
        textElement.addEventListener('animationend', () => {
            selectedTrack.removeChild(textElement);
            // 當移除一個文字後，檢查隊列
            if (messageQueue.length > 0) {
                const nextText = messageQueue.shift();
                // 遞迴調用，檢查並顯示下一個文字
                eventSource.onmessage({data: nextText});
            }
        });
    }

    function sendText(text) {
        fetch('/overlay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                overlayText.textContent = data.text;
                overlayText.classList.add('show');

                // 4秒後移除文字（2秒滑入 + 2秒停留）
                setTimeout(() => {
                    overlayText.classList.remove('show');
                }, 4000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // // 測試用：每5秒發送一個範例文字
    // const messages = ['笑死', '下地獄', '中文世界最強的喜劇公司！', '水啦！', '哈哈哈哈哈哈哈哈哈哈', '弟弟馬薩G', '政治正確殺不死喜劇！', 'XDDDDD', '小心側翼攻擊！'];
    // setInterval(() => {
    //     const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    //     sendText(randomMessage);
    // }, 500);
 });