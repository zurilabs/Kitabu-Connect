/**
 * Progress Logger Utility
 *
 * Beautiful console output for stress test progress
 */

export class ProgressLogger {
  private startTime: number = 0;
  private phaseStartTime: number = 0;

  start(title: string): void {
    this.startTime = Date.now();
    console.log('\n' + '═'.repeat(70));
    console.log(`🧪 ${title}`);
    console.log('═'.repeat(70));
  }

  startPhase(phaseNumber: number, totalPhases: number, title: string): void {
    this.phaseStartTime = Date.now();
    console.log(`\n[${'PHASE ' + phaseNumber}/${totalPhases}] ${title}...`);
  }

  logProgress(message: string, count?: number): void {
    const prefix = count !== undefined ? `  ✓ ${message}: ${count}` : `  ✓ ${message}`;
    console.log(prefix);
  }

  logWarning(message: string): void {
    console.log(`  ⚠️  ${message}`);
  }

  logError(message: string): void {
    console.log(`  ❌ ${message}`);
  }

  endPhase(additionalInfo?: string): void {
    const duration = ((Date.now() - this.phaseStartTime) / 1000).toFixed(1);
    console.log(`  ⏱️  Duration: ${duration}s${additionalInfo ? ' - ' + additionalInfo : ''}`);
  }

  complete(summary: Record<string, any>): void {
    console.log('\n' + '═'.repeat(70));
    console.log('✅ STRESS TEST SEEDING COMPLETED');
    console.log('═'.repeat(70));
    console.log('\nSummary Statistics:');

    Object.entries(summary).forEach(([key, value]) => {
      console.log(`  ${this.getIcon(key)} ${key}: ${value}`);
    });

    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log('\nPerformance Metrics:');
    console.log(`  ⏱️  Total Duration: ${totalDuration} seconds`);

    console.log('\n' + '═'.repeat(70));
  }

  private getIcon(key: string): string {
    const iconMap: Record<string, string> = {
      'Users Created': '📊',
      'Book Listings': '📚',
      'Schools Used': '🏫',
      'Historical Cycles': '🔄',
      'Badges Awarded': '🏆',
      'Disputes Created': '⚖️',
      'Condition Reports': '📝',
      'Total Records': '💾',
    };
    return iconMap[key] || '📌';
  }

  logConfig(config: Record<string, any>): void {
    console.log('\nConfiguration:');
    Object.entries(config).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    console.log('\n' + '═'.repeat(70));
  }
}

export const logger = new ProgressLogger();
