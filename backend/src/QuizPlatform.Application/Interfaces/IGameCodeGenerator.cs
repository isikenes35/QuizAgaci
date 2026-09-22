using System;
using System.Threading.Tasks;

namespace QuizPlatform.Application.Interfaces;

public interface IGameCodeGenerator
{
    Task<string> GenerateUniqueCodeAsync();
}
