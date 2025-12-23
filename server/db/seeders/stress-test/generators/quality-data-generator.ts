/**
 * Quality Control Data Generator
 *
 * Generates condition reports, disputes, and dispute messages
 */

import crypto from "crypto";
import { db } from "../../../../db";
import { bookConditionReports, cycleDisputes, disputeMessages, cycleParticipants } from "../../../schema";
import { and, eq } from "drizzle-orm";
import { STRESS_TEST_CONFIG } from "../config/test-config";
import { randomDateBetween } from "../config/data-templates";
import type { HistoricalCycle } from "./swap-history-generator";

export class QualityDataGenerator {
  private conditionReports: any[] = [];
  private disputes: any[] = [];
  private messages: any[] = [];

  /**
   * Generate quality control data
   */
  async generateQualityData(completedCycles: HistoricalCycle[]): Promise<void> {
    console.log('  📝 Generating quality control data...');

    // Generate condition reports (for completed cycles only)
    await this.generateConditionReports(completedCycles);

    // Generate disputes (based on poor condition reports)
    await this.generateDisputes();

    // Generate dispute messages
    await this.generateDisputeMessages();

    console.log(`  ✓ Condition reports: ${this.conditionReports.length}`);
    console.log(`  ✓ Disputes: ${this.disputes.length}`);
    console.log(`  ✓ Dispute messages: ${this.messages.length}`);
  }

  /**
   * Generate condition reports
   */
  private async generateConditionReports(completedCycles: HistoricalCycle[]): Promise<void> {
    const targetReports = Math.min(
      STRESS_TEST_CONFIG.CONDITION_REPORTS,
      completedCycles.length
    );

    // Select random completed cycles for condition reports
    const selectedCycles = completedCycles
      .sort(() => Math.random() - 0.5)
      .slice(0, targetReports);

    for (const cycle of selectedCycles) {
      const user = cycle.participants[0]; // Use first participant

      // Query to get the cycle_participants.id (auto-increment int)
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

      // 80% match, 20% mismatch (realistic)
      const conditionMatch = Math.random() < 0.8;
      const expectedCondition = this.getRandomCondition();
      const actualCondition = conditionMatch
        ? expectedCondition
        : this.getWorseCondition(expectedCondition);

      // Random quality issues
      const hasMissingPages = !conditionMatch && Math.random() < 0.3;
      const hasWaterDamage = !conditionMatch && Math.random() < 0.2;

      // Rating (1-5 stars)
      const rating = conditionMatch
        ? Math.floor(Math.random() * 2) + 4 // 4-5 stars
        : Math.floor(Math.random() * 3) + 1; // 1-3 stars

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
        photoUrls: JSON.stringify([
          'https://example.com/photos/book1.jpg',
          'https://example.com/photos/book2.jpg',
        ]),
        rating,
        createdAt: cycle.completedAt || cycle.createdAt,
        cycle, // Store cycle for dispute generation
      });
    }
  }

  /**
   * Generate disputes
   */
  private async generateDisputes(): Promise<void> {
    // Create disputes for condition reports with ratings < 3
    const poorReports = this.conditionReports.filter((r) => r.rating < 3);

    const targetDisputes = Math.min(STRESS_TEST_CONFIG.ACTIVE_DISPUTES, poorReports.length);
    const selectedReports = poorReports.slice(0, targetDisputes);

    for (const report of selectedReports) {
      const disputeType = report.hasMissingPages
        ? 'missing_pages'
        : report.hasWaterDamage
        ? 'water_damage'
        : 'condition_mismatch';

      const status = Math.random() < 0.7 ? 'open' : 'investigating';
      const priority = report.rating === 1 ? 'high' : 'medium';

      // Get another participant from the cycle as respondent
      // (the person who gave the book that was reported)
      const cycle = report.cycle;
      const reporterIndex = cycle.participants.findIndex((p: any) => p.id === report.reporterId);
      const respondentIndex = (reporterIndex + cycle.participants.length - 1) % cycle.participants.length;
      const respondent = cycle.participants[respondentIndex];

      const title = this.getDisputeTitle(disputeType);

      this.disputes.push({
        id: crypto.randomUUID(),
        cycleId: report.cycleId,
        conditionReportId: report.id,
        reporterId: report.reporterId,
        respondentId: respondent.id,
        disputeType,
        title,
        description: this.getDisputeDescription(disputeType),
        status,
        priority,
        evidencePhotoUrls: report.photoUrls,
        createdAt: report.createdAt,
      });
    }
  }

  /**
   * Generate dispute messages
   */
  private async generateDisputeMessages(): Promise<void> {
    for (const dispute of this.disputes) {
      const messageCount = STRESS_TEST_CONFIG.DISPUTE_MESSAGES_PER_DISPUTE;

      for (let i = 0; i < messageCount; i++) {
        // Alternate between reporter and respondent
        const isReporterMessage = i % 2 === 0;
        const senderId = isReporterMessage ? dispute.reporterId : dispute.respondentId;

        this.messages.push({
          id: crypto.randomUUID(),
          disputeId: dispute.id,
          senderId,
          message: this.getUserDisputeMessage(i, isReporterMessage),
          isAdminMessage: false,
          createdAt: new Date(dispute.createdAt.getTime() + i * 60 * 60 * 1000), // 1 hour apart
        });
      }
    }
  }

  /**
   * Get random condition
   */
  private getRandomCondition(): string {
    const conditions = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  /**
   * Get worse condition (for mismatches)
   */
  private getWorseCondition(condition: string): string {
    const conditions = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
    const index = conditions.indexOf(condition);
    const worseIndex = Math.min(index + 1 + Math.floor(Math.random() * 2), conditions.length - 1);
    return conditions[worseIndex];
  }

  /**
   * Get dispute title
   */
  private getDisputeTitle(type: string): string {
    const titles: Record<string, string> = {
      missing_pages: 'Book has missing pages',
      water_damage: 'Book has water damage',
      condition_mismatch: 'Book condition does not match description',
    };
    return titles[type] || 'Issue with received book';
  }

  /**
   * Get dispute description
   */
  private getDisputeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      missing_pages: 'The book I received has several pages missing. This was not mentioned in the listing.',
      water_damage: 'Book has water damage that makes some pages unreadable.',
      condition_mismatch: 'The actual condition is worse than what was listed. Expected better quality.',
    };
    return descriptions[type] || 'Issue with received book condition.';
  }

  /**
   * Get user dispute message
   */
  private getUserDisputeMessage(index: number, isReporterMessage: boolean): string {
    if (isReporterMessage) {
      const reporterMessages = [
        'I am disappointed with the condition of the book I received.',
        'Can this issue be resolved? I was expecting better quality.',
        'Please let me know how we can resolve this.',
      ];
      return reporterMessages[index] || 'Following up on this dispute.';
    } else {
      const respondentMessages = [
        'I apologize for the condition issue. The book was in good condition when I sent it.',
        'I can provide a replacement or we can find another solution.',
        'Thank you for your understanding. I want to resolve this amicably.',
      ];
      return respondentMessages[index] || 'I am willing to work this out.';
    }
  }

  /**
   * Save quality data to database
   */
  async saveToDatabase(): Promise<void> {
    console.log('  💾 Saving quality control data...');

    // Save condition reports (exclude cycle field)
    if (this.conditionReports.length > 0) {
      for (const report of this.conditionReports) {
        const { cycle, ...reportData } = report;
        await db.insert(bookConditionReports).values(reportData);
      }
      console.log(`  ✓ Condition reports saved: ${this.conditionReports.length}`);
    }

    // Save disputes
    if (this.disputes.length > 0) {
      for (const dispute of this.disputes) {
        await db.insert(cycleDisputes).values(dispute);
      }
      console.log(`  ✓ Disputes saved: ${this.disputes.length}`);
    }

    // Save dispute messages
    if (this.messages.length > 0) {
      for (const message of this.messages) {
        await db.insert(disputeMessages).values(message);
      }
      console.log(`  ✓ Dispute messages saved: ${this.messages.length}`);
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    conditionReports: number;
    disputes: number;
    messages: number;
    matchRate: number;
  } {
    const matches = this.conditionReports.filter((r) => r.conditionMatch).length;
    const matchRate = this.conditionReports.length > 0
      ? (matches / this.conditionReports.length) * 100
      : 0;

    return {
      conditionReports: this.conditionReports.length,
      disputes: this.disputes.length,
      messages: this.messages.length,
      matchRate,
    };
  }
}
