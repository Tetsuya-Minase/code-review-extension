# Project Analysis Orchestrator

You are an expert software architect tasked with deeply understanding and documenting this codebase. Your goal is to create a comprehensive analysis that will be saved in CLAUDE.md for future reference in all development tasks.

## Analysis Process

### Phase 1: Initial Discovery
1. **Project Structure Analysis**
   - Map the directory structure and identify key modules
   - Identify the technology stack and frameworks used
   - Locate configuration files (package.json, tsconfig.json, etc.)
   - Document the build and deployment setup

### Phase 2: Architecture Deep Dive (Chain of Thought Analysis)
Think step-by-step through the following:

2. **Architectural Patterns**
   - What is the overall architecture pattern? (MVC, Microservices, Layered, etc.)
   - How is the code organized? (Domain-driven, Feature-based, Layer-based)
   - What design patterns are implemented? (Repository, Factory, Observer, etc.)
   - Explain the reasoning behind each identified pattern

3. **Dependency Analysis**
   - External dependencies: List all third-party libraries and their purposes
   - Internal dependencies: Map the module dependency graph
   - Identify potential circular dependencies or tight coupling
   - Analyze the dependency injection approach if any

4. **Business Logic Comprehension**
   - Core domain entities and their relationships
   - Key business rules and constraints
   - Critical workflows and data flows
   - API endpoints and their business purposes
   - State management approach

### Phase 3: Technical Details
5. **Code Quality Assessment**
   - Coding conventions and standards used
   - Type safety implementation (TypeScript usage patterns)
   - Error handling strategies
   - Testing approach and coverage

6. **Cross-cutting Concerns**
   - Authentication and authorization implementation
   - Logging and monitoring setup
   - Performance optimization techniques
   - Security measures

### Phase 4: Documentation Generation
7. **Create CLAUDE.md**
   Structure the findings as follows:

```markdown
# Project: [Project Name]

## Executive Summary
[Brief overview of the project, its purpose, and key technologies]

## Architecture Overview
### Pattern: [Identified Pattern]
[Explanation and implementation details]

### Key Components
- **Component A**: [Purpose and responsibilities]
- **Component B**: [Purpose and responsibilities]

## Dependency Map
### External Dependencies
| Package | Version | Purpose | Critical? |
|---------|---------|---------|-----------|
| [name]  | [ver]   | [use]   | Yes/No    |

### Internal Module Structure
```
[ASCII or text-based dependency diagram]
```

## Business Logic Documentation
### Core Entities
1. **[Entity Name]**
   - Purpose: [Description]
   - Key Properties: [List]
   - Business Rules: [List]

### Critical Workflows
1. **[Workflow Name]**
   - Trigger: [What initiates this]
   - Steps: [Numbered list]
   - Output: [Expected result]

## API Reference
### Endpoints
| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| [verb] | [/path] | [desc] | Yes/No |

## Development Guidelines
### Code Standards
- TypeScript: [Specific patterns used]
- Naming Conventions: [Examples]
- File Organization: [Structure]

### Common Patterns
```typescript
// Example of commonly used pattern
[Code example with comments]
```

## Testing Strategy
- Unit Tests: [Framework and approach]
- Integration Tests: [Scope and tools]
- E2E Tests: [Coverage and tools]

## Deployment & Configuration
### Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| [name]   | [desc]  | [value] |

### Build Process
[Steps and commands]

## Known Issues & Technical Debt
1. [Issue description and impact]
2. [Planned improvements]

## Quick Start for New Developers
1. [Setup step]
2. [Common commands]
3. [Key files to understand first]

## Appendix: Complex Logic Explanations
### [Complex Feature Name]
[Detailed explanation with code snippets]
```

## Instructions for Analysis
- Use Chain of Thought reasoning for complex architectural decisions
- When uncertain, list multiple interpretations with probabilities
- Include code snippets for critical implementations
- Focus on "why" behind architectural choices, not just "what"
- Identify both strengths and areas for improvement

## Output Requirements
1. Save all findings in CLAUDE.md in the project root
2. Use clear markdown formatting for easy navigation
3. Include concrete code examples in TypeScript where applicable
4. Ensure the document serves as a single source of truth for project understanding

Begin your analysis with the project structure and proceed systematically through each phase.
