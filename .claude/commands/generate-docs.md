# Documentation Generator

You are an expert technical writer tasked with generating comprehensive project documentation based on README.md content and orchestrator analysis results. Your goal is to create structured, detailed documentation in the docs directory that serves different stakeholders and use cases.

## Objective

Generate comprehensive project documentation with the following granularity:

1. **Functional Requirements** - Business requirements and feature specifications
2. **Technical Specifications** - Architecture and implementation details  
3. **Developer Guide** - Development environment setup and operational procedures
4. **API Specifications** - Endpoints and data formats
5. **Testing Documentation** - Test strategy and quality assurance

## Process Overview

### Phase 1: Pre-Analysis and Preparation

1. **Project Analysis Execution**
   - Execute `/project:orchestrator` command to gather project analysis
   - Read and parse README.md content
   - Review existing documentation structure
   - Identify project type and technology stack

2. **Documentation Strategy Determination**
   - Determine document structure based on project nature
   - Organize information by target audience (developers, architects, operators)
   - Define inter-document dependencies and relationships

### Phase 2: Document Generation

3. **Functional Requirements Generation** (`docs/requirements/functional-requirements.md`)
   - User stories and acceptance criteria
   - Feature list with priority levels
   - Business rules and constraints
   - User interface requirements
   - Integration requirements

4. **Technical Specifications Generation** (`docs/technical/architecture.md`)
   - System architecture overview
   - Component design and data flow
   - Technology selection rationale and alternatives
   - Security and performance requirements
   - Infrastructure and deployment considerations

5. **Developer Guide Generation** (`docs/development/developer-guide.md`)
   - Environment setup procedures
   - Coding standards and best practices
   - Debugging and troubleshooting procedures
   - Contribution guidelines
   - Development workflow

6. **API Specifications Generation** (`docs/api/api-specification.md`)
   - Endpoint details and parameters
   - Request/response formats
   - Error handling specifications
   - Authentication and authorization
   - Rate limiting and usage guidelines

7. **Testing Documentation Generation** (`docs/testing/test-strategy.md`)
   - Testing strategy and approach
   - Test case design methodology
   - Quality metrics and acceptance criteria
   - Continuous integration setup
   - Performance and security testing

### Phase 3: Document Integration and Optimization

8. **Navigation Structure Creation**
   - Generate document index (`docs/README.md`)
   - Set up cross-references and links
   - Implement searchable structure
   - Create quick navigation paths

9. **Quality Assurance and Review**
   - Content consistency verification
   - Link validation
   - Readability improvements
   - Diagram and code example optimization

## Document Structure

```
docs/
├── README.md                          # Documentation index and navigation
├── requirements/
│   ├── functional-requirements.md     # Functional requirements
│   ├── non-functional-requirements.md # Non-functional requirements
│   └── business-rules.md              # Business logic and rules
├── technical/
│   ├── architecture.md               # System architecture
│   ├── database-design.md            # Database design (if applicable)
│   ├── security.md                   # Security specifications
│   └── performance.md                # Performance specifications
├── development/
│   ├── developer-guide.md            # Developer setup and guidelines
│   ├── coding-standards.md           # Coding conventions
│   ├── deployment.md                 # Deployment procedures
│   └── troubleshooting.md            # Common issues and solutions
├── api/
│   ├── api-specification.md          # API documentation
│   ├── authentication.md             # Authentication methods
│   └── examples/                     # API usage examples
└── testing/
    ├── test-strategy.md              # Testing approach
    ├── test-cases.md                 # Test case specifications
    └── quality-assurance.md          # QA processes
```

## Implementation Steps

### Step 1: Gather Analysis Data
- Execute orchestrator command to get comprehensive project analysis
- Parse README.md for existing project information
- Review current codebase structure and patterns
- Identify key stakeholders and their documentation needs

### Step 2: Create Documentation Structure
- Create docs directory and subdirectories
- Set up templates for each document type
- Establish naming conventions and formatting standards

### Step 3: Generate Individual Documents
- Use analysis data to populate document templates
- Inject project-specific information and examples
- Create cross-reference links between documents
- Include relevant code snippets and diagrams

### Step 4: Create Index and Navigation
- Generate comprehensive docs/README.md
- Set up navigation between documents
- Create quick-start guides for different user types
- Add search and discovery mechanisms

## Quality Assurance Standards

- **Consistency**: Unified formatting and terminology across all documents
- **Completeness**: Comprehensive coverage without information gaps
- **Clarity**: Appropriate technical depth for target audience
- **Maintainability**: Easy-to-update structure and content organization
- **Accuracy**: Verified information with working examples

## Document Content Guidelines

### Functional Requirements
- User-centric feature descriptions
- Business value and impact analysis
- Acceptance criteria with measurable outcomes
- Priority and dependency mapping

### Technical Specifications
- Architecture diagrams and component relationships
- Technology stack rationale and trade-offs
- Security architecture and threat model
- Performance requirements and scalability considerations

### Developer Guide
- Step-by-step setup instructions
- Development workflow and best practices
- Common development scenarios and solutions
- Code quality and testing guidelines

### API Documentation
- Complete endpoint reference with examples
- Authentication and authorization flows
- Error response formats and handling
- SDK usage examples and tutorials

### Testing Documentation
- Test pyramid and strategy explanation
- Test environment setup and data management
- Automated testing pipeline configuration
- Quality gates and release criteria

## Execution Instructions

1. **Analyze Project Structure**
   - Run orchestrator analysis
   - Parse existing documentation
   - Identify project characteristics and requirements

2. **Generate Document Framework**
   - Create directory structure
   - Set up document templates
   - Establish cross-reference system

3. **Populate Content**
   - Generate each document using analysis data
   - Include project-specific examples and configurations
   - Validate technical accuracy and completeness

4. **Finalize and Optimize**
   - Create navigation and index
   - Verify all links and references
   - Optimize for readability and discoverability

Begin by running the orchestrator analysis to gather comprehensive project information, then proceed systematically through each documentation phase.