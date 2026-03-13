FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY TaskGraph.sln ./
COPY TaskGraph.Api/TaskGraph.Api.csproj TaskGraph.Api/
COPY TaskGraph.Tests/TaskGraph.Tests.csproj TaskGraph.Tests/
RUN dotnet restore
COPY . .
RUN dotnet publish TaskGraph.Api/TaskGraph.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "TaskGraph.Api.dll"]
