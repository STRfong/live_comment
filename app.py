from flask import Flask, render_template, request, jsonify, Response
import queue
import time

app = Flask(__name__)

# 創建一個消息隊列
message_queue = queue.Queue()

@app.route('/')
def index():
    """渲染主頁"""
    return render_template('index.html')

@app.route('/overlay', methods=['POST'])
def overlay_text():
    """接收外部 POST 請求"""
    text = request.json.get('text', '')
    # 將消息放入隊列
    forbidden_phrases = ["去死", "醜八怪", "好醜", "幹你娘", "http"]
    if any(phrase in text for phrase in forbidden_phrases):
        return jsonify({'status': 'error', 'message': '輸入的文字包含禁用詞！'}), 200
    if len(text) > 20:
        return jsonify({'status': 'error', 'message': '輸入的文字太長了！'}), 200
    
    message_queue.put(text)
    return jsonify({'status': 'success', 'text': text})

@app.route('/stream')
def stream():
    """SSE 事件流"""
    def generate():
        while True:
            try:
                # 非阻塞式獲取消息
                message = message_queue.get_nowait()
                yield f"data: {message}\n\n"
            except queue.Empty:
                # 如果隊列為空，等待一下
                time.sleep(0.1)
            
    return Response(generate(), mimetype='text/event-stream')

@app.route('/sender')
def sender():
    return render_template('sender.html')

if __name__ == '__main__':
    app.run(debug=True)