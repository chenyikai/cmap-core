---
'cmap-core': patch
---

修复 Point、IndexPoint 和 IconPoint 的坐标输入、文字偏移、可见性与聚焦状态同步、创建事件时序及低层级图标尺寸；统一同一地图上的图标缓存，支持外部图标尺寸和名称碰撞配置，减少 Point 生命周期监听器，并在业务监听清空后释放 EventManager 的底层图层事件。
