# File: app/views/main.py (Phoenix Edition)
from flask import Blueprint, render_template, jsonify, request, Response
import requests
from app.services.google_sheets_service import get_vocabulary_from_sheet
from app.services.image_service import get_image_for_word

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/api/vocabulary')
def get_vocabulary():
    sheet_url = request.args.get('url')
    if not sheet_url:
        return jsonify({"error": "缺少 'url' 参数"}), 400
    try:
        vocabulary_data = get_vocabulary_from_sheet(sheet_url)
        # 动态地为每个单词分配一个基于其在表格中位置的唯一ID
        for i, word in enumerate(vocabulary_data):
            word['id'] = i
        return jsonify(vocabulary_data)
    except Exception as e:
        # 确保将异常转换为字符串
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/image')
def get_image():
    word = request.args.get('query')
    if not word: return jsonify({"error": "缺少 'query' 参数"}), 400
    image_url = get_image_for_word(word)
    return jsonify({"url": image_url})

@main_bp.route('/api/tts/<path:text>')
def text_to_speech(text: str):
    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q={requests.utils.quote(text)}&tl=de"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        r = requests.get(tts_url, headers=headers, stream=True, timeout=10)
        r.raise_for_status()
        return Response(r.iter_content(chunk_size=1024), content_type=r.headers['Content-Type'])
    except requests.exceptions.RequestException:
        return Response("TTS service error", status=500)