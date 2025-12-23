# Kitabu Connect - Stress Test Execution Guide

## Complete Testing Walkthrough

This guide walks you through running the stress test, interpreting results, and testing the multilateral swap algorithm with 2000 users.

---

## Prerequisites

### 1. Database Setup

Ensure your MySQL database is running and all migrations are applied:

```bash
# Check MySQL is running
mysql -u root -p -e "SELECT VERSION();"

# Apply all migrations
npm run db:migrate

# Verify tables exist
mysql -u root -p kitabu_connect -e "SHOW TABLES;"
```

**Expected**: You should see all tables including:
- `users`, `schools`, `book_listings`
- `swap_cycles`, `cycle_participants`
- `user_reliability_scores`, `user_badges`
- `book_condition_reports`, `cycle_disputes`

### 2. Schools Data

The 40,000+ Kenya MOE schools must be seeded first:

```bash
# Check if schools exist
mysql -u root -p kitabu_connect -e "SELECT COUNT(*) FROM schools;"
```

**Expected**: ~40,000+ schools

If schools are missing:
```bash
# Seed schools from external_resource/schools.json
npm run db:seed
```

### 3. Environment Configuration

Verify your `.env` file has the correct database connection:

```env
DATABASE_URL=mysql://root:password@localhost:3306/kitabu_connect
NODE_ENV=development
```

---

## Step 1: Clean Existing Data (Optional)

If you've run the stress test before, clean old data first:

```bash
npm run seed:stress-test:clean
```

**Expected Output**:
```
═══════════════════════════════════════════════════════════
🧹 CLEANING UP STRESS TEST DATA
═══════════════════════════════════════════════════════════

⚠️  This will delete:
  - All users and their data
  - All book listings
  - All swap cycles
  ...

  🗑️  Deleting dispute messages...
  🗑️  Deleting cycle disputes...
  🗑️  Deleting book condition reports...
  🗑️  Deleting cycle participants...
  🗑️  Deleting swap cycles...
  🗑️  Deleting book listings...
  🗑️  Deleting users...

✅ CLEANUP COMPLETED SUCCESSFULLY
```

---

## Step 2: Run the Stress Test

Execute the full stress test seeder:

```bash
npm run seed:stress-test
```

### What to Watch For

#### Phase 1: Selecting Schools (Expected: ~2 seconds)
```
[PHASE 1/7] Selecting Schools...
  🔍 Querying schools database...
  ✓ NAIROBI: 30 schools (18 Secondary, 12 Primary)
  ✓ MOMBASA: 20 schools (12 Secondary, 8 Primary)
  ✓ KIAMBU: 15 schools (9 Secondary, 6 Primary)
  ...
  ✓ Total schools selected: 150
  ⏱️  Duration: 1.8s
```

**✅ Success Indicators**:
- Total schools selected: 150
- Geographic distribution matches config
- Duration < 5 seconds

**❌ Red Flags**:
- Fewer than 100 schools selected
- Duration > 10 seconds (database issue)
- Error: "No schools found for county"

#### Phase 2: Generating Users (Expected: ~5 seconds)
```
[PHASE 2/7] Generating Users...
  👥 Generating users across counties...
  ✓ NAIROBI: 500 users (30 schools)
  ✓ MOMBASA: 300 users (20 schools)
  ...
  ✓ Total users generated: 2000
  💾 Saving 2000 users in 20 batches...
  ✓ Batch 20/20 saved (2000 users)
  ⏱️  Duration: 4.6s
```

**✅ Success Indicators**:
- Total users generated: 2000
- Users distributed across activity levels
- Duration < 10 seconds

**❌ Red Flags**:
- User count < 1900
- Database connection timeout errors
- Duplicate phone number errors

#### Phase 3: Generating Book Listings (Expected: ~12 seconds)
```
[PHASE 3/7] Generating Book Listings...
  📚 Generating book listings with swap matches...
  ✓ Same-school matches created: 45 groups
  ✓ Same-county matches created: 78 groups
  ✓ Cross-county matches created: 20 groups
  ✓ Generating 2300 additional random listings...
  ✓ Total listings generated: 5880
  ✓ Match groups created: 143
  💾 Saving 5880 listings in 118 batches...
  ⏱️  Duration: 11.2s
```

**✅ Success Indicators**:
- Total listings: 5000-6000
- Match groups created: 100-200
- Mix of same-school, same-county, cross-county matches

**❌ Red Flags**:
- Listings < 4000 (not enough data)
- No match groups created
- Foreign key constraint errors (invalid sellerId)

#### Phase 4: Creating Swap History (Expected: ~8 seconds)
```
[PHASE 4/7] Creating Swap History...
  🔄 Generating historical swap cycles...
  ✓ Completed cycles generated: 500
  ✓ Cancelled cycles generated: 100
  ✓ Timed-out cycles generated: 50
  ✓ Total historical cycles: 650
  💾 Saving 650 cycles in 33 batches...
  ⏱️  Duration: 7.9s
```

**✅ Success Indicators**:
- Total cycles: 650
- Distribution: 500 completed, 100 cancelled, 50 timeout
- No foreign key errors

**❌ Red Flags**:
- Cycles < 600
- All cycles same status
- Invalid participant IDs

#### Phase 5: Calculating Reliability Scores (Expected: ~3 seconds)
```
[PHASE 5/7] Calculating Reliability Scores...
  📊 Calculating reliability scores...
  ✓ Reliability scores calculated for 2000 users
  ✓ Elite (90-100): 412
  ✓ Reliable (70-89): 1003
  ✓ Average (50-69): 398
  ✓ Poor (30-49): 137
  ✓ Suspended (0-29): 50
  ⏱️  Duration: 2.8s
```

**✅ Success Indicators**:
- All 2000 users have scores
- Distribution matches expected (~20% elite, ~50% reliable, etc.)
- Some users suspended (score < 30)

**❌ Red Flags**:
- All users have same score (50.00)
- No suspended users
- Update errors

#### Phase 6: Creating Quality Control Data (Expected: ~3 seconds)
```
[PHASE 6/7] Creating Quality Control Data...
  📝 Generating quality control data...
  ✓ Condition reports: 200
  ✓ Active disputes: 30
  ✓ Dispute messages: 90
  ✓ Condition match rate: 79.5%
  ⏱️  Duration: 2.4s
```

**✅ Success Indicators**:
- Condition reports: ~200
- Disputes: ~30
- Match rate: 75-85% (realistic)

**❌ Red Flags**:
- No reports or disputes created
- Match rate 100% (unrealistic)
- Foreign key errors

#### Phase 7: Awarding Gamification (Expected: ~5 seconds)
```
[PHASE 7/7] Awarding Gamification...
  🏆 Processing gamification and awarding badges...
  ✓ Processed 2000/2000 users
  ✓ Total badges awarded: 1847
  ✓ Users with badges: 1203
  ⏱️  Duration: 4.2s
```

**✅ Success Indicators**:
- Badges awarded: 1500-2000
- Users with badges: 1000-1500
- All users processed

**❌ Red Flags**:
- No badges awarded
- Errors during badge checking
- Badge service failures

### Final Summary

```
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
  📝 Condition Reports: 200
  💾 Total Records: 12,847

Performance Metrics:
  ⏱️  Total Duration: 38.7 seconds
  💾 Database Inserts: 12,847
  📈 Average Insert Speed: 332 records/second

Next Steps:
  1. Run cycle detection: POST /api/cycles/detect
  2. Check performance: Monitor response times
  3. Verify data: npm run seed:stress-test:verify
```

**✅ Success Indicators**:
- Total duration: 30-50 seconds (Core i7)
- All 7 phases completed
- No fatal errors

**❌ Red Flags**:
- Duration > 90 seconds (performance issue)
- Phase failures
- Database connection errors

---

## Step 3: Verify Data Integrity

Run the verification script to ensure data quality:

```bash
npm run seed:stress-test:verify
```

### Expected Output

```
═══════════════════════════════════════════════════════════
🔍 VERIFYING STRESS TEST RESULTS
═══════════════════════════════════════════════════════════

📊 Checking user count...
📚 Checking book listings...
🔄 Checking swap cycles...
🔗 Checking foreign key integrity...
📈 Checking reliability scores...
👥 Checking cycle participants...
📝 Checking quality control data...
🏆 Checking gamification data...

═══════════════════════════════════════════════════════════
📋 VERIFICATION RESULTS
═══════════════════════════════════════════════════════════

✅ 1. User count: 2000 (expected: 2000)
✅ 2. Book listings: 5880 (expected: ~5000)
✅ 3. Swap cycles: 650 (expected: 650)
✅ 4. Users with invalid schoolId: 0 (expected: 0)
✅ 5. Listings with invalid sellerId: 0 (expected: 0)
✅ 6. Users without reliability scores: 0 (expected: 0)
✅ 7. Score distribution - Elite: 412, Reliable: 1003, Average: 398, Suspended: 50
✅ 8. Cycles with < 2 participants: 0 (expected: 0)
✅ 9. Condition reports: 200
✅ 10. Disputes: 30
✅ 11. Total badges awarded: 1847
✅ 12. Users with badges: 1203

═══════════════════════════════════════════════════════════
Total Checks: 12
Passed: 12
Failed: 0
═══════════════════════════════════════════════════════════

✅ ALL VERIFICATIONS PASSED
The stress test data is valid and ready for testing.
```

**✅ All checks pass**: Proceed to testing
**❌ Some checks fail**: Review errors and re-run seeder

---

## Step 4: Test the Multilateral Swap Algorithm

Now test the core functionality with the seeded data.

### 4.1 Login as a Test User

First, get a test user's phone number from the database:

```bash
mysql -u root -p kitabu_connect -e "SELECT id, fullName, phoneNumber FROM users LIMIT 1;"
```

**Example Output**:
```
+--------------------------------------+----------------+---------------+
| id                                   | fullName       | phoneNumber   |
+--------------------------------------+----------------+---------------+
| 123e4567-e89b-12d3-a456-426614174000 | John Kamau     | 0701234567    |
+--------------------------------------+----------------+---------------+
```

Then login via your frontend or API:

```bash
# Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "0701234567"}'

# Verify OTP (check console for code if using mock OTP)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "0701234567", "code": "123456"}' \
  -c cookies.txt
```

### 4.2 Test Cycle Detection (MOST IMPORTANT)

This is the core algorithm test:

```bash
curl -X POST http://localhost:5000/api/cycles/detect \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{
    "maxCycleSize": 5,
    "topN": 50
  }' \
  -w "\n\nTime: %{time_total}s\n"
```

**Expected Response** (in < 10 seconds):

```json
{
  "success": true,
  "message": "Cycle detection completed",
  "cyclesFound": 87,
  "cyclesCreated": 50,
  "executionTimeMs": 8234,
  "stats": {
    "2-way": 32,
    "3-way": 12,
    "4-way": 5,
    "5-way": 1
  }
}

Time: 8.234s
```

**✅ Success Indicators**:
- Cycles found: 50-200
- Execution time: < 10 seconds
- Mix of cycle sizes
- Response includes detailed stats

**❌ Red Flags**:
- No cycles found (matching logic broken)
- Execution time > 30 seconds (performance issue)
- 401 Unauthorized (authentication broken)
- Database timeout errors

**Performance Benchmarks**:
- **Excellent**: < 5 seconds
- **Good**: 5-10 seconds
- **Acceptable**: 10-15 seconds
- **Poor**: > 15 seconds (needs optimization)

### 4.3 View User's Cycles

Check cycles the logged-in user is part of:

```bash
curl http://localhost:5000/api/cycles/user/me \
  -H "Cookie: $(cat cookies.txt)" \
  -w "\nTime: %{time_total}s\n"
```

**Expected Response** (< 200ms):

```json
{
  "success": true,
  "cycles": [
    {
      "id": "cycle-uuid",
      "cycleType": "3-way",
      "status": "pending_confirmation",
      "priorityScore": "82.45",
      "avgCostPerParticipant": "75.00",
      "confirmationDeadline": "2025-12-25T10:00:00Z",
      "participants": [...]
    }
  ],
  "total": 3
}
```

**✅ Success**: Response < 500ms
**❌ Slow**: > 1 second (index issue)

### 4.4 Get Cycle Details

Get full details of a specific cycle:

```bash
curl http://localhost:5000/api/cycles/CYCLE_ID \
  -H "Cookie: $(cat cookies.txt)"
```

**Expected**: Full cycle details with all participants, books, drop point info

### 4.5 Confirm Participation

Test the confirmation workflow:

```bash
curl -X POST http://localhost:5000/api/cycles/CYCLE_ID/confirm \
  -H "Cookie: $(cat cookies.txt)"
```

**Expected**:
```json
{
  "success": true,
  "message": "Participation confirmed",
  "cycle": {
    "status": "confirmed",
    "confirmedParticipantsCount": 3
  }
}
```

---

## Step 5: Test Gamification System

### 5.1 Global Leaderboard

```bash
curl http://localhost:5000/api/gamification/leaderboard/global?limit=10 \
  -H "Cookie: $(cat cookies.txt)" \
  -w "\nTime: %{time_total}s\n"
```

**Expected** (< 500ms):

```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "userId": "...",
      "fullName": "John Kamau",
      "reliabilityScore": 98.50,
      "totalSwapsCompleted": 45,
      "schoolName": "Nairobi School"
    },
    ...
  ]
}
```

**Performance Benchmarks**:
- **Excellent**: < 300ms
- **Good**: 300-500ms
- **Acceptable**: 500-1000ms
- **Poor**: > 1 second

### 5.2 School Leaderboard

```bash
# Get a schoolId first
curl http://localhost:5000/api/auth/me -H "Cookie: $(cat cookies.txt)" | jq '.user.schoolId'

# Then get school leaderboard
curl "http://localhost:5000/api/gamification/leaderboard/school/SCHOOL_ID?limit=10" \
  -H "Cookie: $(cat cookies.txt)"
```

**Expected**: Top 10 users from that school

### 5.3 User Badges

```bash
curl http://localhost:5000/api/gamification/badges/me \
  -H "Cookie: $(cat cookies.txt)"
```

**Expected**:

```json
{
  "success": true,
  "badges": [
    {
      "id": "first_swap",
      "name": "First Swap",
      "description": "Complete your first swap",
      "icon": "🎉"
    },
    {
      "id": "swap_master_10",
      "name": "Swap Champion",
      "description": "Complete 10 swaps",
      "icon": "🏆"
    }
  ],
  "total": 2
}
```

### 5.4 User Rank

```bash
curl http://localhost:5000/api/gamification/rank/me \
  -H "Cookie: $(cat cookies.txt)"
```

**Expected**:

```json
{
  "success": true,
  "rank": {
    "global": 42,
    "school": 5,
    "totalUsers": 2000
  },
  "stats": {
    "reliabilityScore": 78.50,
    "totalSwapsCompleted": 12,
    "totalCyclesCompleted": 12
  }
}
```

---

## Step 6: Database Performance Analysis

### 6.1 Check Query Performance

```bash
mysql -u root -p kitabu_connect
```

Then run EXPLAIN on key queries:

```sql
-- Check cycle detection query uses indexes
EXPLAIN SELECT * FROM book_listings
WHERE listingType = 'swap'
AND listingStatus = 'active'
LIMIT 1000;

-- Expected: Uses idx_book_listings_swap_active

-- Check leaderboard query
EXPLAIN SELECT * FROM user_reliability_scores
ORDER BY reliabilityScore DESC
LIMIT 50;

-- Expected: Uses idx_reliability_score

-- Check user cycles query
EXPLAIN SELECT * FROM cycle_participants
WHERE userId = 'some-uuid'
AND confirmed = 1;

-- Expected: Uses idx_cycle_participants_user_confirmed
```

**✅ Good**: All queries use indexes (type = "ref" or "range")
**❌ Bad**: type = "ALL" (full table scan)

### 6.2 Check Database Size

```sql
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
  table_rows
FROM information_schema.TABLES
WHERE table_schema = 'kitabu_connect'
ORDER BY (data_length + index_length) DESC;
```

**Expected Sizes**:
- `book_listings`: 2-5 MB (5000+ records)
- `users`: 1-2 MB (2000 records)
- `swap_cycles`: 1-3 MB (650+ records)
- `cycle_participants`: 2-4 MB (2000+ records)

---

## Step 7: Frontend Testing

### 7.1 Login and Browse

1. Open http://localhost:5000
2. Login with a test user phone number
3. Navigate to "Multi-Way" swaps page
4. Click "Detect Swap Cycles"

**Expected**:
- Loading spinner appears
- Results load in < 10 seconds
- Multiple swap cycles displayed
- Priority badges visible (High/Medium/Low)

### 7.2 View Cycle Details

1. Click on a cycle card
2. View cycle details page

**Expected**:
- Cycle progress timeline displayed
- All participants shown
- Drop point information visible
- Logistics costs displayed
- Confirm button enabled

### 7.3 Confirm Participation

1. Click "Confirm Participation"
2. Check cycle status updates

**Expected**:
- Status changes to "Confirmed"
- Confirmation count increases
- User redirected to active cycles

### 7.4 View Leaderboards

1. Navigate to Leaderboards page (if exists)
2. Check global and school rankings

**Expected**:
- Rankings display correctly
- User's rank highlighted
- Reliability scores visible

---

## Troubleshooting Guide

### Issue: Cycle detection finds 0 cycles

**Diagnosis**:
```bash
# Check if swap listings exist
mysql -u root -p kitabu_connect -e "SELECT COUNT(*) FROM book_listings WHERE listingType = 'swap' AND listingStatus = 'active';"
```

**Solutions**:
1. Re-run seeder: `npm run seed:stress-test:clean && npm run seed:stress-test`
2. Check `willingToSwapFor` field is populated
3. Verify match groups were created

### Issue: Cycle detection takes > 30 seconds

**Diagnosis**:
```bash
# Check index usage
mysql -u root -p kitabu_connect -e "SHOW INDEX FROM book_listings;"
```

**Solutions**:
1. Ensure indexes exist (run migration 004)
2. Analyze query with EXPLAIN
3. Reduce `topN` parameter to 20
4. Check database server resources

### Issue: Authentication fails (401 errors)

**Diagnosis**:
```bash
# Check auth middleware
grep "authenticateToken" server/routes/cycles.ts
```

**Solutions**:
1. Ensure cookies are being sent
2. Check JWT token is valid
3. Verify middleware is imported correctly

### Issue: Foreign key constraint errors during seeding

**Diagnosis**: Check which foreign key is failing

**Solutions**:
1. Ensure schools are seeded first
2. Check database migrations are applied
3. Verify foreign key relationships in schema

### Issue: Leaderboards show incorrect rankings

**Diagnosis**:
```bash
# Check reliability scores
mysql -u root -p kitabu_connect -e "SELECT userId, reliabilityScore FROM user_reliability_scores ORDER BY reliabilityScore DESC LIMIT 10;"
```

**Solutions**:
1. Re-run reliability score calculation
2. Check score calculation logic
3. Verify sorting order in query

---

## Performance Benchmarks Summary

| Operation | Excellent | Good | Acceptable | Poor |
|-----------|-----------|------|------------|------|
| **Full Seeding** | < 35s | 35-45s | 45-60s | > 60s |
| **Cycle Detection** | < 5s | 5-10s | 10-15s | > 15s |
| **User Cycles** | < 100ms | 100-200ms | 200-500ms | > 500ms |
| **Cycle Details** | < 100ms | 100-150ms | 150-400ms | > 400ms |
| **Global Leaderboard** | < 300ms | 300-500ms | 500-1s | > 1s |
| **School Leaderboard** | < 200ms | 200-300ms | 300-600ms | > 600ms |
| **Badge Check** | < 50ms | 50-100ms | 100-300ms | > 300ms |

---

## Success Criteria Checklist

**Stress Test Execution**:
- [ ] All 7 phases complete without errors
- [ ] Total duration 30-50 seconds (Core i7)
- [ ] All verifications pass
- [ ] No database errors or deadlocks

**Algorithm Performance**:
- [ ] Cycle detection finds 50-200 cycles
- [ ] Execution time < 10 seconds
- [ ] Mix of 2-way through 5-way cycles
- [ ] Priority scores calculated correctly

**Data Quality**:
- [ ] 2000 users created
- [ ] 5000+ book listings
- [ ] 150 schools used
- [ ] 650 historical cycles
- [ ] Realistic reliability score distribution
- [ ] Suspended users exist (score < 30)

**Gamification**:
- [ ] 1500+ badges awarded
- [ ] 1000+ users have badges
- [ ] Leaderboards display correctly
- [ ] Rankings accurate

**Frontend**:
- [ ] Swap cycles page loads
- [ ] Cycle detection works from UI
- [ ] Cycle details page displays correctly
- [ ] Confirmation workflow functions
- [ ] Leaderboards accessible

**Production Readiness**:
- [ ] All API endpoints respond within targets
- [ ] Database indexes used correctly
- [ ] Memory usage < 500MB
- [ ] No performance degradation with load
- [ ] Suspended users excluded from cycles

---

## Next Steps After Testing

1. **Optimize**: Address any performance bottlenecks found
2. **Monitor**: Set up logging and monitoring for production
3. **Scale**: Test with even larger datasets if needed
4. **Deploy**: Move to staging environment
5. **Document**: Update API documentation with learnings

---

**Created**: 2025-12-23
**Optimized For**: Core i7, Local MySQL
**Expected Duration**: 30-50 seconds total testing time
