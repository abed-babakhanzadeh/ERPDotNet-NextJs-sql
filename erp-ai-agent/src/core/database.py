import os
import pyodbc
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class DatabaseManager:
    def __init__(self):
        self.server = os.getenv("DB_HOST", "localhost")
        self.database = os.getenv("DB_NAME", "ERPDotNetDB")
        self.username = os.getenv("DB_USER", "sa")
        self.password = os.getenv("DB_PASSWORD", "your_password")
        
        # کانکشن استرینگ استاندارد
        self.conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={self.server};"
            f"DATABASE={self.database};"
            f"UID={self.username};"
            f"PWD={self.password}"
        )

    def get_connection(self):
        return pyodbc.connect(self.conn_str)

    def execute_read(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """اجرای کوئری‌های خواندنی و بازگرداندن نتیجه به صورت دیکشنری"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if cursor.description is None:
                return []
                
            columns = [column[0] for column in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            print(f"Error executing query: {e}")
            return []
        finally:
            conn.close()

db_manager = DatabaseManager()