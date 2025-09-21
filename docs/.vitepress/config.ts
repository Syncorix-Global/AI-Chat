// docs/.vitepress/config.ts
import { defineConfig } from "vitepress";

const repoFromCI =
  (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.split("/")[1]) || "AI-Chat";

const base = process.env.BASE_PATH || `/${repoFromCI}/`;

export default defineConfig({
  title: "Syncorix AI Chat SDK",
  description:
    "Type-safe Socket.IO SDK for building real-time AI chat UIs in the browser: streaming tokens, typing indicators, presence, and resilient reconnects.",
  base,
  head: [["link", { rel: "icon", href: "/logo.png" }]],
  themeConfig: {
    logo: "/logo.png",
    nav: [
      { text: "Overview", link: "/overview" },
      { text: "Getting Started", link: "/getting-started" },
      { text: "Socket", link: "/socket/overview" },
      { text: "Typing", link: "/typing/overview" },
      { text: "Contributing", link: "/contributing" },
      { text: "Playground", link: "/playground" }, // static page you added to merged output
    ],
    sidebar: {
      "/socket/": [
        {
          text: "Socket",
          items: [
            { text: "Overview", link: "/socket/overview" },
            { text: "Chat Events (contract)", link: "/socket/chat-events" },
            { text: "SocketService (base)", link: "/socket/socket-service" },
            { text: "AIChatSocket (high-level)", link: "/socket/ai-chat-socket" },
          ],
        },
      ],
      "/typing/": [
        {
          text: "Typing",
          items: [
            { text: "Overview", link: "/typing/overview" },
            // enable when you add file: { text: "TypingObserver API", link: "/typing/typing-observer" },
          ],
        },
      ],
      "/": [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/overview" },
            { text: "Getting Started", link: "/getting-started" },
            { text: "Contributing", link: "/contributing" },
          ],
        },
      ],
    },
    socialLinks: [
      // { icon: "github", link: "https://github.com/Syncorix-Global/AI-Chat" }
    ],
    footer: {
      message: "MIT Licensed",
      copyright: "© " + new Date().getFullYear() + " Syncorix",
    },
  },
});
