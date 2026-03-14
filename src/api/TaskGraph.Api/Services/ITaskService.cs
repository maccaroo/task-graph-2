using TaskGraph.Api.DTOs.Tasks;
using TaskGraph.Api.Models;

namespace TaskGraph.Api.Services;

public interface ITaskService
{
    Task<IEnumerable<TaskResponse>> GetAllAsync(TaskFilter filter);
    Task<TaskResponse> GetByIdAsync(Guid id);
    Task<TaskResponse> CreateAsync(CreateTaskRequest request);
    Task<TaskResponse> UpdateAsync(Guid id, UpdateTaskRequest request);
    Task DeleteAsync(Guid id);
    Task<TaskResponse> UpdatePositionAsync(Guid id, UpdateTaskPositionRequest request);
    Task<TaskResponse> AddPredecessorAsync(Guid taskId, Guid predecessorId, RelationshipType relationshipType);
    Task DeletePredecessorAsync(Guid taskId, Guid predecessorId);
}
