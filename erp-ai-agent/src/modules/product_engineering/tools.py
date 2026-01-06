from src.core.database import db_manager

def tool_get_bom(product_code: str):
    """
    Get BOM using schemas: [base].[products], [eng].[bom_headers], [eng].[bom_details]
    """
    # 1. پیدا کردن ID محصول
    prod_sql = "SELECT [Id] FROM [base].[products] WHERE [Code] = ?"
    products = db_manager.execute_read(prod_sql, (product_code,))
    
    if not products:
        return f"محصولی با کد {product_code} یافت نشد."
        
    prod_id = products[0]['Id']
    
    # 2. پیدا کردن فرمول ساخت
    # فرض بر این است که ستون تعداد Quantity نام دارد، اگر خطا داد Value را تست کنید
    bom_sql = """
    SELECT p.[Name] as MaterialName, d.[Quantity] as Quantity
    FROM [eng].[bom_details] d
    JOIN [base].[products] p ON d.[ProductId] = p.[Id]
    WHERE d.[BOMHeaderId] IN (
        SELECT TOP 1 [Id] 
        FROM [eng].[bom_headers] 
        WHERE [ProductId] = ? AND [IsActive] = 1
    )
    """
    try:
        results = db_manager.execute_read(bom_sql, (prod_id,))
    except Exception:
        # اگر ستون Quantity نبود، با Value امتحان کن
        bom_sql = bom_sql.replace("d.[Quantity]", "d.[Value]")
        results = db_manager.execute_read(bom_sql, (prod_id,))
    
    if not results:
        return "برای این محصول فرمول ساخت فعالی ثبت نشده است."
        
    return str(results)