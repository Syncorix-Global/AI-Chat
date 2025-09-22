import { defineConfig } from "vitepress";

const repoFromCI =
  (process.env.GITHUB_REPOSITORY &&
    process.env.GITHUB_REPOSITORY.split("/")[1]) ||
  "AI-Chat";

const base = process.env.BASE_PATH || `/${repoFromCI}/`; // "/" on previews, "/AI-Chat/" on prod

export default defineConfig({
  base,
  title: "Syncorix AI Chat SDK",
  description: "Type-safe Socket.IO SDK for real-time AI chat UIs",
  head: [["link", { rel: "icon", href: "/logo.png" }]],
  themeConfig: {
    logo: "/logo.png",
    nav: [
      { text: "Overview", link: "intro/overview" },
      { text: "Getting Started", link: "intro/getting-started" },
      {
        text: "Guide",
        items: [
          { text: "Architecture", link: "/guide/architecture" },
          { text: "Examples", link: "/guide/examples" },
          { text: "Testing", link: "/guide/testing" },
          { text: "Full Example", link: "/guide/full-example" },
        ],
      },
      { text: "Socket", link: "/socket/overview" },
      { text: "Typing", link: "/typing/overview" },
      { text: "Playground", link: "/intro/playground" },
      { text: "Contributing", link: "/intro/contributing" },
    ],
    sidebar: {
      "/": [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/intro/overview" },
            { text: "Getting Started", link: "/intro/getting-started" },
            { text: "Contributing", link: "/intro/contributing" },
          ],
        },
        {
          text: "Guide",
          items: [
            { text: "Architecture", link: "/guide/architecture" },
            { text: "Examples", link: "/guide/examples" },
            { text: "Testing", link: "/guide/testing" },
            { text: "Full Example", link: "/guide/full-example" },
          ],
        },
        {
          text: "Socket",
          items: [
            { text: "Socket Overview", link: "/socket/overview" },
            { text: "Chat Events (contract)", link: "/socket/chat-events" },
            { text: "SocketService (base)", link: "/socket/socket-service" },
            {
              text: "AIChatSocket (high-level)",
              link: "/socket/ai-chat-socket",
            },
          ],
        },
        {
          text: "Typing",
          items: [
            { text: "Typing Overview", link: "/typing/overview" },
            { text: "Typing (entry)", link: "/typing/" },
            { text: "TypingObserver", link: "/typing/typing-observer" },
          ],
        },
      ],
    },
    footer: {
      message: "MIT Licensed",
      copyright: `© ${new Date().getFullYear()} Syncorix`,
    },
  },
});
