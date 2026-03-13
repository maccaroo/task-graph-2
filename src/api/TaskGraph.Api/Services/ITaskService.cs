using TaskGraph.Api.DTOs.Tasks;

namespace TaskGraph.Api.Services;

public interface ITaskService
{
    Task<IEnumerable<TaskResponse>> GetAllAsync(TaskFilter filter);
    Task<TaskResponse> GetByIdAsync(Guid id);
    Task<TaskResponse> CreateAsync(CreateTaskRequest request);
    Task<TaskResponse> UpdateAsync(Guid id, UpdateTaskRequest request);
    Task DeleteAsync(Guid id);
    Task<TaskResponse> UpdatePositionAsync(Guid id, UpdateTaskPositionRequest request);
    Task<TaskResponse> AddPredecessorAsync(Guid taskId, Guid predecessorId);
    Task DeletePredecessorAsync(Guid taskId, Guid predecessorId);
}
