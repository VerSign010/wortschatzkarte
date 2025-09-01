# File: app/services/image_service.py (Phoenix Edition)
import os
import requests
from typing import Optional, Dict, Any
import re

PEXELS_API_URL = "https://api.pexels.com/v1/search"
_cache: Dict[str, Any] = {}

def _optimize_query(phrase: str) -> str:
    words = re.findall(r'\b\w+\b', phrase)
    capitalized_nouns = [w for w in words if len(w) > 2 and w[0].isupper() and w.lower() not in ['die', 'der', 'das']]
    if capitalized_nouns: return max(capitalized_nouns, key=len)
    
    stopwords = {'der', 'die', 'das', 'ein', 'eine', 'einen', 'zu', 'auf', 'in', 'an', 'sich', 'jemanden'}
    meaningful_words = [w for w in words if w.lower() not in stopwords]
    if meaningful_words: return max(meaningful_words, key=len)
        
    return words[0] if words else ""

def get_image_for_word(word: str) -> Optional[str]:
    if not word: return None
    optimized_word = _optimize_query(word)
    if not optimized_word: return None
    if optimized_word in _cache: return _cache[optimized_word]
    
    api_key = os.getenv("PEXELS_API_KEY")
    if not api_key or api_key == "YOUR_PEXELS_API_KEY_HERE": return None
        
    headers = {"Authorization": api_key}
    params = {"query": optimized_word, "per_page": 1, "locale": "de-DE"}
    try:
        response = requests.get(PEXELS_API_URL, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data.get("photos"):
            image_url = data["photos"][0]["src"]["large"]
            _cache[optimized_word] = image_url
            return image_url
        _cache[optimized_word] = None
        return None
    except requests.exceptions.RequestException:
        return None