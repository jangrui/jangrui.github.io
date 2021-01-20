const { config } = require("vuepress-theme-hope");
const navBarConfig = require("./config/navbar");
const sideBarConfig = require("./config/sideBar");

module.exports = config({
  title: "Linux 运维笔记",
  description: "运维需要的不是天赋异禀，而是经验丰富！",

  head: [
    // 百度站点验证
    // ["meta", { name: "baidu-site-verification", content: "443cvyi0Je5" }],
    ["script", { src: "https://cdn.jsdelivr.net/npm/react/umd/react.production.min.js" }],
    ["script", { src: "https://cdn.jsdelivr.net/npm/react-dom/umd/react-dom.production.min.js" }],
    ["script", { src: "https://cdn.jsdelivr.net/npm/vue/dist/vue.min.js" }],
    ["script", { src: "https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js" }],
    ["script", { src: "https://cdn.jsdelivr.net/npm/valine/dist/Valine.min.js" }],
  ],

  shouldPrefetch: (filename) => !filename.includes("page-"),

  // base: "/",

  dest: "./dist",

  locales: {
    "/en/": {
      title: "Linux Ops Notes",
      description: "Operater needs not talent, but experience！",
    },
  },

  themeConfig: {
    baseLang: "zh-CN",
    logo: "/logo.svg",
    nav: navBarConfig.zh,
    sidebar: sideBarConfig.zh,
    author: "Jangrui",
    hostname: "https://jangrui.com/",

    locales: {
      "/en/": {
        nav: navBarConfig.en,
        sidebar: sideBarConfig.en,
      },
    },

    blog: {
      intro: "/intro/",
      sidebarDisplay: "mobile",
      links: {
        QQ: "http://wpa.qq.com/msgrd?v=3&uin=279159068&site=qq&menu=yes",
        Gmail: "mailto:jangrui1993@gmail.com",
        Zhihu: "https://www.zhihu.com/people/jangrui",
        Github: "https://github.com/jangrui/",
        Weibo: "https://weibo.com/jangrui1993",
      },
    },

    copyright: {
      status: "global",
    },

    mdEnhance: {
      enableAll: true,
    },

    comment: {
      type: "false",
      owner: "jangrui",
      repo: "notes",
      clientId: "34e80c7b48960f35887a",
      clientSecret: "e58079993f8bbce36136a2589ecf569ea8a77727",
    },

    footer: {
      copyright: "Copyright © 2020-present Jangrui",
      display: true,
    },

    // algolia: {
    //   apiKey: "064a2d15d1a0f7b69df3ef1458d1a510",
    //   indexName: "Jangrui",
    // },

    lastUpdate: {
      timezone: "Asia/Shanghai",
    },

    pwa: {
      favicon: "/favicon.ico",
      themeColor: "#5c92d1",
      apple: {
        icon: "/assets/icon/apple-icon-152.png",
        statusBarColor: "black",
      },
      msTile: {
        image: "/assets/icon/ms-icon-144.png",
        color: "#ffffff",
      },
      manifest: {
        name: "Jangrui 的个人博客",
        short_name: "Jangrui's Blog",
        description: "Jangrui 的个人博客",
        theme_color: "#5c92d1",
        icons: [
          {
            src: "/assets/icon/chrome-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/assets/icon/chrome-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/assets/icon/chrome-mask-192.png",
            sizes: "192x192",
            purpose: "maskable",
            type: "image/png",
          },
          {
            src: "/assets/icon/chrome-mask-512.png",
            sizes: "512x512",
            purpose: "maskable",
            type: "image/png",
          },
        ],
        shortcuts: [
          {
            name: "分类",
            short_name: "分类",
            icons: [
              {
                src: "/assets/icon/category-maskable.png",
                sizes: "192x192",
                purpose: "maskable",
                type: "image/png",
              },
              {
                src: "/assets/icon/category-monochrome.png",
                sizes: "192x192",
                purpose: "monochrome",
                type: "image/png",
              },
            ],
            url: "/category/",
            description: "文章分类分组",
          },
          {
            name: "标签",
            short_name: "标签",
            icons: [
              {
                src: "/assets/icon/tag-maskable.png",
                sizes: "192x192",
                purpose: "maskable",
                type: "image/png",
              },
              {
                src: "/assets/icon/tag-monochrome.png",
                sizes: "192x192",
                purpose: "monochrome",
                type: "image/png",
              },
            ],
            url: "/tag/",
            description: "文章标签分组",
          },
          {
            name: "时间线",
            short_name: "时间线",
            icons: [
              {
                src: "/assets/icon/timeline-maskable.png",
                sizes: "192x192",
                purpose: "maskable",
                type: "image/png",
              },
              {
                src: "/assets/icon/timeline-monochrome.png",
                sizes: "192x192",
                purpose: "monochrome",
                type: "image/png",
              },
            ],
            url: "/timeline/",
            description: "时间线文章列表",
          },
          {
            name: "个人介绍",
            short_name: "个人介绍",
            icons: [
              {
                src: "/assets/icon/about-maskable.png",
                sizes: "192x192",
                purpose: "maskable",
                type: "image/png",
              },
              {
                src: "/assets/icon/about-monochrome.png",
                sizes: "192x192",
                purpose: "monochrome",
                type: "image/png",
              },
            ],
            url: "https://me.jangrui.com/",
            description: "个人介绍",
          },
        ],
      },
      cacheHTML: false,
      maxSize: 2048,
    },

    repo: "https://github.com/jangrui/jangrui.com",
    repoDisplay: false,
    repoIcon: "github",
    repoLabel: "Github",
    docsDir: "docs",
  },
});
