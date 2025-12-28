# Multi-Child Support Implementation Guide

## Overview
This feature allows parents to manage multiple children with different grades, enhancing personalized book recommendations and filters.

## ✅ What's Been Implemented

### Backend
1. **Database Schema** ([server/db/schema/index.ts](server/db/schema/index.ts#L102-L134))
   - `children` table with optional name, required grade, manual ordering support
   - Indexes for performance: `parentIdx`, `orderIdx`
   - Future-ready with `userId` field for child sub-accounts

2. **Child Service** ([server/services/child.service.ts](server/services/child.service.ts))
   - CRUD operations: create, read, update, delete children
   - Reorder children manually
   - Migration function for existing `childGrade` data
   - Auto-naming: "My Child" or "Child 1", "Child 2", etc.

3. **API Routes** ([server/routes/children.ts](server/routes/children.ts))
   - `GET /api/children` - List all children
   - `POST /api/children` - Create child
   - `PUT /api/children/:id` - Update child
   - `DELETE /api/children/:id` - Delete child
   - `POST /api/children/reorder` - Reorder children

4. **Migration Script** ([scripts/migrate-child-grades.ts](scripts/migrate-child-grades.ts))
   - Migrates existing `user.childGrade` to children table
   - Creates one child named "My Child" per user with childGrade

### Frontend
1. **Active Child Context** ([client/src/contexts/ActiveChildContext.tsx](client/src/contexts/ActiveChildContext.tsx))
   - Manages active child state (session-based, resets each session)
   - Auto-selects first child on load
   - Provides `children`, `activeChild`, `setActiveChild`

2. **Children Management Component** ([client/src/components/profile/ChildrenManagement.tsx](client/src/components/profile/ChildrenManagement.tsx))
   - Add/edit/delete children
   - Drag-to-reorder support (UI ready, backend implemented)
   - Empty state with call-to-action

3. **Active Child Selector** ([client/src/components/layout/ActiveChildSelector.tsx](client/src/components/layout/ActiveChildSelector.tsx))
   - Navbar dropdown to switch active child
   - Shows "Shopping for: [Child Name] (Grade X)"
   - Hidden if no children

4. **Marketplace Updates** ([client/src/pages/marketplace.tsx](client/src/pages/marketplace.tsx))
   - "My Grade" filter uses `activeChild.grade`
   - Label changes to "[Child Name]'s Grade"
   - Hidden if no children

## 📋 Setup Instructions

### 1. Database Migration
```bash
# Push schema changes to database
npx drizzle-kit push:mysql

# Or manually create the children table using this SQL:
CREATE TABLE children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id VARCHAR(36) NOT NULL,
  name VARCHAR(255),
  grade VARCHAR(50) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  user_id VARCHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_children_parent (parent_id),
  INDEX idx_children_order (parent_id, display_order)
);
```

### 2. Migrate Existing Data
```bash
# Run migration script to migrate existing childGrade data
npx tsx scripts/migrate-child-grades.ts
```

### 3. Add Children Management to Profile Page
In `client/src/pages/profile.tsx`, add the ChildrenManagement component:

```tsx
import { ChildrenManagement } from "@/components/profile/ChildrenManagement";

// Inside the main content area, after Personal Information card:
<div className="space-y-6">
  {/* Personal Information Card */}
  <Card>
    {/* ... existing personal information ... */}
  </Card>

  {/* Add Children Management */}
  <ChildrenManagement />

  {/* ... rest of content ... */}
</div>
```

### 4. Add Active Child Selector to Navbar
In `client/src/components/layout/Navbar.tsx`, import and add the selector:

```tsx
import { ActiveChildSelector } from "./ActiveChildSelector";

// Add in the navbar, typically after the main navigation links:
<div className="hidden md:flex items-center gap-4">
  <ActiveChildSelector />
  {/* ... other navbar items ... */}
</div>
```

## 🎨 Design Decisions

### Naming Strategy
- **Name provided**: Display as-is (e.g., "John")
- **No name provided**: Auto-generate "Child 1", "Child 2", etc.
- **Migration**: Existing users get "My Child"

### Active Child Selection
- **Session-based**: Resets each browser session
- **Auto-select**: First child (by `displayOrder`) selected on load
- **Persistence**: NOT stored in localStorage (as per requirements)

### Marketplace Behavior
- **No children**: "My Grade" filter hidden completely
- **Has children**: Filter uses active child's grade
- **Label**: Dynamic - shows child's name (e.g., "John's Grade")

### Manual Ordering
- Children can be reordered via drag-and-drop (UI shows grip handle)
- First child = default active child each session
- Backend API supports batch reorder

## 🔮 Future Enhancements (Already Prepared)

1. **Child Sub-Accounts**
   - `userId` field ready in schema
   - Children can have their own login (future)
   - Parent manages permissions

2. **Per-Child Data**
   - Favorites per child
   - Order history per child
   - Recommendations per child

3. **Advanced Features**
   - Age-appropriate content filtering
   - Reading level tracking
   - Parent-child book sharing

## 🧪 Testing

### Test the Implementation
1. **Add a child**:
   - Navigate to Profile page
   - Click "Add Child" button
   - Enter name (optional) and grade
   - Verify child appears in list

2. **Switch active child**:
   - Add multiple children
   - Use navbar dropdown to switch
   - Verify "My Grade" filter updates

3. **Marketplace filtering**:
   - Go to Marketplace
   - Click "[Child Name]'s Grade" quick filter
   - Verify books filtered by child's grade

4. **Edit/Delete**:
   - Edit child name and grade
   - Delete a child
   - Verify reordering after deletion

## 📊 API Endpoints

### Children Management
```
GET    /api/children           - List all children for logged-in user
POST   /api/children           - Create new child
GET    /api/children/:id       - Get single child
PUT    /api/children/:id       - Update child
DELETE /api/children/:id       - Delete child
POST   /api/children/reorder   - Batch reorder children
```

### Request/Response Examples

**Create Child**
```json
POST /api/children
{
  "name": "John",      // Optional
  "grade": "Grade 5"   // Required
}

Response:
{
  "message": "Child created successfully",
  "child": {
    "id": 1,
    "parentId": "user-123",
    "name": "John",
    "grade": "Grade 5",
    "displayOrder": 0,
    "displayName": "John",
    "userId": null,
    "createdAt": "2025-12-28T10:00:00Z",
    "updatedAt": "2025-12-28T10:00:00Z"
  }
}
```

**Reorder Children**
```json
POST /api/children/reorder
{
  "childrenOrder": [
    { "id": 2, "displayOrder": 0 },
    { "id": 1, "displayOrder": 1 },
    { "id": 3, "displayOrder": 2 }
  ]
}
```

## 🐛 Troubleshooting

### Children not loading
- Check browser console for API errors
- Verify `/api/children` endpoint returns 200
- Check that ActiveChildProvider wraps your app in App.tsx

### "My Grade" filter not showing
- Verify you have at least one child added
- Check that `activeChild` is not null in context
- Ensure marketplace imports `useActiveChild`

### Migration script fails
- Ensure database connection is working
- Check that `users` table has `childGrade` column
- Verify no existing children entries for migrated users

## 📝 Notes

- **Backward Compatibility**: Old `user.childGrade` field kept for now, can be removed later
- **Performance**: All queries use indexed columns (`parentId`, `displayOrder`)
- **Security**: All routes protected by `authenticateToken` middleware
- **UX**: Empty states encourage users to add children
- **Accessibility**: Proper ARIA labels on all interactive elements

## 🎯 Success Criteria

- ✅ Parents can add multiple children
- ✅ Each child has optional name and required grade
- ✅ Active child selector in navbar
- ✅ Marketplace filters use active child's grade
- ✅ Manual reordering supported
- ✅ No children = normal marketplace browsing
- ✅ Existing users migrated seamlessly
- ✅ Future-ready for child sub-accounts
