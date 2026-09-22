using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using QuizPlatform.Application.Interfaces;

namespace QuizPlatform.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _env;

    public FileStorageService(IWebHostEnvironment env)
    {
        _env = env;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string folderPath)
    {
        var webRoot = _env.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var uploadsFolder = Path.Combine(webRoot, folderPath);
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var uniqueFileName = $"{Guid.NewGuid()}_{fileName}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using var fileStreamDestination = new FileStream(filePath, FileMode.Create);
        await fileStream.CopyToAsync(fileStreamDestination);

        return Path.Combine("/", folderPath, uniqueFileName).Replace("\\", "/");
    }

    public void DeleteFile(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return;

        var webRoot = _env.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        // remove leading slash
        var relativePath = filePath.TrimStart('/');
        var fullPath = Path.Combine(webRoot, relativePath);

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }
}
