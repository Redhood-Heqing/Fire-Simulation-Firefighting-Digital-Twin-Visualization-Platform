# 火灾模拟与消防数字孪生可视化平台

面向比赛展示、答辩演示和毕业设计的 Web 三维数字孪生平台。系统包含智慧楼宇大屏、三维建筑模型编辑、传感器点位管理、后台数据流、火灾蔓延推演、逃生路线计算和 AI 应急建议。

## 普通网页访问

本项目已支持纯静态网页运行模式。部署到 GitHub Pages 后，访问者不需要安装 Node.js、配置环境变量、启动后端服务或准备 `.env` 文件，直接打开网页即可使用：

```text
https://redhood-heqing.github.io/Fire-Simulation-Firefighting-Digital-Twin-Visualization-Platform/
```

静态网页模式会在浏览器内自动启动模拟后端，提供：

- 模拟 REST API；
- 模拟实时数据流；
- 温湿度、烟雾、能耗、水压、门禁、摄像头、AI 风险数据刷新；
- 模型构件拖动、缩放、拉伸、保存与恢复初始值；
- 传感器新增、拖动、删除与保存；
- 火灾触发、火势蔓延、风险区域和逃生路线；
- 本地浏览器 `localStorage` 持久化。

## GitHub Pages 部署

仓库地址：

```text
https://github.com/Redhood-Heqing/Fire-Simulation-Firefighting-Digital-Twin-Visualization-Platform
```

已内置 GitHub Actions 工作流：

```text
.github/workflows/deploy-pages.yml
```

推送到 `main` 或 `master` 后，Actions 会自动：

1. 安装依赖；
2. 以 `VITE_STATIC_ONLY=true` 构建前端；
3. 使用仓库名作为 Vite base path；
4. 发布 `apps/web/dist` 到 GitHub Pages。

首次使用时，在 GitHub 仓库页面进入：

```text
Settings -> Pages -> Build and deployment -> Source
```

选择：

```text
GitHub Actions
```

之后每次 push 都会自动更新网页。

## 本地完整开发模式

如果本机安装了 Node.js，可以启动完整前后端开发环境：

```bash
npm install
npm run dev
```

访问：

```text
http://localhost:5173/dashboard
```

本地开发模式会优先使用 Express + WebSocket 后端：

```text
http://localhost:3001/api/health
ws://localhost:3001/ws/realtime
```

如果后端不可用，前端会自动降级为浏览器静态模拟模式。

## 本地静态构建测试

PowerShell：

```powershell
$env:VITE_STATIC_ONLY="true"
$env:VITE_BASE_PATH="/Fire-Simulation-Firefighting-Digital-Twin-Visualization-Platform/"
npm --workspace apps/web run build
```

普通本地构建：

```bash
npm run build
```

## 模型和贴图

系统优先加载：

1. `apps/web/public/models/library_complex.glb`
2. `apps/web/public/models/library_complex.fbx`
3. Three.js 程序化精细兜底模型

贴图资源位于：

```text
apps/web/public/textures/
```

当前包含可离线运行的建筑材质贴图，包括混凝土、沥青、草地、水面、金属、玻璃网格和砌体贴图。部分贴图来自 three.js 官方示例资源，其余由项目脚本生成。

重新生成程序化贴图：

```bash
python scripts/generate-procedural-textures.py
```

## Revit 模型导入

将 Revit 模型导出为 GLB 后放入：

```text
apps/web/public/models/library_complex.glb
```

也可以使用项目内置脚本将 `.rvt` 导出为 FBX：

```powershell
.\scripts\export-revit-model.ps1 -RvtPath "D:\档案馆\2 0508.rvt"
```

当前电脑已确认：

- Revit 2025 可用：`D:\Autodesk\Revit 2025\Revit.exe`
- 未发现可用 AutoCAD 主程序

## 重要声明

本系统为演示型辅助决策平台，不能替代正式消防报警系统和专业消防指挥。
