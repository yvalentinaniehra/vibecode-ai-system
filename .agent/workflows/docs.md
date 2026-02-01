---
description: Query library documentation via Context7 MCP for real-time, version-specific docs
---

# 📚 Docs Workflow - Context7 MCP Integration

> **Purpose:** Truy xuất documentation của bất kỳ library nào (Next.js, React, Tailwind, etc.) với thông tin real-time và đúng version.
> **MCP Tool:** Context7 (npx -y @upstash/context7-mcp)

---

## 🎯 Khi nào sử dụng?

- Cần tra cứu API documentation của library
- Gặp lỗi liên quan đến breaking changes (version mới)
- Cần code examples chính xác từ docs gốc
- Tránh AI hallucination về syntax cũ

---

## 📋 Cách sử dụng

### Option 1: Inline Prompt (Nhanh nhất)
Thêm `use context7` vào prompt của bạn:

```
use context7 để tìm cách setup middleware trong Next.js 14 App Router
```

### Option 2: Direct Library Query
Gọi trực tiếp với library cụ thể:

```
/docs next.js --topic middleware
/docs react --topic useEffect
/docs tailwindcss --topic dark-mode
```

---

## 🔧 Supported Libraries (43,000+)

| Category | Popular Libraries |
|----------|-------------------|
| **Frontend** | React, Vue, Svelte, Next.js, Nuxt |
| **Styling** | Tailwind CSS, Chakra UI, MUI |
| **Backend** | Express, Fastify, NestJS, Hono |
| **Database** | Prisma, Drizzle, Supabase SDK |
| **Testing** | Jest, Vitest, Playwright |
| **AI/ML** | LangChain, OpenAI SDK, Anthropic SDK |

---

## ⚡ Examples

### Example 1: Next.js Server Actions
```
use context7 to explain Next.js 14 Server Actions with form submission example
```

### Example 2: Tailwind Container Queries
```
use context7 for Tailwind CSS v4 container queries syntax
```

### Example 3: Supabase Auth
```
use context7 to get Supabase Auth signInWithPassword implementation
```

---

## 🛠️ Technical Setup

Context7 MCP được cấu hình trong `settings.json` của IDE:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

---

## ⚠️ Lưu ý

1. **Version Awareness:** Context7 tự động detect version từ `package.json`.
2. **Rate Limits:** Free tier có giới hạn, sử dụng có chọn lọc.
3. **Fallback:** Nếu Context7 không có docs, sử dụng `/research` với Perplexity.

---

## 🔗 Related Workflows

- [/research](./research.md) - Web search cho công nghệ mới
- [/debug](./debug.md) - Debug với systematic approach
