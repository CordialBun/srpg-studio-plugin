# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a plugin repository for SRPG Studio (a Japanese strategy RPG game development tool). All plugins are written by さんごぱん (Sangopan/CordialBun) and extend SRPG Studio's functionality with new gameplay mechanics.

## Code Conventions

### JavaScript Version
- Target ES3 (as specified in jsconfig.json) for maximum compatibility with SRPG Studio
- Avoid modern JavaScript features (arrow functions, const/let, template literals, etc.)

### Plugin Structure Pattern
Every plugin follows this structure:
```javascript
/*-------------------------------------------------
Plugin Name
Version: X.XX
概要: [Overview in Japanese]
使い方: [Usage instructions]
作者: さんごぱん (https://twitter.com/CordialBun)
利用規約: [License terms]
更新履歴: [Update history]
-------------------------------------------------*/

(function() {
    // 設定 (Configuration section)
    var CONFIG = {
        // User-configurable values
    };
    
    // Alias existing functions
    var _OriginalFunction = ClassName.functionName;
    
    // Override functions
    ClassName.functionName = function() {
        // Custom logic
        return _OriginalFunction.call(this);
    };
    
    // Define new objects
    var CustomObject = defineObject(BaseObject, {
        // Object definition
    });
})();
```

### Key Patterns
- Use alias pattern to override SRPG Studio functions: save original function, then override
- Custom parameters are added via `getCustomParameter()`
- Use `defineObject()` to create new object types
- State management often uses numeric state values
- Always wrap plugins in IIFE to avoid global scope pollution

### Code Quality Standards

#### Alias Naming Convention
- **ALWAYS** use `_original_` prefix for aliased functions
- **NEVER** use generic names like `_BaseFunction` or `_Function`
- Example: `var _original_getStateParameter = StateControl.getStateParameter;`

#### JSDoc Documentation Requirements
- **ALL** functions MUST have comprehensive JSDoc comments
- Include `@description`, `@param` with types, `@returns` with type
- For override functions, include `@override` tag
- Example:
```javascript
/**
 * @override
 * @description Brief description of what the function does
 * @param {Object} unit - Description of parameter
 * @param {number} index - Description of parameter  
 * @returns {number} Description of return value
 */
```

#### Code Organization
- Group related functions with clear section comments using `/*=== Section Name ===*/`
- Standard sections: Configuration, Helper Functions, Core Logic, UI Functions
- Place helper functions before the main functions that use them
- External API functions should be documented at the top

#### Performance Optimization Patterns
- Use **early returns** to avoid deep nesting
- **Inline** frequently called simple operations rather than function calls
- Cache frequently accessed properties in local variables
- Combine multiple type checks into single conditional statements

#### Function Design Principles
- **Single Responsibility**: Each function should have one clear purpose
- **Extract common logic** into reusable helper functions
- **Avoid magic numbers**: Define constants for all numeric values
- **Type safety**: Always validate parameter types before use

### Refactoring Guidelines

When refactoring existing plugin code, follow this systematic approach:

#### Phase 1: Foundation
1. **Rename aliases** to use `_original_` prefix convention
2. **Add JSDoc comments** to all functions with complete type information
3. **Organize code sections** with clear section dividers

#### Phase 2: Code Quality
1. **Extract constants** for all magic numbers and configuration values
2. **Split long functions** following single responsibility principle  
3. **Remove duplicate code** by creating shared helper functions
4. **Add type validation** for all function parameters

#### Phase 3: Performance
1. **Implement early returns** to reduce nesting and improve readability
2. **Inline simple operations** that are called frequently
3. **Cache property access** for frequently used values
4. **Optimize conditional logic** by combining related checks

#### Version Increment
- **ALWAYS** increment the patch version (e.g., 1.00 → 1.01) for refactoring
- Update both the header comment and any README version badges
- Document refactoring changes in update history with **[リファクタリング]** tag

#### Execution Strategy
**DEFAULT APPROACH**: Execute refactoring in phases with user confirmation between each phase.

1. **Execute Phase 1** (Foundation) → Present results → Wait for user approval
2. **Execute Phase 2** (Code Quality) → Present results → Wait for user approval  
3. **Execute Phase 3** (Performance) → Present results → Complete

**Benefits of phased approach**:
- Changes are reviewable at each stage
- Safe progression from foundation → quality → performance
- Can stop at any phase if sufficient
- Educational value by showing incremental improvements

**TodoWrite Integration**: Use TodoWrite to track detailed tasks within each phase and provide progress visibility.

### Code Quality Enforcement

**CRITICAL**: These standards are MANDATORY for all plugin development and maintenance:
- Any code that doesn't follow these patterns should be refactored
- New plugin development MUST implement these standards from the start
- When updating existing plugins, bring them up to current standards
- All alias functions MUST use `_original_` naming convention
- All functions MUST have proper JSDoc documentation

### Standard Plugin Architecture

#### Section Organization Pattern
Follow this standard organization for all plugins:

```javascript
/*=== External API Functions ===*/
// Global functions for other plugins to use

(function() {
    /*=== Configuration ===*/
    // Constants and configuration values
    
    /*=== Helper Functions ===*/
    // Utility functions for internal use
    
    /*=== Core Logic ===*/
    // Main plugin functionality and overrides
    
    /*=== UI Functions ===*/
    // Display and interface related functions
})();
```

#### Helper Function Patterns
- **Accessor functions**: `_getSafeProperty(obj, property, defaultValue)`
- **Validation functions**: `_isValidUnit(unit)`, `_hasRequiredSkill(unit, keyword)`
- **Search functions**: `_findStateByType(unit, stateType)`, `_getSkillsByKeyword(unit, keyword)`
- **Update functions**: `_updateStateValue(turnState, property, value)`

#### Error Handling Patterns
- Always validate object existence before property access
- Use defensive programming with null checks
- Return early for invalid conditions
- Provide meaningful default values for missing data

#### Performance Best Practices
- Cache frequently accessed lists (state lists, skill lists)
- Use direct property access instead of getter functions when safe
- Minimize object creation in frequently called functions
- Group related operations to reduce redundant calculations

## Plugin Dependencies

Some plugins require others to function:
- **ChargeWeapon** requires **WaitTurnSystem**
- **DelayAttack** requires **WaitTurnSystem**
- **RewindTimeSystem** integrates with **WaitTurnSystem** if present

## Plugin README Standard Format

When creating or updating plugin README files, **ALWAYS** follow the established standard format.

### Mandatory Application Rules
- **New README creation**: MUST use this standard format
- **Existing README updates**: SHOULD align with standard format whenever possible
- **Reference examples**: Plugin/SpeedTaker/README.md and Plugin/BreakSystem/README.md
- **Template file**: Plugin/README-TEMPLATE.md

### Required Structure Elements
1. **English title**: `[PluginName] Plugin for SRPG Studio`
2. **Three badges**: Version (linking to update history), SRPG Studio version, Author
3. **Emoji section headers**: Use consistent emoji prefixes for all main sections
4. **Complete table of contents**: With emoji links to all sections
5. **Practical examples section**: Include scenario-based usage examples
6. **API specification section**: For technical integration details
7. **Technical specification section**: Architecture, optimization, code quality info
8. **Unified license format**: Follow the established license structure

### Standard Section Order
📋 Table of Contents → 📖 Overview → ⚙️ Features → 🚀 Installation → 🔧 Setup Method → 🎯 Configuration Examples → 💡 Practical Examples → 🎮 Advanced Usage → 🔌 API Specification → 🛠️ Troubleshooting → ⚡ Technical Specification → 📜 License → 👤 Author → 📝 Update History → 🆘 Support → 🙏 Acknowledgments

### Key Format Requirements
- Use ✅ checkmarks for feature lists
- Include detailed scenario-based examples in "Practical Examples" section
- Provide table format for configuration options
- Include architecture diagrams in technical specifications
- Maintain consistent emoji usage throughout
- Ensure all internal links work properly

### SRPG Studio UI Accuracy Requirements
**CRITICAL**: All plugin READMEs MUST use exact SRPG Studio UI terminology, not approximations or assumptions.

#### Required UI Terminology
- **Menu Navigation**: Use `データ設定` (NOT `データベース`) for database access
- **Button Names**: Use exact button text:
  - 「ステートの作成」for creating states
  - 「スキルの作成」for creating skills
  - 「武器の作成」for creating weapons (when applicable)
- **Navigation Paths**: Use exact menu hierarchy as it appears in software

#### Documentation Quality Standards
- Reference actual SRPG Studio software for all UI element names
- Never guess or approximate menu/button names
- Verify navigation paths match the actual software interface
- Maintain consistency with established accurate terminology

### When NOT to deviate
This format should be applied consistently across all plugin READMEs to maintain professional consistency and user experience. Only deviate for plugins with significantly different requirements (e.g., dependency-only plugins).

## CoreScript Directory

The CoreScript directory contains SRPG Studio's base scripts. When developing plugins:
- Reference these files to understand the functions you're overriding
- Look for the original implementation before creating aliases
- Common integration points: attack/, map/, screen/, utility/

## Important Notes

- All documentation and comments are in Japanese
- No build process exists - plugins are loaded directly by SRPG Studio
- Plugins modify game behavior by overriding core functions
- Each plugin is self-contained in its own directory under Plugin/
- Image assets for plugins go in subdirectories (e.g., WaitTurnImage/)

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

## Plugin README Standard Format Compliance
CRITICAL: When creating or updating any plugin README file, you MUST follow the established standard format documented in the "Plugin README Standard Format" section above. This includes:
- Using the exact section structure with emoji prefixes
- Including all mandatory sections (📋目次, 📖概要, ⚙️機能, etc.)
- Following the reference examples in Plugin/SpeedTaker/README.md and Plugin/BreakSystem/README.md
- Using the template in Plugin/README-TEMPLATE.md as a starting point for new READMEs
- Ensuring consistent emoji usage, table formats, and architecture documentation
This is a project-wide standard and deviation is only allowed for exceptional cases.