import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

# تنظیمات اتصال
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

conn_str = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={DB_HOST};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD}"
)

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("-" * 30)
    print(f"Connected to: {DB_NAME}")
    print("-" * 30)
    
    # کوئری برای لیست کردن تمام جداول و اسکیمای آن‌ها
    cursor.execute("""
        SELECT s.name as schema_name, t.name as table_name 
        FROM sys.tables t
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        ORDER BY s.name, t.name
    """)
    
    rows = cursor.fetchall()
    
    if not rows:
        print("هیچ جدولی در دیتابیس یافت نشد!")
    else:
        print("لیست جداول موجود:")
        for row in rows:
            print(f"[{row.schema_name}].[{row.table_name}]")
            
except Exception as e:
    print("Error connecting:", e)