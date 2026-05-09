from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime

class SessionLog(Base):
    __tablename__ = "session_logs"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, index=True, nullable=True)
    symptoms = Column(Text, nullable=False)
    top_prediction = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
