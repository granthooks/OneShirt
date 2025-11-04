# Initialize Memory Bank

You are a specialized agent tasked with initializing the Memory Bank for this project. The Memory Bank is Claude Code's persistent memory system that survives context resets.

## Your Mission

Initialize a complete Memory Bank structure in the `/memory-bank` directory following the hierarchical file system:

```
memory-bank/
├── projectbrief.md         (Foundation - defines project scope)
├── productContext.md       (Why and how the product works)
├── systemPatterns.md       (Architecture and technical patterns)
├── techContext.md          (Technologies and setup)
├── activeContext.md        (Current focus and recent changes)
└── progress.md             (Status and roadmap)
```

## Core Files to Create

### 1. projectbrief.md (REQUIRED - Create First)

**Purpose:** Foundation document that shapes all other files

**Contents:**
- Project vision and goals
- Core concept and mechanics
- User roles and experience goals
- Success criteria
- Unique value propositions
- Brand identity

**Instructions:**
- Analyze the existing codebase to understand the project
- Look at package.json, README.md, and main application files
- Document the fundamental "why" and "what" of the project
- Keep it focused on unchanging core requirements

### 2. productContext.md (REQUIRED)

**Purpose:** Why this project exists and how it works

**Contents:**
- Problems the project solves
- User experience philosophy
- Game mechanics or core workflows
- User journeys
- Design principles
- Monetization strategy (if applicable)
- Competitive advantages

**Instructions:**
- Build upon projectbrief.md
- Focus on the product strategy and UX goals
- Document user flows and interactions
- Explain the product decisions

### 3. systemPatterns.md (REQUIRED)

**Purpose:** System architecture and technical patterns

**Contents:**
- Architecture overview (with mermaid diagrams if helpful)
- Core design patterns in use
- Component architecture
- Data flow patterns
- State management approach
- API patterns
- Testing patterns

**Instructions:**
- Analyze the codebase structure
- Identify key architectural decisions
- Document patterns that developers should follow
- Include diagrams for complex relationships

### 4. techContext.md (REQUIRED)

**Purpose:** Technologies used and development setup

**Contents:**
- Technology stack (frameworks, libraries, versions)
- Development environment setup
- Database schema
- Configuration files (.env, vite.config, etc.)
- API integrations
- File/folder structure
- Development workflow

**Instructions:**
- List all dependencies from package.json
- Document environment variables
- Explain the build and dev setup
- Include database schema if applicable

### 5. activeContext.md (REQUIRED)

**Purpose:** Current work focus and recent changes

**Contents:**
- Recent changes (last 2-4 sessions)
- Current focus areas
- Active considerations and decisions
- Known issues
- Next immediate steps

**Instructions:**
- Start with "Last Updated: [current date]"
- Document the current state of the project
- Note any in-progress work
- Keep this file concise and current-focused

### 6. progress.md (REQUIRED)

**Purpose:** What works and what's left to build

**Contents:**
- Completed features (✅)
- In progress features (⏳)
- Backlog/roadmap (❌)
- Known issues (🐛)
- Technical debt
- Milestone progress

**Instructions:**
- Audit the codebase to understand what's implemented
- Create a comprehensive feature list
- Organize by status (completed, in-progress, planned)
- Include version/milestone information

## Workflow

1. **Check if memory-bank/ directory exists**
   - If not, create it
   - If it exists, check which files are missing

2. **Read existing project documentation**
   - README.md
   - package.json
   - Any existing documentation
   - Main application files

3. **Create files in order:**
   1. projectbrief.md (foundation)
   2. productContext.md (builds on brief)
   3. systemPatterns.md (technical foundation)
   4. techContext.md (technical details)
   5. activeContext.md (current state)
   6. progress.md (status tracking)

4. **Validate completeness**
   - Ensure all 6 core files exist
   - Verify each file has substantial content
   - Check that files reference each other appropriately

5. **Create MEMORY_BANK_README.md**
   - Document the structure
   - Explain how to use each file
   - Include maintenance guidelines

## Quality Standards

- **Be thorough but concise** - Capture essential information without bloat
- **Use markdown effectively** - Headers, lists, code blocks, tables
- **Include dates** - "Last Updated" at the top of each file
- **Cross-reference** - Link related information across files
- **Be specific** - Concrete examples over abstract descriptions
- **Think hierarchically** - Foundation files inform dependent files

## Success Criteria

✅ All 6 core files created with substantial content
✅ Files follow the defined structure and purpose
✅ Information is current and accurate
✅ Files build upon each other logically
✅ MEMORY_BANK_README.md exists with usage guide
✅ Project can be understood by reading the Memory Bank alone

## Important Notes

- If files already exist, DO NOT overwrite them. Instead, check their completeness and suggest updates.
- The Memory Bank should allow someone (including Claude after a reset) to understand the ENTIRE project without needing to read the codebase.
- Focus on capturing the "why" and "how" decisions, not just listing features.
- This is Claude Code's ONLY persistent memory - make it comprehensive.

---

**Your task:** Create a complete, high-quality Memory Bank that enables effective project continuity across context resets.
