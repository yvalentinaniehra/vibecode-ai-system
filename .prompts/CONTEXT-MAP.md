# CONTEXT MAP - Vibecode AI System

**Last Updated:** 2026-02-01
**Current Branch:** main
**Project Status:** Enterprise Grade (Level 4 Automation) - Security Hardening Phase
**Strategy:** "Golden Triangle" (Gemini Brain - Claude Craftsman - Kimi Swarm)

## PROJECT OVERVIEW

Vibecode is a unified AI orchestration system for software development, operating as an autonomous software factory.

**PRIMARY INTERFACES:**
1. **VS Code Extension:** Integrated coding workflow (Primary).
2. **Desktop App (Tauri):** Operations control center.

**Tech Stack:**
- **Desktop:** Tauri 2.x (Rust), React 19, TypeScript, Vite, Zustand
- **AI Engine:** Python 3.13+ (Core orchestration)
- **Workflows:** 19 SOPs defining Product, Engineering, Quality, and Ops.

## CURRENT SPRINT STATUS

### Active Phase: Environment & Security Hardening (Phase 1)
- [x] **Audit:** 19 Workflows audited and mapped.
- [x] **Strategy:** "Golden Triangle" model adopted.
- [x] **Security:** Hardcoded keys purged from MCP config.
- [x] **Optimization:** Unused MCP tools (Pinecone) removed.
- [ ] **Next:** EduCRM Rescue Pilot (Phase 2).

### Completed Milestones
- **Skills Ecosystem MVP:** CRUD, Testing, Export.
- **VS Code Extension:** Production-ready (v1.0).
- **System Optimization:** Security hardening, Dashboard modularization.

### Next Priorities
1. **EduCRM Rescue:** Fix logic errors using Spec-First approach.
2. **Extension Consolidation:** Merge AntiGravity + Vibecode.
3. **Swarm Implementation:** Deploy `swarm_dispatch.py` for Kimi.

## AGENT SYSTEM ARCHITECTURE (SOP v2.0)

### 1. The Golden Triangle
- **Gemini 3 Pro (The Brain):** Strategy, Specs, Orchestration.
- **Claude 3.5 Sonnet (The Craftsman):** Complex Code, Architecture, Review.
- **Kimi K2.5 (The Swarm):** Mass Execution, Testing, Research.

### 2. Workflow Pillars
- **Product:** `research`, `strategy`, `ba-spec`, `prd-creation`, `ux-design`
- **Engineering:** `architect-design`, `database-schema`, `code-implementation`, `feature-dev`, `parallel-swarm`
- **Quality:** `code-review`, `qa-testing`, `pre-commit`
- **Ops:** `deploy-backend`, `deploy-production`

## DEPENDENCIES
- **AI Providers:** Anthropic, Google Gemini, Moonshot AI (Kimi).
- **MCP Tools:** Supabase, GitHub, Sequential Thinking, Perplexity, CloudRun, Figma, NotebookLM.
- **Environment:** Secrets managed in `.env` (Strict Zero-Exposure Policy).

## SCHEMA & DATA
- **Context:** `SESSION-LOG.md` (History), `CONTEXT-MAP.md` (State).
- **Database:** Supabase (for sub-projects like EduCRM).
