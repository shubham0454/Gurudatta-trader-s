# How to Seed All 315 Dabhadi Users

## Option 1: Using JSON File (Recommended)

1. **Create a file** `scripts/dabhadi-raw-data.json`
2. **Paste your complete JSON array** (all 315 entries) into that file
3. **Run the import script:**
   ```bash
   node scripts/import-dabhadi-data.js
   ```
4. **Seed the database:**
   ```bash
   npm run seed:dabhadi
   ```

## Option 2: Direct Paste

If you paste the complete JSON array here, I can add all 315 entries directly to the seed file.

## Current Status

- ✅ Script is ready to handle all 315 entries
- ✅ Inactive users (status 0 or 2) will be included
- ⚠️ Currently only 116 entries in embedded data
- ❌ Need 199 more entries to reach 315 total

## JSON Format Expected

The JSON should be an array of objects like:
```json
[
  {
    "id": 797020,
    "code": "532",
    "first_name": "श्री विशाल पाटील",
    "last_name": "( सोयगाव )",
    "name_en": "",
    "email": null,
    "mobile": "",
    "status": 0
  },
  ...
]
```

## Notes

- Status mapping: `0` or `2` = inactive, otherwise = active
- All users will be created with `userType: "Dabhadi"`
- User codes will be formatted as `DAB-{code}`

