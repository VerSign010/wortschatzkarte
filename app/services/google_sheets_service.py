# File: app/services/google_sheets_service.py (Phoenix Edition)
import gspread
import os
from typing import List, Dict, Any
from datetime import datetime, timedelta

_cache: Dict[str, Any] = {}

def get_vocabulary_from_sheet(sheet_url: str) -> List[Dict[str, str]]:
    global _cache
    cache_key = sheet_url
    if cache_key in _cache and datetime.now() < _cache[cache_key]['expiry']:
        print("Serving vocabulary from cache.")
        return _cache[cache_key]['data']
    
    print("Fetching vocabulary from Google Sheets API...")
    try:
        credentials_file = os.getenv('GOOGLE_SHEET_CREDENTIALS_FILE', 'credentials.json')
        gc = gspread.service_account(filename=credentials_file)
        spreadsheet = gc.open_by_url(sheet_url)
        worksheet = spreadsheet.sheet1
        all_values = worksheet.get_all_values()
        if not all_values or len(all_values) < 2: return []
        
        data_rows = all_values[1:]
        vocabulary_list = []
        for row in data_rows:
            if len(row) >= 3 and row[0]: # Ensure German word is not empty
                vocabulary_list.append({ "german": row[0].strip(), "chinese": row[1].strip(), "example": row[2].strip() })
        
        _cache[cache_key] = {'data': vocabulary_list, 'expiry': datetime.now() + timedelta(minutes=5)}
        return vocabulary_list
    except Exception as e:
        raise Exception(f"获取数据时发生错误: {e}")