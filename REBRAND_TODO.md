# Vibetables Rebrand TODO

## Lost Changes to Recover
The following changes were lost during the git reset and need to be reapplied:

1. `packages/shared/src/constants.ts` - Update social links and branding references
2. `packages/shared/src/utils/title.ts` - Change "Conar" to "Vibetables"
3. `packages/ui/src/components/brand/app-logo.tsx` - Replace with smiley face component
4. `packages/ui/src/components/brand/app-logo-square.tsx` - Replace with smiley face component
5. Other uncommitted changes in the working directory

## Complete Rebrand Tasks

### 1. Text Changes: "Conar" → "vibetables"
- [x] Document created
- [x] `packages/shared/src/utils/title.ts` - Tab title
- [x] `packages/shared/src/constants.ts` - Social links, app name
- [x] `apps/desktop/package.json` - App name, description
- [x] `apps/desktop/electron-builder.json` - Product name
- [x] `apps/desktop/index.html` - Page title
- [x] Sign-in and sign-up pages

### 2. Icon Replacement: Conar Logo → Smiley Face
Reference: `/Users/colebenefield/Hex/Hex/UI/SmileyFaceIcon.swift`

- [x] Create animated smiley face component with:
  - Normal state: `: - )`
  - Blink state: `: - )` (eyes closed)
  - Yawn state: `: - O`
  - Human-paced random animations (2-8s delays, 80% blink, 20% yawn)
- [x] Replace `packages/ui/src/components/brand/app-logo.tsx`
- [x] Replace `packages/ui/src/components/brand/app-logo-square.tsx`
- [x] Replace preloader icon in `apps/desktop/index.html`

### 3. Bug Fixes
- [x] Fixed SafeURL crash for invalid connection strings in databases-list.tsx

### 3. Files to Check/Update
- Database queries that reference "conar"
- Component imports from `@conar/*` packages (these are package names, may not need changing)
- User-visible strings in UI components
- Window titles
- Error messages
- Documentation

## Notes
- Package names like `@conar/*` are internal and don't need to change
- Only user-facing mentions need to be "vibetables"
- Smiley should match Hex tray icon style
