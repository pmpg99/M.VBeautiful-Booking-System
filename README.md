![Capa da Auditoria](img_mvbeautyful.jpg)

# M.VBeautiful - Secure Booking & Management System

A production-ready booking platform designed for beauty professionals, focusing on security, automation, and seamless user experience.

## 🛡️ Security & Infrastructure (Zero Trust)
As a Cybersecurity enthusiast and CEH candidate, I built this project with a "Security-First" mindset:
- **Cloudflare Tunnels (Argo):** The backend home-lab server (running on an HP ProDesk) is accessible without opening any inbound ports on my router. This keeps the local network invisible to the public internet.
- **Identity-Aware Access:** Administrative panels and Nginx Proxy Manager are gated behind Cloudflare Access policies, requiring MFA for remote management.
- **Data Sovereignty:** By hosting the infrastructure on a dedicated local server, I maintain full control over the environment and logs.

## 🚀 Key Features
- **Smart Scheduling:** Advanced availability logic that prevents overbooking by filtering slots per professional.
- **Automated Notifications:** Integration with Resend for high-delivery transactional emails (confirmations and reminders).
- **Hybrid Architecture:** Combining Supabase (Edge Functions & Auth) with a local Docker-based infrastructure.

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend/Auth:** Supabase
- **Networking:** Cloudflare Zero Trust & Nginx Proxy Manager
- **Communications:** Resend API
- **Environment:** Ubuntu Server (Home Lab)

## ⚖️ License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
