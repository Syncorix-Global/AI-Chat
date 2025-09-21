// docs/.vitepress/config.ts
import { defineConfig } from "vitepress";

export default defineConfig({
  // REQUIRED for GitHub Pages project site: https://syncorix-global.github.io/AI-Chat/
  base: "/AI-Chat/",
  title: "Syncorix AI Chat SDK",
  description: "Type-safe Socket.IO SDK for real-time AI chat UIs",

  // If you reference assets manually, use the base-prefixed path:
  head: [["link", { rel: "icon", href: "/AI-Chat/logo.png" }]],

  themeConfig: {
    logo: "/AI-Chat/logo.png",
    nav: [
      { text: "Overview", link: "/overview" },
      { text: "Getting Started", link: "/getting-started" },
      { text: "Socket", link: "/socket/overview" },
      { text: "Typing", link: "/typing/overview" },
      { text: "Contributing", link: "/contributing" },
      { text: "Playground", link: "/playground" }
    ],
    sidebar: {
      "/": [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/overview" },              // docs/overview.md
            { text: "Getting Started", link: "/getting-started" }, // docs/getting-started.md
            { text: "Contributing", link: "/contributing" }       // docs/contributing.md
          ]
        },
        {
          text: "Socket",
          items: [
            { text: "Socket Overview", link: "/socket/overview" },           // docs/socket/overview.md
            { text: "Chat Events (contract)", link: "/socket/chat-events" }, // docs/socket/chat-events.md
            { text: "SocketService (base)", link: "/socket/socket-service" },// docs/socket/socket-service.md
            { text: "AIChatSocket (high-level)", link: "/socket/ai-chat-socket" } // docs/socket/ai-chat-socket.md
          ]
        },
        {
          text: "Typing",
          items: [
            { text: "Typing Overview", link: "/typing/overview" }, // docs/typing/overview.md
            { text: "Typing (entry)", link: "/typing/" }           // docs/typing/index.md
          ]
        }
      ]
    },
    footer: {
      message: "MIT Licensed",
      copyright: `© ${new Date().getFullYear()} Syncorix`
    }
  }
});
