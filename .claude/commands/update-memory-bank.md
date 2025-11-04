# Update Memory Bank

You are a specialized agent tasked with updating the Memory Bank for this project. The Memory Bank is Claude Code's persistent memory system that survives context resets.

## Your Mission

Review ALL memory bank files and update them to reflect the current state of the project. This is CRITICAL after significant changes or when explicitly requested.

## Core Principle

**IMPORTANT:** When this command is triggered, you MUST review EVERY memory bank file, even if some don't require updates. This ensures nothing is missed and the memory bank stays coherent.

## Files to Review (In Order)

### 1. projectbrief.md
**Review Focus:** Has the core vision or requirements changed?

**Rarely updated** - Only update if:
- Core requirements shifted
- New user roles added
- Project vision evolved
- Brand identity changed

**Actions:**
- ✅ Read the entire file
- ✅ Verify alignment with current project
- ✅ Update only if fundamentals changed
- ✅ Update "Last Updated" date if modified

---

### 2. productContext.md
**Review Focus:** Has the product strategy or UX philosophy changed?

**Occasionally updated** - Update if:
- New features planned with different UX patterns
- User journey modifications
- Monetization model shifts
- Product strategy evolved

**Actions:**
- ✅ Read the entire file
- ✅ Check if recent changes affect product strategy
- ✅ Update user journeys if workflows changed
- ✅ Update design principles if new patterns emerged
- ✅ Update "Last Updated" date if modified

---

### 3. systemPatterns.md
**Review Focus:** Has the architecture or design patterns changed?

**Occasionally updated** - Update if:
- New architectural patterns introduced
- Major refactoring occurred
- Component structure changed
- New technical patterns adopted

**Actions:**
- ✅ Read the entire file
- ✅ Check if new patterns are being used
- ✅ Update architecture diagrams if structure changed
- ✅ Add new patterns to the documented list
- ✅ Update "Last Updated" date if modified

---

### 4. techContext.md
**Review Focus:** Has the tech stack or configuration changed?

**Occasionally updated** - Update if:
- Dependencies added/removed/upgraded
- Configuration files modified
- New integrations added
- Database schema changed
- Environment variables changed

**Actions:**
- ✅ Read the entire file
- ✅ Check package.json for dependency changes
- ✅ Verify environment variables are documented
- ✅ Update database schema if modified
- ✅ Document new integrations or APIs
- ✅ Update "Last Updated" date if modified

---

### 5. activeContext.md ⭐ (HIGH PRIORITY)
**Review Focus:** What has changed recently? What's happening now?

**Frequently updated** - Update after:
- Features implemented
- Bugs fixed
- Decisions made
- Work sessions completed
- Context shifts

**Actions:**
- ✅ Read the entire file
- ✅ **MUST UPDATE** with recent changes
- ✅ Move older "recent changes" to an archive section
- ✅ Update "Current Focus" section
- ✅ Document new "Active Considerations"
- ✅ Update "Known Issues" list
- ✅ Define clear "Next Steps"
- ✅ **ALWAYS** update "Last Updated" date

**Structure to maintain:**
```markdown
# Active Context

**Last Updated:** [CURRENT DATE]

## Recent Changes

[Last 2-4 work sessions, most recent first]

### [Date] - [Change Title]
- What changed
- Why it changed
- Impact on project

## Current Focus

[What we're working on RIGHT NOW]

## Active Considerations

[Open questions, decisions to make, trade-offs being evaluated]

## Known Issues

- 🐛 [Issue description]

## Next Steps

1. [Immediate next action]
2. [Following action]
...
```

---

### 6. progress.md ⭐ (HIGH PRIORITY)
**Review Focus:** What's complete? What's left to do?

**Frequently updated** - Update after:
- Features completed
- Issues resolved
- Milestones reached
- Backlog changes
- New bugs discovered

**Actions:**
- ✅ Read the entire file
- ✅ Move completed items from "In Progress" to "Completed"
- ✅ Add newly completed features to "Completed Features"
- ✅ Update "In Progress" with current work
- ✅ Add new items to backlog if planned
- ✅ Update "Known Issues" section
- ✅ Update milestone progress
- ✅ **ALWAYS** update "Last Updated" date

**Structure to maintain:**
```markdown
# Progress

**Last Updated:** [CURRENT DATE]

## ✅ Completed Features

[Organized by category or chronologically]

## ⏳ In Progress

[Currently being worked on]

## 📋 Backlog

[Planned but not started]

## 🐛 Known Issues

[Bugs and problems to fix]

## 🏗️ Technical Debt

[Code that needs refactoring or improvement]

## 📊 Milestones

[Major version or release progress]
```

---

## Workflow

### Step 1: Read ALL Files
```bash
# Read every file in memory-bank/
- projectbrief.md
- productContext.md
- systemPatterns.md
- techContext.md
- activeContext.md
- progress.md
```

### Step 2: Analyze Current State
- What changes have occurred since last update?
- What features were implemented?
- What bugs were fixed?
- What decisions were made?
- What's currently being worked on?

### Step 3: Update Files (Priority Order)
1. **activeContext.md** (ALWAYS update)
   - Add recent changes
   - Update current focus
   - Refresh next steps

2. **progress.md** (ALWAYS update)
   - Mark completed items
   - Add new issues
   - Update status

3. **techContext.md** (if applicable)
   - Update dependencies
   - Document new integrations
   - Update schema

4. **systemPatterns.md** (if applicable)
   - Document new patterns
   - Update architecture

5. **productContext.md** (if applicable)
   - Update user journeys
   - Add new features to strategy

6. **projectbrief.md** (rarely)
   - Only if core vision changed

### Step 4: Cross-Reference Check
- Ensure files don't contradict each other
- Verify references between files are accurate
- Check that recent changes are reflected across relevant files

### Step 5: Report Summary
Provide a clear summary of what was updated:
```markdown
## Memory Bank Update Summary

**Files Updated:**
- ✅ activeContext.md - Added [summary]
- ✅ progress.md - Marked [features] complete, added [issues]
- ✅ techContext.md - Updated [dependencies]
- ⏭️ systemPatterns.md - No changes needed
- ⏭️ productContext.md - No changes needed
- ⏭️ projectbrief.md - No changes needed

**Key Changes Documented:**
1. [Change 1]
2. [Change 2]
...
```

---

## Quality Standards

- **Be thorough** - Don't skip files because they "seem fine"
- **Be accurate** - Only document what actually exists in the codebase
- **Be current** - Always update "Last Updated" dates when modifying
- **Be specific** - Concrete details over vague descriptions
- **Be organized** - Maintain consistent structure across files
- **Be honest** - Document issues and technical debt, don't hide problems

---

## Special Scenarios

### After Major Feature Implementation
Focus heavily on:
- activeContext.md - Document the feature and decisions
- progress.md - Move feature to completed, update status
- systemPatterns.md - Document new patterns if introduced
- techContext.md - Update if dependencies or schema changed

### After Bug Fixes
Focus on:
- activeContext.md - Document what was fixed and how
- progress.md - Remove from "Known Issues", add to recent fixes

### After Architectural Changes
Focus on:
- systemPatterns.md - Document new architecture
- activeContext.md - Explain why the change was made
- progress.md - Track refactoring as completed work

### Routine Maintenance
At minimum:
- activeContext.md - Always update with recent activity
- progress.md - Always update with current status

---

## Critical Reminders

🚨 **MUST READ ALL FILES** - Even if you think some don't need updates
⭐ **ALWAYS UPDATE** activeContext.md and progress.md
📅 **UPDATE DATES** - Change "Last Updated" when files are modified
🔗 **CHECK CONSISTENCY** - Ensure files don't contradict each other
📝 **BE SPECIFIC** - Concrete examples and details, not vague statements

---

## Success Criteria

✅ All 6 core files have been read completely
✅ activeContext.md updated with recent changes
✅ progress.md reflects current project status
✅ Technical files updated if dependencies/architecture changed
✅ All "Last Updated" dates are current for modified files
✅ No contradictions between files
✅ Update summary provided

---

**Your task:** Perform a comprehensive review and update of the Memory Bank to ensure it accurately reflects the current state of the project. This is Claude Code's ONLY persistent memory - keep it accurate and current.
