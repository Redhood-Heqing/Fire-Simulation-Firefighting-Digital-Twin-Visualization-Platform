# Revit / CAD 模型导入说明

## 推荐路径

前端预留模型路径：

```text
apps/web/public/models/library_complex.glb
apps/web/public/models/library_complex.fbx
```

将 Revit 导出的 GLB 或 FBX 文件放入该位置后，系统启动时会自动尝试加载。若文件不存在，系统自动使用 Three.js 程序化模型。

加载优先级：

1. `library_complex.glb`
2. `library_complex.fbx`
3. 程序化精细模型

## Revit 导出建议

1. 在 Revit 中建立或整理图书馆、附楼、道路、广场、绿化、水体和关键室内空间。
2. 清理过细构件，仅保留演示所需主体体量、楼层、楼梯间、走廊、出口和设备间。
3. 导出 GLB / glTF。
4. 文件命名为 `library_complex.glb`。
5. 放入 `apps/web/public/models/`。
6. 刷新前端页面。

## 自动导出 FBX

本项目已提供 Revit 2025 自动导出插件脚本：

```powershell
.\scripts\export-revit-model.ps1 -RvtPath "D:\档案馆\2 0508.rvt"
```

脚本会：

1. 编译 `tools/RevitAutoExporter` Revit 插件；
2. 将插件注册到当前用户 Revit 2025 Addins 目录；
3. 启动 `D:\Autodesk\Revit 2025\Revit.exe`；
4. 打开指定 `.rvt`；
5. 导出 `apps/web/public/models/library_complex.fbx`；
6. 前端自动加载 FBX。

当前验证结果：

```text
D:\档案馆\2 0508.rvt -> apps\web\public\models\library_complex.fbx
```

已成功导出，文件约 7.77 MB。

## 本机软件情况

- Revit：已安装，`D:\Autodesk\Revit 2025\Revit.exe`
- AutoCAD：当前未发现可用 `acad.exe` 或 `accoreconsole.exe`
- DWG 资料：`D:\档案馆\办公塔楼施工图_t8.dwg`

如果需要使用该 DWG，建议先在可用 CAD/Revit 环境中打开并转为 Revit 模型，再导出 GLB。

## 坐标和比例建议

- 建筑主体中心尽量位于世界坐标原点附近。
- 模型单位建议按米处理。
- 传感器点位使用项目内坐标 `{ x, y, z }`，楼层高度约为 3.6 米。
- 3F 东侧阅览区默认火灾演示点约为 `{ x: 9, y: 11.4, z: -4 }`。
