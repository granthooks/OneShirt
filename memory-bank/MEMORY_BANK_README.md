# Memory Bank Structure

**Last Updated:** 2025-01-04

This project uses a structured memory bank system to maintain context and guide development. The memory bank is split into focused files for easier navigation and maintenance.

---

## 📚 Memory Bank Files

### 1. [projectbrief.md](projectbrief.md)
**Foundation document** that shapes all other files.

**Contains:**
- Project vision and goals
- Core concept and mechanics
- User roles and experience goals
- Success criteria
- Unique value propositions
- Brand identity

**When to reference:**
- Starting new features
- Making strategic decisions
- Defining project scope
- Onboarding new team members

---

### 2. [productContext.md](productContext.md)
**Why this project exists** and how it works.

**Contains:**
- Problems we solve
- User experience philosophy
- Game mechanics design
- User journeys
- Design principles
- Monetization strategy
- Competitive advantages

**When to reference:**
- Designing new features
- Making UX decisions
- Planning user flows
- Product strategy discussions

---

### 3. [activeContext.md](activeContext.md)
**Current work focus** and recent changes.

**Contains:**
- Recent changes and updates
- Current focus areas
- Active considerations
- Known issues
- Next steps
- Recent activity log

**When to reference:**
- Starting a new work session
- Understanding recent changes
- Planning immediate next steps
- Debugging recent issues

**Update frequency:** After each major feature or bug fix

---

### 4. [systemPatterns.md](systemPatterns.md)
**System architecture** and technical patterns.

**Contains:**
- Architecture diagrams
- Core patterns used
- Component architecture
- Data flow patterns
- State management
- Design patterns
- Testing patterns

**When to reference:**
- Implementing new features
- Refactoring code
- Architectural decisions
- Code reviews

---

### 5. [techContext.md](techContext.md)
**Technologies used** and development setup.

**Contains:**
- Technology stack
- Dependencies
- Database schema
- Configuration files
- Environment variables
- API integrations
- File structure
- Development workflow

**When to reference:**
- Setting up development environment
- Adding new dependencies
- Configuring deployments
- Technical documentation

---

### 6. [progress.md](progress.md)
**What works** and what's left to build.

**Contains:**
- Completed features
- Issues fixed
- Known issues
- In progress
- Backlog
- Implementation status
- Milestone progress
- Technical debt

**When to reference:**
- Sprint planning
- Status updates
- Prioritizing work
- Tracking progress

---

## 🔄 Maintenance Guidelines

### When to Update Each File

**projectbrief.md:**
- ⏰ Rarely - only when vision/strategy changes
- Core requirements shift
- New user roles added
- Brand identity changes

**productContext.md:**
- ⏰ Occasionally - when product strategy evolves
- New features planned
- UX philosophy changes
- Monetization model shifts

**activeContext.md:**
- ⏰ Frequently - after each work session
- Features implemented
- Bugs fixed
- Decisions made
- Context shifts

**systemPatterns.md:**
- ⏰ Occasionally - when architecture changes
- New patterns introduced
- Major refactoring
- Architecture decisions

**techContext.md:**
- ⏰ Occasionally - when tech stack changes
- Dependencies updated
- Configuration changes
- New integrations added

**progress.md:**
- ⏰ Frequently - after each feature/fix
- Features completed
- Issues resolved
- Milestones reached
- Backlog changes

---

## 📖 How to Use

### For New Developers

**First Time Setup:**
1. Read `projectbrief.md` - Understand the vision
2. Read `productContext.md` - Understand the product
3. Read `techContext.md` - Set up your environment
4. Read `systemPatterns.md` - Learn the architecture
5. Read `progress.md` - See what's done/todo
6. Read `activeContext.md` - Jump into current work

### For Daily Development

**Starting a Work Session:**
1. Check `activeContext.md` - What's happening now?
2. Check `progress.md` - What's my next task?
3. Reference `systemPatterns.md` - How should I build this?
4. Reference `techContext.md` - What tools do I use?

**Ending a Work Session:**
1. Update `activeContext.md` - What did I change?
2. Update `progress.md` - What did I complete?

### For Feature Planning

1. Reference `projectbrief.md` - Does this align with vision?
2. Reference `productContext.md` - How does this fit the UX?
3. Check `progress.md` - What's the priority?
4. Update `progress.md` - Add to backlog

---

## 🔍 Quick Reference

### Find Information About...

**Vision & Strategy:**
- Project goals → `projectbrief.md`
- User experience → `productContext.md`
- Product strategy → `productContext.md`

**Current State:**
- Recent changes → `activeContext.md`
- What's next → `activeContext.md`
- Known issues → `activeContext.md` or `progress.md`

**Technical Details:**
- Architecture → `systemPatterns.md`
- Tech stack → `techContext.md`
- Database schema → `techContext.md`
- Configuration → `techContext.md`

**Progress:**
- Completed features → `progress.md`
- Backlog → `progress.md`
- Milestones → `progress.md`
- Technical debt → `progress.md`

---

## 🎯 Benefits of This Structure

### Focused Files
- Each file has a clear purpose
- Easy to find specific information
- Less overwhelming than one huge file

### Better Maintenance
- Update only relevant sections
- Clear ownership of content
- Version control friendly

### Improved Navigation
- Quick reference guide
- Logical organization
- Searchable structure

### Team Collaboration
- Different team members can own different files
- Parallel updates possible
- Clear responsibilities

---

## 🔄 Migration from Old MEMORY_BANK.md

The old `MEMORY_BANK.md` has been archived. All content has been:

✅ **Reorganized** into focused files
✅ **Updated** with latest changes
✅ **Enhanced** with additional context
✅ **Structured** for easier maintenance

The old file is kept as `MEMORY_BANK.md.backup` for reference.

---

## 📝 File Format Guidelines

### Headers
Use clear, hierarchical headers (##, ###, ####)

### Sections
Group related information logically

### Dates
Include "Last Updated" dates at the top

### Status Indicators
- ✅ Complete
- ⏳ In Progress
- ❌ Not Started
- 🐛 Bug
- 💡 Idea

### Links
Link between related documents

### Code Examples
Use code blocks with syntax highlighting

---

## 🤝 Contributing

When updating memory bank files:

1. **Read first** - Understand existing content
2. **Update relevant sections** - Don't duplicate
3. **Add dates** - Update "Last Updated"
4. **Be concise** - Clear and to the point
5. **Link related info** - Connect the dots
6. **Review changes** - Ensure accuracy

---

**This structure helps maintain project context and enables effective collaboration across team members and AI assistants.**
