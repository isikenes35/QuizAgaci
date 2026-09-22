using System.IO;
using System.Threading.Tasks;

namespace QuizPlatform.Application.Interfaces;

public interface IFileStorageService
{
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string folderPath);
    void DeleteFile(string filePath);
}
