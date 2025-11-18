using Microsoft.EntityFrameworkCore;
using System;

namespace Jellyfile.Server.Infrastructure
{
    public class PinCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public PinCleanupService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();

                await db.FilePins
                    .Where(p => p.ExpiresAt < DateTime.UtcNow)
                    .ExecuteDeleteAsync(stoppingToken);

                await Task.Delay(TimeSpan.FromDays(7), stoppingToken);
            }
        }
    }
}
