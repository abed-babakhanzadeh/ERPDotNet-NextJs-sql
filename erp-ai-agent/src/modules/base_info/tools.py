from src.core.database import db_manager

def tool_search_products(query_text: str):
    """
    Search for products using correct schema: [base].[products]
    """
    if not query_text or query_text.strip() == "" or "همه" in query_text:
        sql = "SELECT TOP 10 [Id], [Name], [Code] FROM [base].[products] ORDER BY [Id] DESC"
        results = db_manager.execute_read(sql)
    else:
        sql = """
        SELECT TOP 5 [Id], [Name], [Code]
        FROM [base].[products] 
        WHERE [Name] LIKE ? OR [Code] LIKE ?
        """
        param = f"%{query_text}%"
        results = db_manager.execute_read(sql, (param, param))
        
    if not results:
        return "هیچ محصولی با این مشخصات یافت نشد."
    return str(results)