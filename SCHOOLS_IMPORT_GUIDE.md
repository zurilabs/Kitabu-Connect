# Schools Import Guide

## Overview
This guide explains how to import Kenya Ministry of Education school data into the Kitabu Connect database.

## Files Modified

### 1. Schema Update
**File:** `server/db/schema/index.ts`
- Updated schools table structure to match Ministry of Education format
- Added fields: code, schoolName, level, status, county, district, zone, subCounty, ward, xCoord, yCoord, source

### 2. Migration File
**File:** `server/db/migrations/002_update_schools_schema.sql`
- SQL migration to create new schools table structure
- Run this migration before seeding

### 3. Schools Seeder
**File:** `server/db/seeders/schools.ts`
- Reads from `external_resource/schools.json` (11.5MB GeoJSON file)
- Processes schools in batches of 1000 for optimal performance
- Imports all Kenyan schools from Ministry of Education 2016 data

## Data Source

**File:** `external_resource/schools.json`
- **Format:** GeoJSON FeatureCollection
- **Size:** 11.5 MB
- **Records:** ~40,000+ schools across Kenya
- **Source:** Ministry of Education, 2016
- **Coordinate System:** EPSG:32737 (UTM Zone 37S)

### Sample School Record
```json
{
  "CODE": 1,
  "SCHOOL_NAM": "BAKWANIN",
  "LEVEL": "Primary",
  "Status": "Public",
  "County": "Baringo",
  "DISTRICT": "BARINGO CENTRAL",
  "ZONE": "KABASIS",
  "SUB_COUNTY": "Baringo Central",
  "Ward": "Sacho",
  "X_Coord": 35.797080,
  "Y_Coord": 0.409550,
  "Source": "Ministry of Education, 2016"
}
```

## Database Schema

```sql
CREATE TABLE `schools` (
  `id` VARCHAR(36) PRIMARY KEY,
  `code` INT UNIQUE,
  `school_name` VARCHAR(255) NOT NULL,
  `level` VARCHAR(50),           -- Primary, Secondary, etc.
  `status` VARCHAR(50),          -- Public, Private
  `county` VARCHAR(100),
  `district` VARCHAR(100),
  `zone` VARCHAR(100),
  `sub_county` VARCHAR(100),
  `ward` VARCHAR(100),
  `x_coord` DECIMAL(10, 7),     -- Longitude
  `y_coord` DECIMAL(10, 7),     -- Latitude
  `source` VARCHAR(255),
  `created_at` TIMESTAMP,
  `updated_at` TIMESTAMP,

  -- Indexes for performance
  INDEX idx_schools_name (school_name),
  INDEX idx_schools_county (county),
  INDEX idx_schools_level (level),
  INDEX idx_schools_status (status),
  INDEX idx_schools_code (code)
);
```

## How to Run

### Step 1: Run Migration
```bash
# Apply the migration to update the schools table structure
mysql -u your_username -p your_database < server/db/migrations/002_update_schools_schema.sql
```

### Step 2: Run Seeder
```bash
# Run the seeder to import all schools
npm run seed
# or
npm run tsx server/db/seeders/seed.ts
```

## Expected Output

```
📚 Starting schools seeding from external_resource/schools.json...
📖 Reading file: /path/to/external_resource/schools.json
✅ Found 40000+ schools to seed
⏳ Progress: 2% (1000/40000 schools)
⏳ Progress: 5% (2000/40000 schools)
⏳ Progress: 7% (3000/40000 schools)
...
⏳ Progress: 100% (40000/40000 schools)

📊 Seeding Summary:
   Total schools in file: 40000+
   Successfully seeded: 40000+
   Errors: 0

✅ Schools seeded successfully from Kenya Ministry of Education data!
```

## Performance Notes

- **Batch Size:** 1000 schools per batch
- **Expected Duration:** 2-5 minutes (depends on database performance)
- **Memory Usage:** Moderate (processes in batches)
- **Database Size:** ~20-30 MB for schools table

## Querying Schools

### Search by County
```typescript
const schools = await db
  .select()
  .from(schools)
  .where(eq(schools.county, "Nairobi"))
  .limit(10);
```

### Search by Level
```typescript
const primarySchools = await db
  .select()
  .from(schools)
  .where(eq(schools.level, "Primary"))
  .limit(10);
```

### Search by Name
```typescript
const schools = await db
  .select()
  .from(schools)
  .where(like(schools.schoolName, "%High%"))
  .limit(10);
```

### Get Nearby Schools (by coordinates)
```typescript
// Note: For production, consider using PostGIS or spatial indexes
const nearbySchools = await db
  .select()
  .from(schools)
  .where(
    and(
      between(schools.xCoord, "36.7", "36.9"),
      between(schools.yCoord, "-1.3", "-1.2")
    )
  );
```

## Geographic Coverage

The dataset covers all 47 counties in Kenya:
- Baringo
- Bomet
- Bungoma
- Busia
- Elgeyo-Marakwet
- Embu
- Garissa
- Homa Bay
- Isiolo
- Kajiado
- Kakamega
- Kericho
- Kiambu
- Kilifi
- Kirinyaga
- Kisii
- Kisumu
- Kitui
- Kwale
- Laikipia
- Lamu
- Machakos
- Makueni
- Mandera
- Marsabit
- Meru
- Migori
- Mombasa
- Murang'a
- Nairobi
- Nakuru
- Nandi
- Narok
- Nyamira
- Nyandarua
- Nyeri
- Samburu
- Siaya
- Taita-Taveta
- Tana River
- Tharaka-Nithi
- Trans Nzoia
- Turkana
- Uasin Gishu
- Vihiga
- Wajir
- West Pokot

## Troubleshooting

### Issue: "File not found"
**Solution:** Ensure `external_resource/schools.json` exists in the project root

### Issue: "Duplicate entry for key 'code'"
**Solution:** Drop and recreate the schools table before re-seeding

### Issue: "Out of memory"
**Solution:** Reduce batch size in `schools.ts` (e.g., from 1000 to 500)

## Next Steps

After seeding, you can:
1. Add school selection in user onboarding
2. Filter book listings by school
3. Show nearby schools based on user location
4. Implement school-based matchmaking for book swaps
