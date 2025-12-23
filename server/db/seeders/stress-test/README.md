# Kitabu Connect - Stress Test Seeder

## Overview

This comprehensive stress test seeder generates **2000 users**, **5000+ book listings**, and **650 historical swap cycles** with realistic data patterns to test the multilateral swap algorithm at scale.

## Quick Start

```bash
# 1. Clean existing test data (optional)
npm run seed:stress-test:clean

# 2. Run the full stress test
npm run seed:stress-test

# 3. Verify data integrity
npm run seed:stress-test:verify
```

## What Gets Created

### Users (2000 total)
- **Geographic Distribution**:
  - Nairobi (500), Mombasa (300), Kiambu (240), Nakuru (200)
  - Kisumu (160), Other urban (300), Rural (300)
- **Activity Levels**:
  - Super Active (600 users) - 5-10 listings each
  - Moderate (1000 users) - 2-4 listings each
  - Inactive (400 users) - 0-1 listings each
- **School Levels**: 60% Secondary, 40% Primary
- **Realistic Kenyan names and phone numbers**

### Book Listings (5000+ total)
- **Intentional Swap Matches** (70% of listings):
  - Same-school matches (FREE logistics)
  - Same-county matches (KES 50-100)
  - Cross-county matches (KES 200-300)
- **Subjects**: Math (20%), English (15%), Kiswahili (15%), Sciences (25%), etc.
- **Conditions**: Excellent (15%), Very Good (30%), Good (35%), Fair (15%), Poor (5%)

### Swap History (650 cycles)
- **Completed**: 500 cycles (80% success rate)
- **Cancelled**: 100 cycles
- **Timed-out**: 50 cycles
- **Cycle Sizes**: 2-way (60%), 3-way (25%), 4-way (10%), 5-way (5%)

### Reliability Scores
Calculated based on participation history:
- **Elite (90-100)**: ~20% of users
- **Reliable (70-89)**: ~50% of users
- **Average (50-69)**: ~20% of users
- **Poor (30-49)**: ~7% of users
- **Suspended (0-29)**: ~3% of users

### Quality Control
- **Condition Reports**: 200 reports (80% matches, 20% mismatches)
- **Active Disputes**: 30 disputes
- **Dispute Messages**: ~90 messages

### Gamification
- **Badges Awarded**: ~1800+ badges
- **Users with Badges**: ~1200+ users

## Architecture

```
stress-test/
├── config/
│   ├── test-config.ts          # Configuration constants
│   └── data-templates.ts       # Kenyan names, book titles
│
├── generators/
│   ├── school-selector.ts      # Select 150 schools from 40k
│   ├── user-generator.ts       # Generate 2000 users
│   ├── book-generator.ts       # Generate 5000+ listings
│   ├── swap-history-generator.ts    # Simulate 650 cycles
│   ├── reliability-calculator.ts    # Calculate scores
│   ├── quality-data-generator.ts    # Reports & disputes
│   └── gamification-processor.ts    # Award badges
│
├── utils/
│   ├── progress-logger.ts      # Console progress output
│   └── performance-monitor.ts  # Performance metrics
│
├── run-stress-test.ts          # Main orchestrator
├── cleanup.ts                  # Remove all test data
└── verify-results.ts           # Validate data integrity
```

## Execution Phases

The seeder runs in 7 phases:

1. **School Selection** (~2s)
   - Selects 150 schools from 40k+ database
   - Geographic distribution across Kenya

2. **User Generation** (~5s)
   - Creates 2000 users with realistic data
   - Assigns to schools based on distribution

3. **Book Listing Generation** (~12s)
   - Creates 5000+ listings
   - Intentional swap matches built in

4. **Swap History** (~8s)
   - Generates 650 historical cycles
   - Participants assigned correctly

5. **Reliability Scores** (~3s)
   - Calculates scores based on history
   - Distributes across tiers

6. **Quality Control Data** (~3s)
   - Condition reports and disputes
   - Realistic mismatch rates

7. **Gamification** (~5s)
   - Awards badges based on achievements
   - Processes all 2000 users

**Total Duration**: ~35-45 seconds (optimized for Core i7)

## Performance Expectations

### Target Metrics

| Operation | Target | Warning | Critical |
|-----------|--------|---------|----------|
| Full Cycle Detection | < 10s | 15s | > 30s |
| User Cycles Query | < 200ms | 500ms | > 1s |
| Global Leaderboard | < 500ms | 1s | > 2s |
| Badge Award Check | < 100ms | 300ms | > 500ms |

### Database Performance

- All queries should use indexes (check with EXPLAIN)
- No full table scans on large tables
- Memory usage < 500MB for caching

## Testing After Seeding

### 1. Test Cycle Detection

```bash
curl -X POST http://localhost:5000/api/cycles/detect \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxCycleSize": 5, "topN": 50}'
```

**Expected**: Should find 50-200 cycles in < 10 seconds

### 2. Test Leaderboards

```bash
# Global leaderboard
curl http://localhost:5000/api/gamification/leaderboard/global?limit=50

# School leaderboard
curl http://localhost:5000/api/gamification/leaderboard/school/SCHOOL_ID
```

**Expected**: Response < 500ms with proper rankings

### 3. Test Badge System

```bash
# Get user badges
curl http://localhost:5000/api/gamification/badges/me \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

**Expected**: Returns user's earned badges

## Verification Checks

The verify script runs 13 checks:

✅ User count (~2000)
✅ Book listings count (~5000+)
✅ Swap cycles count (~650)
✅ Foreign key integrity (users → schools)
✅ Foreign key integrity (listings → users)
✅ All users have reliability scores
✅ Score distribution realistic
✅ All cycles have ≥ 2 participants
✅ Condition reports exist
✅ Disputes exist
✅ Badges awarded
✅ Users with badges

```bash
npm run seed:stress-test:verify
```

## Cleanup

To remove ALL test data (preserves schools):

```bash
npm run seed:stress-test:clean
```

This deletes:
- Users and all related data
- Book listings
- Swap cycles
- Reliability scores
- Quality control data
- Gamification data

**Preserves**:
- Schools (40k+)
- Publishers
- Database schema

## Configuration

Edit `config/test-config.ts` to adjust:

```typescript
export const STRESS_TEST_CONFIG = {
  TOTAL_USERS: 2000,          // Adjust user count
  TOTAL_SCHOOLS: 150,         // Adjust school count
  TARGET_LISTINGS: 5500,      // Adjust listing target
  COMPLETED_CYCLES: 500,      // Adjust history size
  // ... more options
};
```

## Troubleshooting

### Issue: Seeding takes > 2 minutes
**Cause**: Database connection slow
**Solution**: Use local MySQL, check network latency

### Issue: Memory > 1GB
**Cause**: Too many in-memory objects
**Solution**: Reduce batch sizes in config

### Issue: No cycles detected after seeding
**Cause**: Book matching logic too strict
**Solution**: Check `willingToSwapFor` generation in book-generator.ts

### Issue: Duplicate cycles
**Cause**: Graph deduplication failing
**Solution**: Review cycle signature logic in swapCycle.service.ts

### Issue: Missing badges
**Cause**: Gamification not running properly
**Solution**: Verify Phase 7 completion, check console logs

## Performance Optimization Tips

1. **Use Local MySQL**: Remote databases add latency
2. **Increase Connection Pool**: Set `DATABASE_POOL_SIZE=20`
3. **Batch Operations**: Already optimized, but can adjust batch sizes
4. **Index Verification**: Run EXPLAIN on slow queries
5. **Memory Limits**: Set `--max-old-space-size=2048` for Node.js

## Expected Console Output

```
═══════════════════════════════════════════════════════════
🧪 KITABU CONNECT - STRESS TEST SEEDER
═══════════════════════════════════════════════════════════

Configuration:
  - Target Users: 2000
  - Target Listings: 5500
  - Schools: 150
  - Historical Cycles: 650

═══════════════════════════════════════════════════════════

[PHASE 1/7] Selecting Schools...
  ✓ Urban schools selected: 120
  ✓ Rural schools selected: 30
  ⏱️  Duration: 1.8s

[PHASE 2/7] Generating Users...
  ✓ Super active users: 600
  ✓ Moderate users: 1000
  ✓ Inactive users: 400
  ⏱️  Duration: 4.6s

... (continues through all 7 phases)

═══════════════════════════════════════════════════════════
✅ STRESS TEST SEEDING COMPLETED
═══════════════════════════════════════════════════════════
```

## Next Steps After Seeding

1. **Run Cycle Detection**: Test the algorithm with real data
2. **Monitor Performance**: Check response times match targets
3. **Verify Data Quality**: Run the verification script
4. **Test Frontend**: Load the UI with populated data
5. **Check Leaderboards**: Verify rankings are correct
6. **Test State Machine**: Confirm transitions work correctly

## Production Readiness Checklist

- [ ] Stress test completes in < 45 seconds
- [ ] Cycle detection finds 50-200 valid cycles
- [ ] All API endpoints respond within target times
- [ ] No database errors or deadlocks
- [ ] Memory usage < 500MB
- [ ] Leaderboards display correctly
- [ ] Suspended users excluded from cycles
- [ ] All verifications pass

---

**Last Updated**: 2025-12-23
**Optimized For**: Core i7 with local MySQL
**Expected Duration**: 35-45 seconds
