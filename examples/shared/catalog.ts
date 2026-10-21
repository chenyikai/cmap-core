export const demos = [
  ['overview', '综合演示', '业务场景', '船舶、轨迹、标绘与文本标签协同使用。', 'examples'],
  ['map', 'CMap 地图', '业务模块', '初始化、相机控制、底图切换与生命周期。', 'map'],
  ['ship', 'Ship 船舶', '业务模块', 'AIS 船位、真实船体、转向小弯与增量刷新。', 'ship'],
  ['track', 'Track 轨迹', '业务模块', '分组加载轨迹、时间标签与悬停事件。', 'track'],
  ['tooltip', 'Tooltip 标签', '业务模块', 'Canvas 文本、DOM 交互与自动避让。', 'tooltip'],
  ['point', 'Point 圆点', '标绘模块', '创建、移动、编辑、显隐与导出。', 'plot'],
  ['index-point', 'IndexPoint 序号点', '标绘模块', '带序号的圆点与交互编辑。', 'plot'],
  ['icon-point', 'IconPoint 图标点', '标绘模块', '注册 SVG 图标并配置图标锚点。', 'plot'],
  ['line', 'Line 折线', '标绘模块', '交互绘线、拖拽顶点与插入中点。', 'plot'],
  ['arrow-line', 'ArrowLine 箭头线', '标绘模块', '起终点、方向箭头与节点编辑。', 'plot'],
  ['index-line', 'IndexLine 序号线', '标绘模块', '有序节点及插入后的编号同步。', 'plot'],
  ['fill', 'Fill 多边形', '标绘模块', '区域填充、边界编辑与 GeoJSON 导出。', 'plot'],
  ['circle', 'Circle 圆形', '标绘模块', '米制半径、两点绘圆与控制点编辑。', 'plot'],
  ['resources', 'ResourceRegister', '基础能力', '资源注册、差量更新、删除和状态。', 'resources'],
  ['icons', 'IconManager', '基础能力', '异步加载图标、检查结果与资源复用。', 'utilities'],
  ['focus', 'Focus 聚焦框', '基础能力', '为点、线、面添加独立聚焦边框。', 'utilities'],
  ['collision', 'Collision 碰撞', '基础能力', '候选矩形避让与 CollisionItem 结果。', 'utilities'],
  ['cache', 'Cache 缓存', '基础能力', '内存同步读取与 IndexedDB 持久化。', 'utilities'],
  ['events', 'EventManager', '扩展能力', '按图层和 Feature ID 分发事件。', 'extensions'],
  ['module', 'Module 自定义模块', '扩展能力', '继承生命周期，封装自有地图业务。', 'extensions'],
  ['context', 'Context 上下文', '扩展能力', '通过 Module 使用同一地图的共享服务。', 'extensions'],
  [
    'event-state',
    'EventState 事件状态',
    '扩展能力',
    '开启、关闭和销毁自定义地图交互。',
    'extensions',
  ],
].map(([id, title, group, description, guide]) => ({ id, title, group, description, guide }))

export const guides = [
  ['README', '文档导航'],
  ['getting-started', '安装与快速接入'],
  ['map', '地图与生命周期'],
  ['ship', '船舶接入'],
  ['track', '轨迹接入'],
  ['plot', '标绘与编辑'],
  ['tooltip', '文本与交互标签'],
  ['resources', '数据源与图层'],
  ['utilities', '图标 聚焦 碰撞 缓存'],
  ['extensions', '事件与自定义扩展'],
  ['examples', 'Demo 运行与部署'],
  ['faq', '常见问题与约束'],
].map(([id, title]) => ({ id, title }))

export const base = import.meta.env.BASE_URL
export const exampleURL = (id: string) => `${base}examples/${id}/index.html`
export const guideURL = (id: string) => `${base}examples/index.html?guide=${encodeURIComponent(id)}`
