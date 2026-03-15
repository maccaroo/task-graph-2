using Microsoft.AspNetCore.Mvc;
using TaskGraph.Api.DTOs.Tasks;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Models;
using TaskGraph.Api.Services;

namespace TaskGraph.Api.Controllers;

[ApiController]
[Route("tasks")]
public class TasksController(ITaskService taskService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TaskFilter filter)
    {
        var tasks = await taskService.GetAllAsync(filter);
        return Ok(tasks);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest request)
    {
        try
        {
            var task = await taskService.CreateAsync(request);
            return Ok(task);
        }
        catch (ValidationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var task = await taskService.GetByIdAsync(id);
            return Ok(task);
        }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskRequest request)
    {
        try
        {
            var task = await taskService.UpdateAsync(id, request);
            return Ok(task);
        }
        catch (ValidationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await taskService.DeleteAsync(id);
            return NoContent();
        }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/predecessors/{predecessorId:guid}")]
    public async Task<IActionResult> AddPredecessor(Guid id, Guid predecessorId, [FromBody] AddPredecessorRequest? request)
    {
        try
        {
            var task = await taskService.AddPredecessorAsync(id, predecessorId, request?.RelationshipType ?? RelationshipType.Exclusive);
            return Ok(task);
        }
        catch (ValidationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { error = ex.Message }); }
    }

    [HttpDelete("{id:guid}/predecessors/{predecessorId:guid}")]
    public async Task<IActionResult> DeletePredecessor(Guid id, Guid predecessorId)
    {
        try
        {
            await taskService.DeletePredecessorAsync(id, predecessorId);
            return NoContent();
        }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }
}
