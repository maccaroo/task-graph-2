using Microsoft.EntityFrameworkCore;

namespace TaskGraph.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
}
