# Realistic Data Seeder

This seeder populates the Kitabu-Connect database with realistic test data simulating 2000+ real users interacting with the marketplace.

## What Gets Seeded

### **Users (2000)**
- Realistic Kenyan names (first + last)
- Valid phone numbers with Kenyan prefixes (0701-0799)
- Email addresses with common domains
- Geographic coordinates near their children's schools
- Family size distribution:
  - 40% single child
  - 35% two children
  - 15% three children
  - 7% four children
  - 3% five children

### **Children (3000-4000)**
- Realistic Kenyan child names
- Distributed across all grades (Grade 1 - Form 4)
- 70% siblings attend same school (realistic family pattern)
- Linked to real schools from your schools table

### **Book Listings (5000)**
- **Authentic Kenyan Curriculum Books:**
  - CBC (Competency-Based Curriculum) for Grade 1-9
  - 8-4-4 for Form 1-4
  - Real publishers: KLB, Oxford, Longhorn
  - Appropriate subjects per grade

- **Realistic Pricing:**
  - Condition-based: Like New (80%), Good (60%), Fair (40%), Acceptable (25%)
  - Subject-based base prices (Math: 800, Sciences: 850, etc.)
  - ±15% random variance for realism

- **Distribution:**
  - 60% for sale
  - 40% for swap
  - 70% negotiable
  - Varied quantities (1-3 copies)

### **Engagement Data**
- **Swap Requests (200):** Pending, accepted, and rejected statuses
- **Favorites (1000):** Users favoriting books they're interested in
- **View Counts:** Randomized engagement metrics (0-50 views per listing)

## Features

### **Geographic Realism**
- Users placed within ~5-10km radius of their children's schools
- Simulates real parent locations for distance-based filtering
- Tests hybrid distance calculation (school-to-school)

### **Family Clustering**
- Siblings typically attend the same school
- Realistic multi-child family structures
- Tests child selector and grade-specific filtering

### **Marketplace Diversity**
- Mix of budget, mid-range, and premium priced books
- Various conditions representing realistic used book market
- Both CBC and 8-4-4 curriculum coverage

## Usage

### **Prerequisites**
Ensure your schools table is populated first:
```bash
npm run db:seed  # Or your existing school seeder
```

### **Run the Seeder**
```bash
npm run db:seed:realistic
```

### **Expected Output**
```
🌱 Starting realistic data seeding...

📚 Fetching schools from database...
✅ Found 500 schools

👥 Creating 2000 users with families...
✅ Created 100/2000 users...
✅ Created 200/2000 users...
...
✅ Created 2000 users with 3547 children

📚 Creating book listings...
✅ Created 250/5000 listings...
...
✅ Created 5000 book listings

🔄 Creating swap requests...
✅ Created 200 swap requests

❤️  Creating favorites...
✅ Created up to 1000 favorites

🎉 Seeding completed successfully!

📊 Summary:
   - 2000 users
   - 3547 children
   - 5000 book listings
   - 200 swap requests
   - Up to 1000 favorites
```

## What You Can Test

After seeding, you can test:

✅ **Child Selector** - Multiple children per parent
✅ **Distance Filtering** - School-to-school proximity
✅ **Curriculum Filters** - CBC vs 8-4-4 books
✅ **Price Range Filters** - Diverse pricing
✅ **Condition Filters** - All condition types
✅ **Same School Filter** - School-based community
✅ **Swap Matching** - Active swap requests
✅ **Favorites System** - Saved books
✅ **Engagement Metrics** - View and favorite counts
✅ **Geographic Distribution** - Realistic user locations

## Data Characteristics

### **Book Catalog (Real Kenyan Books)**

**CBC Books (Grade 1-6):**
- Literacy/English Activities
- Mathematics Activities
- Science & Technology
- Social Studies
- Kiswahili

**8-4-4 Books (Form 1-4):**
- English Grammar & Literature
- Mathematics
- Sciences (Physics, Chemistry, Biology)
- Humanities (Geography, History)
- Kiswahili Fasili
- Business Studies

### **Realistic Details**

1. **Phone Numbers:** Valid Kenyan mobile prefixes (Safaricom, Airtel)
2. **Emails:** Common domains (Gmail, Yahoo, Outlook)
3. **Locations:** Within 10km of children's schools
4. **Prices:** Market-realistic for used textbooks in Kenya
5. **Family Patterns:** Siblings usually at same school
6. **Listing Behavior:** Mix of active sellers and casual users

## Performance

- **Execution Time:** ~2-3 minutes for 2000 users + 5000 listings
- **Database Size:** ~10-15MB additional data
- **Batch Processing:** Progress updates every 100 users / 250 listings

## Customization

To adjust the seeder, modify these constants in `seed-realistic-data.ts`:

```typescript
const TARGET_USERS = 2000;        // Number of users to create
const TARGET_LISTINGS = 5000;     // Number of book listings
const NUM_SWAP_REQUESTS = 200;    // Swap interactions
const NUM_FAVORITES = 1000;       // Favorited books
```

You can also customize:
- Family size distribution
- Price ranges by subject
- Book catalog (add more realistic titles)
- Condition distribution

## Notes

- **Idempotency:** Not idempotent - running multiple times creates duplicates
- **School Dependency:** Requires populated schools table
- **Random Data:** Each run generates different random data
- **Production:** **DO NOT RUN IN PRODUCTION** - for testing only

## Cleanup

To remove seeded data (if needed):
```sql
DELETE FROM favorites;
DELETE FROM swap_requests;
DELETE FROM book_listings;
DELETE FROM children;
DELETE FROM users WHERE role = 'PARENT';
```

## Future Enhancements

Potential additions:
- [ ] Transaction history
- [ ] Messaging between users
- [ ] Reviews/ratings
- [ ] Wishlist data
- [ ] Search history
- [ ] Login activity patterns
