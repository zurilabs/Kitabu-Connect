/**
 * Performance Monitor Utility
 *
 * Track seeding performance metrics
 */

interface PhaseMetrics {
  name: string;
  duration: number;
  recordsCreated: number;
  recordsPerSecond: number;
}

export class PerformanceMonitor {
  private phases: PhaseMetrics[] = [];
  private currentPhase: {
    name: string;
    startTime: number;
    startMemory: number;
  } | null = null;

  startPhase(name: string): void {
    this.currentPhase = {
      name,
      startTime: Date.now(),
      startMemory: process.memoryUsage().heapUsed,
    };
  }

  endPhase(recordsCreated: number): void {
    if (!this.currentPhase) return;

    const duration = (Date.now() - this.currentPhase.startTime) / 1000;
    const recordsPerSecond = Math.round(recordsCreated / duration);

    this.phases.push({
      name: this.currentPhase.name,
      duration,
      recordsCreated,
      recordsPerSecond,
    });

    this.currentPhase = null;
  }

  getMetrics(): PhaseMetrics[] {
    return this.phases;
  }

  getTotalRecords(): number {
    return this.phases.reduce((sum, phase) => sum + phase.recordsCreated, 0);
  }

  getTotalDuration(): number {
    return this.phases.reduce((sum, phase) => sum + phase.duration, 0);
  }

  getMemoryUsage(): { used: string; total: string; percentage: number } {
    const usage = process.memoryUsage();
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const percentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);

    return {
      used: `${usedMB} MB`,
      total: `${totalMB} MB`,
      percentage,
    };
  }

  printSummary(): void {
    console.log('\n📊 Performance Summary:');
    console.log('─'.repeat(70));

    this.phases.forEach((phase) => {
      console.log(
        `  ${phase.name.padEnd(40)} ${phase.duration.toFixed(1)}s | ${phase.recordsCreated} records | ${phase.recordsPerSecond} rec/s`
      );
    });

    console.log('─'.repeat(70));
    console.log(`  ${'TOTAL'.padEnd(40)} ${this.getTotalDuration().toFixed(1)}s | ${this.getTotalRecords()} records`);

    const memory = this.getMemoryUsage();
    console.log(`\n💾 Memory Usage: ${memory.used} / ${memory.total} (${memory.percentage}%)`);
  }
}

export const perfMonitor = new PerformanceMonitor();
