import os
import json
import re
from openai import OpenAI
# فقط ابزارها را ایمپورت کن، نه خودت را!
from src.modules.base_info.tools import tool_search_products
from src.modules.product_engineering.tools import tool_get_bom
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url=os.getenv("OPENAI_API_BASE"),
    api_key=os.getenv("OPENAI_API_KEY"),
)

MODEL_NAME = os.getenv("AI_MODEL", "llama3.1")

# تعریف ابزارها
tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "جستجوی کالا. اگر کاربر لیست همه را خواست، مقدار query_text را خالی بگذار.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query_text": {"type": "string", "description": "نام کالا یا بخشی از آن (خالی برای همه)"}
                },
                "required": ["query_text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_bom",
            "description": "دریافت فرمول ساخت (BOM) فقط با داشتن کد دقیق کالا.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_code": {"type": "string", "description": "کد دقیق کالا"}
                },
                "required": ["product_code"]
            }
        }
    }
]

available_functions = {
    "search_products": tool_search_products,
    "get_bom": tool_get_bom
}

def run_agent(user_message: str):
    system_prompt = """
    تو دستیار سیستم ERP پولاسا هستی.
    قوانین مهم:
    1. فقط و فقط از ابزارهای تعریف شده (search_products, get_bom) استفاده کن.
    2. هرگز ابزار جدیدی مثل add_product یا delete اختراع نکن.
    3. اگر کاربر چیزی خواست که ابزارش را نداری، بگو "من فعلاً فقط می‌توانم جستجو کنم و فرمول ساخت را ببینم."
    4. پاسخ نهایی را همیشه به فارسی روان بده.
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            tools=tools_schema,
            tool_choice="auto",
        )
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls
        content = response_message.content

        # هندل کردن دستی JSON (برای مدل‌های لوکال)
        if not tool_calls and content and "{" in content and "name" in content:
            try:
                json_match = re.search(r'\{.*"name":.*\}', content, re.DOTALL)
                if json_match:
                    fake_tool_data = json.loads(json_match.group(0))
                    
                    if fake_tool_data.get("name") == "get_product_list":
                        fake_tool_data["name"] = "search_products"

                    class FakeToolCall:
                        def __init__(self, name, args):
                            self.id = "call_fake_" + name
                            self.function = type('obj', (object,), {'name': name, 'arguments': json.dumps(args)})
                    
                    if fake_tool_data.get("name") in available_functions:
                        tool_calls = [FakeToolCall(fake_tool_data["name"], fake_tool_data.get("parameters", {}))]
            except Exception as e:
                print(f"Failed to parse manual JSON: {e}")

        if tool_calls:
            messages.append(response_message)
            
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                try:
                    function_args = json.loads(tool_call.function.arguments)
                except:
                    function_args = {}
                
                if function_name in available_functions:
                    function_to_call = available_functions[function_name]
                    
                    if function_name == "search_products":
                        q = function_args.get("query_text") or function_args.get("name") or ""
                        func_res = function_to_call(query_text=q)
                    elif function_name == "get_bom":
                        code = function_args.get("product_code") or function_args.get("product_no")
                        func_res = function_to_call(product_code=code)
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": function_name,
                        "content": str(func_res),
                    })
            
            second_response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
            )
            return second_response.choices[0].message.content
        
        return content

    except Exception as e:
        print(f"Agent Error: {e}")
        return "متاسفانه در پردازش درخواست مشکلی پیش آمد."