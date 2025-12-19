# ERPDotNet/Dockerfile

# مرحله بیلد
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# کپی کردن فایل‌های پروژه برای Restore کردن پکیج‌ها
# با توجه به ساختار درختی شما، مسیرها را دقیق نوشتم
COPY ["ERPDotNet.API/ERPDotNet.API.csproj", "ERPDotNet.API/"]
COPY ["ERPDotNet.Application/ERPDotNet.Application.csproj", "ERPDotNet.Application/"]
COPY ["ERPDotNet.Domain/ERPDotNet.Domain.csproj", "ERPDotNet.Domain/"]
COPY ["ERPDotNet.Infrastructure/ERPDotNet.Infrastructure.csproj", "ERPDotNet.Infrastructure/"]

# دانلود پکیج‌ها (Restore)
RUN dotnet restore "ERPDotNet.API/ERPDotNet.API.csproj"

# کپی کردن کل سورس کد
COPY . .

# بیلد نهایی
WORKDIR "/src/ERPDotNet.API"
RUN dotnet build "ERPDotNet.API.csproj" -c Release -o /app/build

# پابلیش کردن پروژه
FROM build AS publish
RUN dotnet publish "ERPDotNet.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# مرحله نهایی (Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ERPDotNet.API.dll"]