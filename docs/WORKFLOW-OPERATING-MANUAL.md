# 📘 Vibecode Agent System: Operating Manual (SOP v2.0)

> **System Status:** Enterprise Grade (Level 4 Automation)
> **Orchestration Logic:** Hybrid Fractal Swarm
> **Last Updated:** 2026-02-01

Tài liệu này định nghĩa chính thức cách vận hành 19 Workflows của hệ thống, phân công trách nhiệm cho các AI Model cụ thể, và quy tắc điều phối.

---

## 1. The Core Brain (Routing & Context)

Bộ phận trung tâm chịu trách nhiệm điều phối và duy trì ngữ cảnh.

| Workflow | Role Definition | Primary Model | Trigger Command |
|----------|-----------------|---------------|-----------------|
| **`agent-dispatch.md`** | **The Router**. Phân tích request user và gọi đúng quy trình. | **Python Logic + Gemini Flash** | Auto-trigger on Task |
| **`agent-sync.md`** | **The Memory**. Đồng bộ trạng thái dự án vào `SESSION-LOG` và `CONTEXT-MAP`. | **Gemini 2.5 Flash** | `npm run mem:sync` |
| **`CORE-MODES.md`** | **The Constitution**. Luật lệ tối cao của hệ thống. | **N/A (Static)** | Reference only |

---

## 2. Product Division (Strategy & Definition)

Bộ phận định hình sản phẩm từ ý tưởng đến tài liệu kỹ thuật.

| Workflow | Role Definition | Primary Model | Backup Model |
|----------|-----------------|---------------|--------------|
| **`research.md`** | **Info Gatherer**. Tìm kiếm thông tin Real-time & Knowledge Base. | **Perplexity + Kimi Agent** | Gemini Pro |
| **`strategy.md`** | **Strategic Advisor**. Đánh giá Feasibility, ROI, Legal. | **Gemini 3 Pro** | Claude Opus |
| **`ba-spec.md`** | **Business Analyst**. Chuyển yêu cầu thô sơ thành Specs chi tiết. | **Gemini 3 Pro** | Kimi K2.5 |
| **`prd-creation.md`** | **Product Manager**. Viết PRD chuẩn chỉnh. | **Claude 3.5 Sonnet** | GPT-4o |
| **`ux-design.md`** | **UX Designer**. Phân tích UI, User Flow, Visuals. | **Gemini 3 Flash (Vision)** | GPT-4o |

---

## 3. Engineering Division (Execution & Architecture)

Bộ phận thực thi mã nguồn và kiến trúc.

| Workflow | Role Definition | Primary Model | Backup Model |
|----------|-----------------|---------------|--------------|
| **`architect-design.md`**| **Chief Architect**. Thiết kế System, chọn Tech Stack. | **Claude 3.7 (Thinking)** | O1 Pro |
| **`database-schema.md`** | **DBA**. Thiết kế ERD, SQL Migration. | **Claude 3.5 Sonnet** | GPT-4o |
| **`code-implementation.md`** | **Senior Dev**. Viết Core Logic, Complex Features. | **Claude 3.5 Sonnet** | GPT-4o |
| **`feature-dev.md`** | **Feature Lead**. Quản lý E2E feature lifecycle. | **Gemini 3 Pro** | Claude Sonnet |
| **`parallel-swarm.md`** | **The Swarm**. Thực thi song son (Bulk Tasks). | **Kimi K2.5** | Gemini Flash |

---

## 4. Quality Assurance Division (Gatekeepers)

Bộ phận đảm bảo chất lượng và an toàn.

| Workflow | Role Definition | Primary Model | Backup Model |
|----------|-----------------|---------------|--------------|
| **`code-review.md`** | **Auditor**. Review logic, security, style. | **Claude 3.7 / GPT-4o** | Gemini Pro |
| **`qa-testing.md`** | **Test Engineer**. Viết và chạy Test cases. | **Kimi K2.5 (Bulk Gen)** | Claude Sonnet |
| **`pre-commit.md`** | **Gatekeeper**. Check nhanh trước khi push. | **Gemini Flash / Script** | - |

---

## 5. Operations Division (DevOps)

Bộ phận vận hành và triển khai.

| Workflow | Role Definition | Primary Model | Backup Model |
|----------|-----------------|---------------|--------------|
| **`deploy-backend.md`** | **Cloud Engineer**. Deploy lên Cloud Run/AWS. | **Gemini 2.5 Flash** | GPT-4o |
| **`deploy-production.md`**| **Release Manager**. Quản lý production rollout. | **GPT-4o** | Claude Opus |

---

## 6. Strategic Integration Strategy (Sơ đồ phối hợp)

### Quy tắc "Tam Giác Vàng" (The Golden Triangle Rule)

Để đạt hiệu suất tối đa (Big Tech Level), hệ thống tuân thủ quy tắc phối hợp:

1.  **Gemini (The Brain):** Nắm giữ Context khổng lồ (1M+ tokens). Luôn là người khởi tạo (Start) và tổng hợp (Finish) workflow.
2.  **Claude (The Craftsman):** Thực hiện các tác vụ cần độ chính xác cao, logic phức tạp, code "khó".
3.  **Kimi (The Swarm):** Thực hiện các tác vụ cần khối lượng lớn, song song, lặp lại, hoặc đọc tài liệu dài giá rẻ.

### Ví dụ luồng E2E (End-to-End Flow):

```mermaid
graph TD
    User[User Request] --> Dispatch[Agent Dispatch (Router)]
    
    Dispatch -->|New Feature?| PM[PRD Creation (Claude)]
    PM -->|UX?| Design[UX Design (Gemini Vision)]
    PM -->|Logic?| Arch[Architect (Claude Thinking)]
    
    Arch -->|Big Task?| Split[Task Decomposition (Gemini)]
    Split -->|Bulk Work| Swarm[Parallel Swarm (Kimi)]
    Split -->|Core Logic| Core[Code Impl (Claude)]
    
    Swarm & Core --> Review[Code Review (Claude/GPT-4)]
    Review --> Test[QA Testing (Kimi/Gemini)]
    Test --> Deploy[DevOps (Gemini Flash)]
```

---

## 7. Operational Guidelines (Hướng dẫn vận hành)

### Khi nào dùng `/parallel-swarm`?
*   Số lượng files cần sửa > 5.
*   Công việc có tính lặp (pattern-based).
*   Refactoring diện rộng.
*   Viết Unit Tests.

### Khi nào dùng `/architect-design`?
*   Bắt đầu dự án mới.
*   Thêm module lớn ảnh hưởng toàn hệ thống.
*   Thay đổi Tech Stack.

### Khi nào dùng `/agent-sync`?
*   **BẮT BUỘC** trước khi kết thúc phiên làm việc (End Session).
*   **BẮT BUỘC** sau khi hoàn thành một Milestone lớn.

---

**Vibecode AI System** - *Automating Intelligence, Engineering Future.*
