# app/models.py (完整代码)
from app import db

class Vocabulary(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    german = db.Column(db.String(200), unique=True, nullable=False)
    chinese = db.Column(db.String(200), nullable=False)
    example = db.Column(db.String(500))
    mastery_level = db.Column(db.Integer, default=0, nullable=False) # <-- 新增字段

    def to_dict(self):
        return {
            'id': self.id,
            'german': self.german,
            'chinese': self.chinese,
            'example': self.example,
            'mastery_level': self.mastery_level
        }