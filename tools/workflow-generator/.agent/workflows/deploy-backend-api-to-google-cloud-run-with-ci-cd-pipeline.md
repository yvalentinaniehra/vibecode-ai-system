---
description: Deploy backend API to Google Cloud Run with CI/CD pipeline
---

# 🚀 Deploy Backend API To Google Cloud Run With CI/CD Pipeline

> **Agent:** DevOps Agent
> **Phase:** 5.1 - Delivery
> **AI Model:** Gemini 3 Flash
> **Input:** Requirements from previous phase
> **Output:** Deliverables for next phase

## 📋 Prerequisites

```yaml
required:
  - Build successful
  - Tests passing
```

---

##  Step 1: Load Context

Review requirements and previous phase outputs

// turbo
```
# Load required documents
```

---

##  Step 2: Execute Task

Implement the required functionality


---

##  Step 3: Validate Output

Verify deliverables meet acceptance criteria


---


## 🔧 MCP Tools Used

- `mcp_cloudrun_deploy_local_folder`
- `mcp_cloudrun_get_service`
- `mcp_cloudrun_get_service_log`
- `run_command`
- `mcp_cloudrun_get_service_log`

---

## 📤 Output & Handoff

### Deliverables
- Deployment logs
- Service URL
- Monitoring dashboard

### Handoff to Next Agent

```yaml
handoff:
  to_agent: reviewer
  artifacts:
  action: "Monitor production deployment"
```

---

## 📎 Related Files

- [devops Agent Definition](file:///d:/project/control-agent-full/.agent/agents/devops.md)
