import { defineConfig } from "vitepress";

const repoFromCI =
  (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.split("/")[1]) || "AI-Chat";

const base = process.env.BASE_PATH || `/${repoFromCI}/`; // "/" on preview, "/AI-Chat/" on prod

export default defineConfig({
  base,
  title: "Syncorix AI Chat SDK",
  description: "Type-safe Socket.IO SDK for real-time AI chat UIs",

  // Leading slash paths are resolved with `base`, so /logo.png -> /<base>/logo.png
  head: [["link", { rel: "icon", href: "/logo.png" }]],

  themeConfig: {
    logo: "/logo.png",

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
            { text: "Overview", link: "/overview" },
            { text: "Getting Started", link: "/getting-started" },
            { text: "Contributing", link: "/contributing" }
          ]
        },
        {
          text: "Socket",
          items: [
            { text: "Socket Overview", link: "/socket/overview" },
            { text: "Chat Events (contract)", link: "/socket/chat-events" },
            { text: "SocketService (base)", link: "/socket/socket-service" },
            { text: "AIChatSocket (high-level)", link: "/socket/ai-chat-socket" }
          ]
        },
        {
          text: "Typing",
          items: [
            { text: "Typing Overview", link: "/typing/overview" },
            { text: "Typing (entry)", link: "/typing/" }
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
