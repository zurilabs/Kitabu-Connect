/**
 * Quality Control Data Generator - SCALED DOWN VERSION
 * Optimized for 200 users / ~550 listings
 */

import crypto from "crypto";
import { db } from "../../../../db";
import { bookConditionReports, cycleDisputes, disputeMessages, cycleParticipants } from "../../../schema";
import { and, eq } from "drizzle-orm";
import { STRESS_TEST_CONFIG } from "../config/test-config";
import type { HistoricalCycle } from "./swap-history-generator";

export class QualityDataGenerator {
  private conditionReports: any[] = [];
  private disputes: any[] = [];
  private messages: any[] = [];

  /**
   * STATISTICS METHOD - Required by Orchestrator Line 93
   */
  getStatistics() {
    return {
      conditionReports: this.conditionReports.length,
      disputes: this.disputes.length,
      messages: this.messages.length,
    };
  }

  /**
   * Generate quality control data
   */
  async generateQualityData(completedCycles: HistoricalCycle[]): Promise<void> {
    console.log('  📝 Generating quality control data for scaled down test...');

    if (completedCycles.length === 0) {
      console.log('  ⚠️  No completed cycles found. Skipping quality data generation.');
      return;
    }

    // Reset local arrays to avoid duplicates if called twice
    this.conditionReports = [];
    this.disputes = [];
    this.messages = [];

    // Generate condition reports
    await this.generateConditionReports(completedCycles);

    // Generate disputes (based on poor condition reports)
    await this.generateDisputes();

    // Generate dispute messages
    await this.generateDisputeMessages();

    console.log(`  ✓ Condition reports: ${this.conditionReports.length}`);
    console.log(`  ✓ Disputes: ${this.disputes.length}`);
    console.log(`  ✓ Dispute messages: ${this.messages.length}`);
  }

  private async generateConditionReports(completedCycles: HistoricalCycle[]): Promise<void> {
    const targetReports = Math.min(
      STRESS_TEST_CONFIG.CONDITION_REPORTS, 
      completedCycles.length
    );

    const selectedCycles = completedCycles
      .sort(() => Math.random() - 0.5)
      .slice(0, targetReports);

    for (const cycle of selectedCycles) {
      const user = cycle.participants[0]; 

      const participantRecord = await db
        .select()
        .from(cycleParticipants)
        .where(
          and(
            eq(cycleParticipants.cycleId, cycle.id),
            eq(cycleParticipants.userId, user.id)
          )
        )
        .limit(1);

      if (participantRecord.length === 0) continue;
      
      const participantId = participantRecord[0].id;
      const conditionMatch = Math.random() < 0.8;
      const expectedCondition = this.getRandomCondition();
      const actualCondition = conditionMatch
        ? expectedCondition
        : this.getWorseCondition(expectedCondition);

      const hasMissingPages = !conditionMatch && Math.random() < 0.3;
      const hasWaterDamage = !conditionMatch && Math.random() < 0.2;

      const rating = conditionMatch
        ? Math.floor(Math.random() * 2) + 4 
        : Math.floor(Math.random() * 2) + 1; 

      this.conditionReports.push({
        id: crypto.randomUUID(),
        cycleId: cycle.id,
        participantId,
        reporterId: user.id,
        reportType: 'collection',
        bookId: participantRecord[0].bookToGiveId,
        bookTitle: 'Test Book',
        expectedCondition,
        actualCondition,
        conditionMatch,
        hasMissingPages,
        hasWaterDamage,
        photoUrls: JSON.stringify(['https://example.com/photos/book1.jpg']),
        rating,
        createdAt: cycle.completedAt || cycle.createdAt,
        cycleReference: cycle, // Changed key name so we can strip it easily later
      });
    }
  }

  private async generateDisputes(): Promise<void> {
    const poorReports = this.conditionReports.filter((r) => r.rating < 3);
    const targetDisputes = Math.min(STRESS_TEST_CONFIG.ACTIVE_DISPUTES, poorReports.length);
    const selectedReports = poorReports.slice(0, targetDisputes);

    for (const report of selectedReports) {
      const disputeType = report.hasMissingPages ? 'missing_pages' : 'condition_mismatch';
      const cycle = report.cycleReference;
      const reporterIndex = cycle.participants.findIndex((p: any) => p.id === report.reporterId);
      
      const respondentIndex = (reporterIndex + cycle.participants.length - 1) % cycle.participants.length;
      const respondent = cycle.participants[respondentIndex];

      this.disputes.push({
        id: crypto.randomUUID(),
        cycleId: report.cycleId,
        conditionReportId: report.id,
        reporterId: report.reporterId,
        respondentId: respondent.id,
        disputeType,
        title: this.getDisputeTitle(disputeType),
        description: this.getDisputeDescription(disputeType),
        status: 'open',
        priority: 'medium',
        evidencePhotoUrls: report.photoUrls,
        createdAt: report.createdAt,
      });
    }
  }

  private async generateDisputeMessages(): Promise<void> {
    for (const dispute of this.disputes) {
      const messageCount = STRESS_TEST_CONFIG.DISPUTE_MESSAGES_PER_DISPUTE || 3;

      for (let i = 0; i < messageCount; i++) {
        const isReporterMessage = i % 2 === 0;
        const senderId = isReporterMessage ? dispute.reporterId : dispute.respondentId;

        this.messages.push({
          id: crypto.randomUUID(),
          disputeId: dispute.id,
          senderId,
          message: this.getUserDisputeMessage(i, isReporterMessage),
          isAdminMessage: false,
          createdAt: new Date(dispute.createdAt.getTime() + (i + 1) * 3600000),
        });
      }
    }
  }

  private getRandomCondition(): string {
    const conditions = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  private getWorseCondition(condition: string): string {
    const conditions = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
    const index = conditions.indexOf(condition);
    const worseIndex = Math.min(index + 1, conditions.length - 1);
    return conditions[worseIndex];
  }

  private getDisputeTitle(type: string): string {
    return type === 'missing_pages' ? 'Book has missing pages' : 'Condition mismatch';
  }

  private getDisputeDescription(type: string): string {
    return type === 'missing_pages' ? 'Missing pages detected.' : 'Worse condition than listed.';
  }

  private getUserDisputeMessage(index: number, isReporterMessage: boolean): string {
    return isReporterMessage ? 'This book is not what I expected.' : 'I am sorry, let us fix this.';
  }

  async saveToDatabase(): Promise<void> {
    console.log('  💾 Saving quality control data...');

    if (this.conditionReports.length > 0) {
      for (const report of this.conditionReports) {
        // Strip the cycleReference so Drizzle doesn't try to insert it as a column
        const { cycleReference, ...reportData } = report;
        await db.insert(bookConditionReports).values(reportData);
      }
    }

    if (this.disputes.length > 0) {
      for (const dispute of this.disputes) {
        await db.insert(cycleDisputes).values(dispute);
      }
    }

    if (this.messages.length > 0) {
      for (const message of this.messages) {
        await db.insert(disputeMessages).values(message);
      }
    }
    console.log('  ✓ Database updated with QC records.');
  }
}