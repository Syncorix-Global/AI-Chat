import { defineConfig } from "vitepress";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isGitHubCI = !!process.env.GITHUB_ACTIONS;
const autoBase = isGitHubCI && repoName ? `/${repoName}/` : "/";

export default defineConfig({
  title: "Syncorix AI Chat SDK",
  description:
    "Type-safe Socket.IO SDK for building real-time AI chat UIs in the browser: streaming tokens, typing indicators, presence, and resilient reconnects.",
  base: process.env.DOCS_BASE || autoBase,
  head: [["link", { rel: "icon", href: "/logo.png" }]],
  themeConfig: {
    logo: "/logo.png",
    nav: [
      { text: "Guide", link: "/guide/overview" },
      { text: "Socket", link: "/socket/overview" },
      { text: "Typing", link: "/typing/overview" },
      { text: "Playground", link: "/playground" },
      { text: "Contribute", link: "/guide/contributing" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Overview", link: "/guide/overview" },
            { text: "Getting Started", link: "/guide/getting-started" },
          ],
        },
      ],
      "/socket/": [
        {
          text: "Socket",
          items: [
            { text: "Overview", link: "/socket/overview" },
            { text: "Chat Events (contract)", link: "/socket/chat-events" },
            { text: "SocketService (base)", link: "/socket/socket-service" },
            {
              text: "AIChatSocket (high-level)",
              link: "/socket/ai-chat-socket",
            },
          ],
        },
      ],
      "/typing/": [
        {
          text: "Typing",
          items: [
            { text: "Overview", link: "/typing/overview" },
            { text: "TypingObserver API", link: "/typing/typing-observer" },
          ],
        },
      ],
      "/": [
        {
          text: "Playground",
          items: [
            { text: "Local Playground & Mock Server", link: "/playground" },
          ],
        },
        {
          text: "Contribute",
          items: [{ text: "How to Contribute", link: "/guide/contributing" }],
        },
      ],
    },
    socialLinks: [
      // { icon: 'github', link: 'https://github.com/...' }
    ],
    footer: {
      message: "MIT Licensed",
      copyright: "© " + new Date().getFullYear() + " Syncorix",
    },
  },
});
