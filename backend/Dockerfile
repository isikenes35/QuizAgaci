# 1. Kısım: Projeyi Derlemek İçin .NET 8 SDK 
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Sadece proje (.csproj) ve çözüm (.sln) dosyalarını önceden kopyalayarak hız kazandır
COPY QuizPlatform.sln ./
COPY src/QuizPlatform.API/QuizPlatform.API.csproj src/QuizPlatform.API/
COPY src/QuizPlatform.Application/QuizPlatform.Application.csproj src/QuizPlatform.Application/
COPY src/QuizPlatform.Domain/QuizPlatform.Domain.csproj src/QuizPlatform.Domain/
COPY src/QuizPlatform.Infrastructure/QuizPlatform.Infrastructure.csproj src/QuizPlatform.Infrastructure/

# Gerekli paketleri (Nuget) indir
RUN dotnet restore

# Şimdi tüm kodları kopyala ve projeyi yayımlamaya (publish) hazırla
COPY . ./
RUN dotnet publish src/QuizPlatform.API/QuizPlatform.API.csproj -c Release -o /app/out

# 2. Kısım: Yalnızca Çalıştırmak İçin İnce .NET 8 Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

# Railway'in atayacağı portu kullanabilmek için ortam değişkeni ayarla
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Uygulamayı başlat
ENTRYPOINT ["dotnet", "QuizPlatform.API.dll"]