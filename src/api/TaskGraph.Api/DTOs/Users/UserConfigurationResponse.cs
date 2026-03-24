namespace TaskGraph.Api.DTOs.Users;

public record UserConfigurationResponse(
    string DefaultTasksView,
    string TimeAxisDirection,
    string TimeAxisPosition,
    int AutoSaveDelaySeconds,
    bool ShowMiniMap
);
