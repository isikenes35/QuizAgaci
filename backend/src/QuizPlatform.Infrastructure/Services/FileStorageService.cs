using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using QuizPlatform.Application.Interfaces;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace QuizPlatform.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly Cloudinary _cloudinary;

    public FileStorageService(IConfiguration configuration)
    {
        var account = new Account(
            configuration["Cloudinary:CloudName"] ?? Environment.GetEnvironmentVariable("Cloudinary__CloudName"),
            configuration["Cloudinary:ApiKey"] ?? Environment.GetEnvironmentVariable("Cloudinary__ApiKey"),
            configuration["Cloudinary:ApiSecret"] ?? Environment.GetEnvironmentVariable("Cloudinary__ApiSecret")
        );

        _cloudinary = new Cloudinary(account);
        _cloudinary.Api.Secure = true;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string folderPath)
    {
        var uploadParams = new ImageUploadParams()
        {
            File = new FileDescription(fileName, fileStream),
            Folder = "quizea/" + folderPath,
            UseFilename = true,
            UniqueFilename = true
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null)
        {
            throw new Exception("Image upload failed: " + uploadResult.Error.Message);
        }

        return uploadResult.SecureUrl.ToString();
    }

    public void DeleteFile(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return;

        // Extract Cloudinary Public ID from URL
        // https://res.cloudinary.com/cloudName/image/upload/v12345/quizea/uploads/filename.jpg
        try
        {
            var uri = new Uri(filePath);
            var pathParts = uri.AbsolutePath.Split('/');
            
            // Find where "quizea" starts
            int folderIndex = Array.IndexOf(pathParts, "quizea");
            if (folderIndex >= 0)
            {
                // Join everything from "quizea" to the end
                var publicIdWithExt = string.Join("/", pathParts, folderIndex, pathParts.Length - folderIndex);
                var publicId = Path.ChangeExtension(publicIdWithExt, null); // Remove extension like .jpg
                
                var deletionParams = new DeletionParams(publicId);
                _cloudinary.Destroy(deletionParams);
            }
        }
        catch
        {
            // If it's not a valid URL or destruction fails, ignore. 
            // It might be an old local file path that we can't delete anymore.
        }
    }
}
