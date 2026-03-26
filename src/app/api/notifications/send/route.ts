A2V Fitnes

Full-stack gym member management system built with **Next.js 14**, **Prisma**, **Tailwind**, **shadcn/ui**.

## Features
- Member CRUD (add, edit, delete, search)
- Membership tracking with progress bars
- WhatsApp notifications (local service)
- Dashboard stats & charts
- Responsive neon UI

## Local Development
```
bun install
bun run db:generate
bun dev
```

**Services:**
- Notification: `Set-Location mini-services/notification-service; bun dev`
- WhatsApp: `Set-Location mini-services/whatsapp-service; bun dev` → scan QR

## Production (Vercel)
- Add `DATABASE_URL` env var (MongoDB Atlas)
- WhatsApp local-only - disabled in prod UI
- Standalone build ready (`next.config.ts`)

## Deploy
- Vercel: https://a2v-gym-management.vercel.app/
- GitHub: https://github.com/Lakshyaprajapat6990/gym-management-app

**Auto-deploys** on git push!

