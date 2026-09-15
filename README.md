# Acceptance

基于 Vue 3、TypeScript 和 Vite 的前端项目，使用官方 `vue-ts` 模板初始化。

## 环境要求

Node.js 20.19+ 或 22.12+，使用 npm 管理依赖。

## 本地开发

```bash
npm install
npm run dev
```

打开终端输出的本地地址，默认是 http://localhost:5173。

## 常用命令

```bash
npm run type-check # 检查 TypeScript 和 Vue 组件类型
npm run build      # 类型检查并构建，产物输出到 dist/
npm run preview    # 本地预览构建产物，需先运行 build
```

CI 或根据锁文件重新安装依赖时，使用 `npm ci`。

## 项目结构

```text
public/             静态资源
src/
  assets/           参与构建的资源
  components/       Vue 组件
  App.vue           根组件
  main.ts           应用入口
  style.css         全局样式
index.html          HTML 入口
vite.config.ts      Vite 配置
tsconfig*.json      TypeScript 配置
```

组件使用 `<script setup lang="ts">` 编写。首页保留官方模板示例，后续可从 `src/App.vue` 开始开发。

## 仓库

[334561dfsg/acceptance](https://github.com/334561dfsg/acceptance)
