# Kitabu Connect - Stress Test Documentation

## Overview

This document outlines the comprehensive stress testing strategy for the Kitabu Connect multilateral swap algorithm system. The goal is to simulate **2000 active users** across **100-200 schools** with **5000+ book listings** to test system performance, scalability, and identify breaking points.

---

## Table of Contents

1. [Testing Objectives](#testing-objectives)
2. [Data Distribution Strategy](#data-distribution-strategy)
3. [Test Scenarios](#test-scenarios)
4. [Performance Benchmarks](#performance-benchmarks)
5. [Seeder Architecture](#seeder-architecture)
6. [Execution Plan](#execution-plan)
7. [Metrics & Monitoring](#metrics--monitoring)
8. [Expected Outcomes](#expected-outcomes)

---

## Testing Objectives

### Primary Goals

1. **Algorithm Performance**: Measure cycle detection speed with large datasets
2. **Geographic Optimization**: Validate Haversine distance calculations at scale
3. **Database Performance**: Verify index effectiveness under load
4. **State Machine Reliability**: Test concurrent cycle transitions
5. **Gamification Accuracy**: Ensure badges and leaderboards scale correctly
6. **Memory Management**: Monitor cache performance with large datasets

### Success Criteria

- ✅ Cycle detection completes in < 10 seconds for 5000+ listings
- ✅ User cycle retrieval < 200ms
- ✅ Leaderboard generation < 500ms
- ✅ No database deadlocks during concurrent operations
- ✅ Memory usage stays under 500MB for caching
- ✅ All 2000 users have accurate reliability scores

---

## Data Distribution Strategy

### 1. User Distribution (2000 Total)

#### Geographic Distribution
Based on realistic Kenya population density:

| Region | Percentage | User Count | Rationale |
|--------|-----------|------------|-----------|
| **Nairobi County** | 25% | 500 | Highest population, best connectivity |
| **Mombasa County** | 15% | 300 | Second largest urban center |
| **Kiambu County** | 12% | 240 | Peri-urban, close to Nairobi |
| **Nakuru County** | 10% | 200 | Major Rift Valley town |
| **Kisumu County** | 8% | 160 | Western Kenya hub |
| **Other Urban** | 15% | 300 | Eldoret, Thika, Nyeri, etc. |
| **Rural Counties** | 15% | 300 | Scattered across 20+ counties |

#### School Level Distribution

| Level | Percentage | User Count | Grade Distribution |
|-------|-----------|------------|-------------------|
| **Secondary** | 60% | 1200 | Form 1 (25%), Form 2 (25%), Form 3 (25%), Form 4 (25%) |
| **Primary** | 40% | 800 | Class 4 (15%), Class 5 (20%), Class 6 (25%), Class 7 (25%), Class 8 (15%) |

#### User Activity Levels

| Activity Level | Percentage | User Count | Listings Per User |
|---------------|-----------|------------|-------------------|
| **Super Active** | 30% | 600 | 5-10 listings |
| **Moderate** | 50% | 1000 | 2-4 listings |
| **Inactive/New** | 20% | 400 | 0-1 listings |

**Total Expected Listings**: ~5000-6000 books

### 2. School Distribution (150-200 Schools)

Selected from the 40,000+ Kenya MOE schools database:

#### Urban Schools (120 schools - 80% of users)
- **Nairobi**: 30 schools (mix of public/private)
- **Mombasa**: 20 schools
- **Kiambu**: 15 schools
- **Nakuru**: 15 schools
- **Kisumu**: 12 schools
- **Other Urban**: 28 schools

#### Rural Schools (30-50 schools - 20% of users)
- Scattered across 15+ counties
- Test long-distance logistics (100-300km between schools)
- Validate county-based clustering

### 3. Book Subject Distribution

Aligned with Kenya's 8-4-4 and CBC curriculum:

| Subject Category | Percentage | Listing Count | Key Subjects |
|-----------------|-----------|---------------|--------------|
| **Mathematics** | 20% | ~1000 | Pure Math, Business Math |
| **Languages** | 30% | ~1500 | English, Kiswahili, Literature |
| **Sciences** | 25% | ~1250 | Biology, Chemistry, Physics |
| **Humanities** | 15% | ~750 | History, Geography, CRE, IRE |
| **Others** | 10% | ~500 | Business Studies, Agriculture, Computer |

### 4. Book Condition Distribution

| Condition | Percentage | Expected Matches |
|-----------|-----------|------------------|
| **Excellent** | 15% | High demand, low supply |
| **Very Good** | 30% | Balanced |
| **Good** | 35% | Most common |
| **Fair** | 15% | Low demand |
| **Poor** | 5% | Rarely swappable |

### 5. Reliability Score Distribution

Simulating realistic user behavior patterns:

| Reliability Tier | Score Range | Percentage | User Count | Characteristics |
|-----------------|-------------|-----------|------------|-----------------|
| **Elite** | 90-100 | 20% | 400 | Always on time, perfect condition |
| **Reliable** | 70-89 | 50% | 1000 | Occasional delays, mostly good |
| **Average** | 50-69 | 20% | 400 | Frequent delays, condition issues |
| **Poor** | 30-49 | 7% | 140 | Multiple cancellations |
| **Suspended** | 0-29 | 3% | 60 | Should be excluded from cycles |

---

## Test Scenarios

### Scenario A: Same-School Swaps (Zero Cost)
**Purpose**: Test highest-priority matching within single institution

**Setup**:
- 50 students from **Nairobi School** (same `schoolId`)
- 10 students want Math, have English
- 10 students want English, have Math
- 10 students want Biology, have Chemistry
- 10 students want Chemistry, have Biology
- 10 students want History, have Geography

**Expected Outcome**:
- Multiple 2-way cycles detected
- Priority score: 90-100 (same school bonus)
- Logistics cost: KES 0 for all participants
- Drop point: School library

### Scenario B: County Clustering (Low Cost)
**Purpose**: Test geographic optimization within same county

**Setup**:
- 100 students from **Kiambu County** (5-10 schools)
- Schools 5-10km apart (KES 50-100 logistics cost)
- Intentional book overlap across schools
- Mix of 2-way, 3-way, and 4-way cycles

**Expected Outcome**:
- Cycles prioritize shorter distances
- Drop points selected at geographic centroid
- Average cost: KES 75 per participant
- isSameCounty: true, isSameZone: varies

### Scenario C: Cross-County High Priority (High Cost)
**Purpose**: Test rare book matching across long distances

**Setup**:
- 30 students across **10 different counties**
- All need Form 4 revision books (rare, high value)
- Average distance: 100-200km (KES 200-300 cost)

**Expected Outcome**:
- Algorithm still creates cycles despite distance
- Priority score: 60-75 (lower due to cost)
- Drop points: Major town libraries
- Demonstrates algorithm doesn't over-prioritize distance

### Scenario D: Reliability Filtering
**Purpose**: Ensure low-reliability users are excluded

**Setup**:
- 10 perfect swap matches BUT one participant is suspended
- 10 matches where one user has 30% reliability score

**Expected Outcome**:
- Suspended users (score < 30) NEVER appear in cycles
- Low reliability users reduce cycle priority score
- Algorithm prefers reliable users even if slightly longer distance

### Scenario E: Book Condition Matching
**Purpose**: Test `willingToSwapFor` field and condition compatibility

**Setup**:
- User A: Has "Excellent" Math book, wants "Good or better" Biology book
- User B: Has "Very Good" Biology book, wants "Fair or better" Math book
- User C: Has "Poor" Chemistry, wants "Excellent" Physics (should not match)

**Expected Outcome**:
- A ↔ B cycle created (conditions compatible)
- C not included in any cycle
- Condition matching logic enforced

### Scenario F: Multilateral Cycles (3-way, 4-way, 5-way)
**Purpose**: Test complex cycle detection

**Setup**:
- **3-way**: A has X wants Y, B has Y wants Z, C has Z wants X
- **4-way**: Chain of 4 users with sequential wants
- **5-way**: Maximum cycle size, cross-county

**Expected Outcome**:
- All cycle sizes detected correctly
- Larger cycles have lower priority (due to complexity)
- Participants properly ordered in cycle

### Scenario G: No Match Books (Edge Case)
**Purpose**: Test algorithm with unsolvable scenarios

**Setup**:
- 10% of books (~500) are unique subjects with no swap partners
- Example: Agriculture textbook (rare subject)

**Expected Outcome**:
- These books do NOT crash the algorithm
- Listings remain active but not in any cycle
- Algorithm efficiently skips unmatchable nodes

### Scenario H: Time-Based Scenarios
**Purpose**: Test state machine and timeout handling

**Setup**:
- 100 cycles created with backdated timestamps
- 50 cycles: Confirmation deadline expired (should timeout)
- 30 cycles: Completion deadline approaching (should send reminders)
- 20 cycles: All participants confirmed (should transition to active)

**Expected Outcome**:
- Timeout scheduler correctly processes expired cycles
- State transitions work correctly
- Notifications sent appropriately

---

## Performance Benchmarks

### Target Metrics

| Operation | Target Time | Warning Threshold | Breaking Point |
|-----------|-------------|-------------------|----------------|
| **Full Cycle Detection** | < 10s | 15s | > 30s |
| **Graph Construction** | < 3s | 5s | > 10s |
| **DFS Cycle Finding** | < 5s | 8s | > 15s |
| **User Cycles Query** | < 200ms | 500ms | > 1s |
| **Cycle Detail Query** | < 150ms | 400ms | > 800ms |
| **Leaderboard (School)** | < 300ms | 600ms | > 1s |
| **Leaderboard (Global)** | < 500ms | 1s | > 2s |
| **Badge Award Check** | < 100ms | 300ms | > 500ms |
| **Drop Point Selection** | < 300ms | 600ms | > 1s |
| **State Transition** | < 200ms | 500ms | > 1s |

### Database Query Metrics

| Query Type | Expected Strategy | Red Flag |
|------------|------------------|----------|
| **Cycle by Status** | Index scan on `idx_swap_cycles_status` | Table scan |
| **User Participation** | Index scan on `idx_cycle_participants_user` | Multiple table scans |
| **Active Swap Listings** | Index scan on `idx_book_listings_swap_active` | Full table scan |
| **Reliability Leaderboard** | Index scan on `idx_reliability_score` | Sort without index |

### Memory Benchmarks

| Component | Expected Usage | Warning | Critical |
|-----------|---------------|---------|----------|
| **Graph Construction** | 50-100MB | 150MB | > 200MB |
| **Cache (Schools)** | 20-40MB | 80MB | > 150MB |
| **Cache (Reliability)** | 5-10MB | 20MB | > 50MB |
| **Total Process** | 200-300MB | 500MB | > 1GB |

---

## Seeder Architecture

### File Structure

```
server/db/seeders/stress-test/
├── config/
│   ├── test-config.ts              # Configuration constants
│   └── data-templates.ts           # Book titles, names, etc.
│
├── generators/
│   ├── school-selector.ts          # Select 150-200 schools from 40k
│   ├── user-generator.ts           # Generate 2000 realistic users
│   ├── book-generator.ts           # Generate 5000+ book listings
│   ├── cycle-history-generator.ts  # Simulate past swap cycles
│   └── quality-data-generator.ts   # Condition reports, disputes
│
├── phases/
│   ├── 01-select-schools.ts        # Phase 1: School selection
│   ├── 02-generate-users.ts        # Phase 2: User creation
│   ├── 03-generate-books.ts        # Phase 3: Book listings
│   ├── 04-create-swap-history.ts   # Phase 4: Historical swaps
│   ├── 05-calculate-reliability.ts # Phase 5: Reliability scores
│   ├── 06-create-quality-data.ts   # Phase 6: Quality control data
│   └── 07-award-gamification.ts    # Phase 7: Badges & achievements
│
├── utils/
│   ├── progress-logger.ts          # Beautiful CLI progress bars
│   ├── performance-monitor.ts      # Track seeding performance
│   └── data-validator.ts           # Verify data integrity
│
├── cleanup.ts                       # Clear all test data
├── run-stress-test.ts              # Main orchestrator
└── verify-results.ts               # Post-seeding validation
```

### Phase Execution Order

```
┌─────────────────────────────────────────────────┐
│  PHASE 1: School Selection                      │
│  - Query 40k schools from database              │
│  - Select 120 urban + 30 rural schools          │
│  - Ensure geographic spread across Kenya        │
│  Duration: ~2 seconds                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PHASE 2: User Generation                       │
│  - Create 2000 users with realistic names       │
│  - Assign to schools based on distribution      │
│  - Set phone numbers, onboarding status         │
│  - Batch insert (100 users/query)               │
│  Duration: ~5 seconds                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PHASE 3: Book Listing Generation               │
│  - Generate 5000+ book listings                 │
│  - Create intentional swap matches              │
│  - Vary conditions, prices, subjects            │
│  - Set willingToSwapFor intelligently           │
│  - Batch insert (50 listings/query)             │
│  Duration: ~10 seconds                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PHASE 4: Swap History Simulation               │
│  - Create 500 completed cycles (backdated)      │
│  - Create 100 cancelled cycles                  │
│  - Create 50 timed-out cycles                   │
│  - Insert cycle_participants for each           │
│  Duration: ~8 seconds                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PHASE 5: Reliability Score Calculation         │
│  - Calculate scores based on swap history       │
│  - Set totalSwapsCompleted, penaltyPoints       │
│  - Mark suspended users (score < 30)            │
│  - Batch update (200 users/query)               │
│  Duration: ~3 seconds                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PHASE 6: Quality Control Data                  │
│  - Create 200 condition reports                 │
│  - Create 30 active disputes                    │
│  - Create 50 dispute message threads            │
│  Duration: ~3 seconds                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PHASE 7: Gamification Awards                   │
│  - Run badge checks for all 2000 users          │
│  - Award appropriate badges                     │
│  - Verify leaderboard rankings                  │
│  Duration: ~5 seconds                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  VERIFICATION & METRICS                          │
│  - Validate data integrity                      │
│  - Print summary statistics                     │
│  - Display performance metrics                  │
│  Duration: ~2 seconds                           │
└─────────────────────────────────────────────────┘

Total Expected Duration: 35-45 seconds
```

---

## Execution Plan

### Prerequisites

1. **Database Setup**
   - MySQL/PostgreSQL running locally or remotely
   - All migrations applied (including 004_quality_control_and_optimization.sql)
   - schools.json data already seeded (40k schools)

2. **Environment Configuration**
   ```bash
   DATABASE_URL=mysql://user:password@localhost:3306/kitabu_connect
   NODE_ENV=development
   ```

### Running the Stress Test

```bash
# Option 1: Full stress test (2000 users)
npm run seed:stress-test

# Option 2: Clean existing test data first
npm run seed:stress-test:clean
npm run seed:stress-test

# Option 3: Verify results only (no seeding)
npm run seed:stress-test:verify

# Option 4: Cleanup only
npm run seed:stress-test:clean
```

### Expected Console Output

```
═══════════════════════════════════════════════════════════
🧪 KITABU CONNECT - STRESS TEST SEEDER
═══════════════════════════════════════════════════════════

Configuration:
  - Target Users: 2000
  - Target Listings: 5000-6000
  - Schools: 150-200
  - Historical Cycles: 650

═══════════════════════════════════════════════════════════

[PHASE 1/7] Selecting Schools...
  ✓ Urban schools selected: 120
  ✓ Rural schools selected: 30
  ✓ Geographic spread validated
  ⏱️  Duration: 1.8s

[PHASE 2/7] Generating Users...
  ✓ Nairobi users created: 500
  ✓ Mombasa users created: 300
  ✓ Other regions created: 1200
  ⏱️  Duration: 4.6s

[PHASE 3/7] Generating Book Listings...
  ✓ Super active users (600): 3900 listings
  ✓ Moderate users (1000): 2800 listings
  ✓ Inactive users (400): 180 listings
  ✓ Total listings: 5880
  ⏱️  Duration: 11.2s

[PHASE 4/7] Creating Swap History...
  ✓ Completed cycles: 500
  ✓ Cancelled cycles: 100
  ✓ Timed-out cycles: 50
  ✓ Total participants: 2210
  ⏱️  Duration: 7.9s

[PHASE 5/7] Calculating Reliability Scores...
  ✓ Elite users (90-100): 412
  ✓ Reliable users (70-89): 1003
  ✓ Average users (50-69): 398
  ✓ Poor users (30-49): 137
  ✓ Suspended users (0-29): 50
  ⏱️  Duration: 2.8s

[PHASE 6/7] Creating Quality Control Data...
  ✓ Condition reports: 200
  ✓ Active disputes: 30
  ✓ Dispute messages: 127
  ⏱️  Duration: 2.4s

[PHASE 7/7] Awarding Gamification...
  ✓ Badges awarded: 1847
  ✓ Users with badges: 1203
  ✓ Leaderboards generated
  ⏱️  Duration: 4.2s

═══════════════════════════════════════════════════════════
✅ STRESS TEST SEEDING COMPLETED
═══════════════════════════════════════════════════════════

Summary Statistics:
  📊 Users Created: 2000
  📚 Book Listings: 5880
  🏫 Schools Used: 150
  🔄 Historical Cycles: 650
  🏆 Badges Awarded: 1847
  ⚖️  Disputes Created: 30

Performance Metrics:
  ⏱️  Total Duration: 38.7 seconds
  💾 Database Inserts: 12,847
  📈 Average Insert Speed: 332 records/second

Next Steps:
  1. Run cycle detection: POST /api/cycles/detect
  2. Check performance: Monitor response times
  3. Verify data: npm run seed:stress-test:verify
  4. View logs: tail -f logs/stress-test.log

═══════════════════════════════════════════════════════════
```

---

## Metrics & Monitoring

### Real-Time Monitoring

During seeding, track:

1. **Database Metrics**
   ```sql
   -- Active queries
   SHOW PROCESSLIST;

   -- Table sizes
   SELECT
     table_name,
     ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
   FROM information_schema.TABLES
   WHERE table_schema = 'kitabu_connect';

   -- Index usage
   SHOW INDEX FROM swap_cycles;
   ```

2. **Memory Metrics**
   ```bash
   # Node.js process memory
   node --expose-gc --max-old-space-size=2048 seed.js

   # Monitor with:
   process.memoryUsage()
   ```

3. **Performance Metrics**
   - Log timestamps for each phase
   - Track batch insert speeds
   - Monitor query execution times

### Post-Seeding Validation

```typescript
// Automated checks
✓ All 2000 users have schoolId assigned
✓ All book listings have valid sellerId
✓ All cycles have at least 2 participants
✓ All reliability scores are between 0-100
✓ No orphaned cycle_participants records
✓ All drop_points have valid coordinates
✓ No duplicate swap cycles
```

### Load Testing After Seeding

Once seeded, test these API endpoints:

```bash
# 1. Cycle Detection (most expensive)
curl -X POST http://localhost:5000/api/cycles/detect \
  -H "Cookie: auth_token=..." \
  -d '{"maxCycleSize": 5, "topN": 50}'

# Expected: < 10 seconds, returns 20-50 cycles

# 2. Global Leaderboard
curl http://localhost:5000/api/gamification/leaderboard/global?limit=50

# Expected: < 500ms, returns 50 top users

# 3. User Cycles (high frequency query)
curl http://localhost:5000/api/cycles/user/me

# Expected: < 200ms, returns user's cycles

# 4. School Leaderboard
curl http://localhost:5000/api/gamification/leaderboard/school/{schoolId}

# Expected: < 300ms, returns school rankings
```

---

## Expected Outcomes

### Success Indicators

✅ **Data Integrity**
- All foreign key relationships valid
- No NULL values in required fields
- Timestamps chronologically consistent
- Geographic coordinates within Kenya bounds

✅ **Algorithm Performance**
- Cycle detection finds 50-200 cycles
- Mix of 2-way (most common), 3-way, 4-way, 5-way cycles
- Same-school cycles prioritized (highest priority scores)
- Cross-county cycles exist but lower priority

✅ **System Stability**
- No database deadlocks during seeding
- Memory usage stays under 500MB
- No crashed processes or timeouts
- All 7 phases complete successfully

✅ **Business Logic Validation**
- Suspended users excluded from new cycles
- Drop points logically placed (geographic centroid)
- Reliability scores correlate with swap history
- Badge awards match user achievements

### Known Limitations

⚠️ **Expected Edge Cases**

1. **Unmatchable Books**: ~10% of listings won't match (by design)
2. **Suspended Users**: 60 users should have ZERO cycles
3. **Long Distance Cycles**: Some cycles may have 200+ km distance (rare books)
4. **Algorithm Timeout**: If >10k active listings, may need optimization

### Troubleshooting

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| Seeding takes > 2 minutes | Database connection slow | Use local MySQL, optimize batch size |
| Memory > 1GB | Too many in-memory objects | Reduce batch sizes, stream data |
| No cycles detected | Book matching logic too strict | Check `willingToSwapFor` generation |
| Duplicate cycles | Graph deduplication failing | Review cycle signature logic |
| Missing badges | Gamification not running | Verify Phase 7 completion |

---

## Conclusion

This stress test provides comprehensive validation of:

1. ✅ **Scalability**: 2000 users, 5000+ books, 150+ schools
2. ✅ **Performance**: Sub-10-second cycle detection
3. ✅ **Accuracy**: Geographic optimization with real Kenya schools
4. ✅ **Reliability**: State machine handles concurrent operations
5. ✅ **Gamification**: Badges and leaderboards scale correctly

**Production Readiness Checklist**:
- [ ] Stress test completes in < 45 seconds
- [ ] Cycle detection finds 50-200 valid cycles
- [ ] All API endpoints respond within target times
- [ ] No database errors or deadlocks
- [ ] Memory usage < 500MB
- [ ] Leaderboards display correctly
- [ ] Suspended users excluded from cycles

---

## Next Steps After Stress Test

1. **Performance Optimization**
   - Identify slow queries with EXPLAIN
   - Add missing indexes if needed
   - Optimize graph construction algorithm

2. **Frontend Integration**
   - Test UI with large datasets
   - Verify pagination works correctly
   - Check mobile performance

3. **Production Deployment**
   - Set up database backups
   - Configure caching (Redis)
   - Enable monitoring (Sentry, DataDog)
   - Set up CI/CD pipelines

4. **Ongoing Monitoring**
   - Track cycle detection performance weekly
   - Monitor user growth vs. performance degradation
   - Adjust cache TTLs based on usage patterns

---

**Document Version**: 1.0
**Last Updated**: 2025-12-23
**Author**: Kitabu Connect Engineering Team
**Status**: Ready for Implementation ✅
