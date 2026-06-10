/* ==========================================
   掌上方城 - 模拟数据
   接入Supabase后，这些数据将从后端获取
   ========================================== */

// 圈子数据
const MOCK_CIRCLES = [
  // 地理圈
  { id: 'g1', name: '锦绣家园圈', type: 'geo', emoji: '🏘️', desc: '锦绣家园及周边小区邻居圈', members: 1286, todayPosts: 23, cover: '' },
  { id: 'g2', name: '大柳树村圈', type: 'geo', emoji: '🌳', desc: '大柳树村父老乡亲聚集地', members: 562, todayPosts: 8, cover: '' },
  { id: 'g3', name: '城关老街片儿圈', type: 'geo', emoji: '🏮', desc: '城关老街区的邻里圈子', members: 2108, todayPosts: 45, cover: '' },
  { id: 'g4', name: '新城区邻里圈', type: 'geo', emoji: '🏙️', desc: '新城区各大小区邻居交流', members: 892, todayPosts: 15, cover: '' },
  { id: 'g5', name: '工业园区家属院', type: 'geo', emoji: '🏭', desc: '工业园区职工家属交流圈', members: 345, todayPosts: 6, cover: '' },

  // 兴趣圈
  { id: 'h1', name: '广场舞姐妹圈', type: 'hobby', emoji: '💃', desc: '方城广场舞爱好者的快乐天地', members: 456, todayPosts: 12, cover: '' },
  { id: 'h2', name: '小城宝妈圈', type: 'hobby', emoji: '👶', desc: '方城宝妈交流育儿经', members: 723, todayPosts: 31, cover: '' },
  { id: 'h3', name: '钓鱼佬联盟', type: 'hobby', emoji: '🎣', desc: '分享钓点和渔获的战绩群', members: 234, todayPosts: 9, cover: '' },
  { id: 'h4', name: '方城跑团', type: 'hobby', emoji: '🏃', desc: '一起跑步打卡，健康生活', members: 167, todayPosts: 5, cover: '' },
  { id: 'h5', name: '花花草草爱好者', type: 'hobby', emoji: '🌺', desc: '养花种草，晒晒你家的阳台', members: 312, todayPosts: 18, cover: '' },
  { id: 'h6', name: '吃货小分队', type: 'hobby', emoji: '🍜', desc: '方城美食探店与分享', members: 891, todayPosts: 27, cover: '' },
  { id: 'h7', name: '棋牌乐', type: 'hobby', emoji: '🀄', desc: '象棋、扑克、麻将爱好者', members: 445, todayPosts: 14, cover: '' },

  // 事务圈
  { id: 's1', name: '小城捡便宜', type: 'service', emoji: '🏷️', desc: '超市打折、团购、新店优惠信息', members: 3456, todayPosts: 42, cover: '' },
  { id: 's2', name: '失物招领处', type: 'service', emoji: '🔑', desc: '丢了东西或捡到东西，都来这儿看看', members: 1567, todayPosts: 8, cover: '' },
  { id: 's3', name: '小城零工', type: 'service', emoji: '💼', desc: '招聘、求职、兼职、家政服务', members: 2341, todayPosts: 19, cover: '' },
  { id: 's4', name: '闲置流转', type: 'service', emoji: '🔄', desc: '二手物品买卖，线下自提', members: 1876, todayPosts: 25, cover: '' },
  { id: 's5', name: '拼车信息台', type: 'service', emoji: '🚗', desc: '往返市区、高铁站、机场拼车', members: 923, todayPosts: 11, cover: '' },
  { id: 's6', name: '便民通讯录', type: 'service', emoji: '📞', desc: '开锁、疏通、维修等便民电话大全', members: 4567, todayPosts: 2, cover: '' },
];

// 模拟动态
const MOCK_POSTS = [
  {
    id: 'p1',
    user: { name: '老王聊方城', avatar: '👴', badge: '社区之星', verifiedCircle: '锦绣家园圈' },
    circles: [{ id: 'g1', name: '锦绣家园圈' }],
    content: '今天小区门口新开了一家水果店，老板说是从山东直发的苹果，尝了一个确实甜！有没有邻居一起去团购的？',
    images: [],
    time: '10分钟前',
    likes: 23, comments: 8, reposts: 3,
    liked: false,
  },
  {
    id: 'p2',
    user: { name: '宝妈小李', avatar: '👩', badge: '' },
    circles: [{ id: 'h2', name: '小城宝妈圈' }],
    content: '娃最近不爱吃饭，有没有有经验的宝妈分享一下？试了山楂水不管用...',
    images: [],
    time: '28分钟前',
    likes: 15, comments: 26, reposts: 0,
    liked: false,
  },
  {
    id: 'p3',
    user: { name: '爱钓鱼的老张', avatar: '🧔', badge: '认证邻居', verifiedCircle: '大柳树村圈' },
    circles: [{ id: 'h3', name: '钓鱼佬联盟' }, { id: 'g2', name: '大柳树村圈' }],
    content: '今天下午去白河那边钓鱼，收获不错！三条大鲫鱼，晚上加餐！附近想学的可以来找我，免费教。',
    images: ['https://picsum.photos/400/400?random=1', 'https://picsum.photos/400/400?random=2'],
    time: '1小时前',
    likes: 56, comments: 18, reposts: 5,
    liked: true,
  },
  {
    id: 'p4',
    user: { name: '跳广场舞的刘姐', avatar: '💃', badge: '' },
    circles: [{ id: 'h1', name: '广场舞姐妹圈' }],
    content: '今晚7点半在中心广场继续排练新舞《最炫民族风》，姐妹们记得穿红色队服！',
    images: ['https://picsum.photos/400/400?random=3'],
    time: '2小时前',
    likes: 42, comments: 15, reposts: 8,
    liked: false,
  },
  {
    id: 'p5',
    user: { name: '方城百事通', avatar: '🧑', badge: '社区之星' },
    circles: [{ id: 's1', name: '小城捡便宜' }],
    content: '永辉超市本周特价：鸡蛋3.99/斤、五花肉15.8/斤、东北大米29.9/10斤装！活动截止周日，需要的邻居抓紧了！',
    images: ['https://picsum.photos/400/400?random=4', 'https://picsum.photos/400/400?random=5', 'https://picsum.photos/400/400?random=6'],
    time: '3小时前',
    likes: 89, comments: 32, reposts: 15,
    liked: true,
  },
  {
    id: 'p6',
    user: { name: '热心小王', avatar: '👦', badge: '认证邻居', verifiedCircle: '锦绣家园圈' },
    circles: [{ id: 'g1', name: '锦绣家园圈' }],
    content: '7栋楼下垃圾桶旁边有一只橘猫，看起来像是走丢了，脖子上有红色项圈。谁家丢猫了赶紧来看看！',
    images: ['https://picsum.photos/400/400?random=7'],
    time: '4小时前',
    likes: 34, comments: 22, reposts: 12,
    liked: false,
  },
  {
    id: 'p7',
    user: { name: '跑团团长', avatar: '🏃', badge: '' },
    circles: [{ id: 'h4', name: '方城跑团' }],
    content: '周六早上6点，人民公园门口集合，10公里晨跑。配速6分半左右，欢迎新朋友加入！',
    images: [],
    time: '5小时前',
    likes: 28, comments: 9, reposts: 3,
    liked: false,
  },
  {
    id: 'p8',
    user: { name: '花姐养花', avatar: '🌸', badge: '社区之星' },
    circles: [{ id: 'h5', name: '花花草草爱好者' }],
    content: '我家阳台的多肉爆盆了！有没有想交换的？我有姬胧月、虹之玉、熊童子可以分。',
    images: ['https://picsum.photos/400/400?random=8', 'https://picsum.photos/400/400?random=9'],
    time: '6小时前',
    likes: 67, comments: 28, reposts: 6,
    liked: true,
  },
  {
    id: 'p9',
    user: { name: '吃货小赵', avatar: '😋', badge: '' },
    circles: [{ id: 'h6', name: '吃货小分队' }, { id: 'g3', name: '城关老街片儿圈' }],
    content: '强推老街拐角那家新开的羊肉汤！汤白肉嫩，一碗才12块，配上火烧绝了！',
    images: ['https://picsum.photos/400/400?random=10'],
    time: '8小时前',
    likes: 112, comments: 45, reposts: 23,
    liked: false,
  },
  {
    id: 'p10',
    user: { name: '失物招领小助手', avatar: '🔑', badge: '官方' },
    circles: [{ id: 's2', name: '失物招领处' }],
    content: '【拾到】今天在3路公交车上捡到一个黑色钱包，内有身份证和银行卡。失主请联系138xxxx6789。',
    images: [],
    time: '昨天',
    likes: 18, comments: 5, reposts: 9,
    liked: false,
  },
];

// 模拟评论（当 Supabase 不可用时使用）
const MOCK_COMMENTS = {}; // { postId: [{ id, user, content, time }] }

// 热门动态（用模拟数据，调整排序）
const MOCK_HOT_POSTS = [...MOCK_POSTS].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));

// 子功能页面内容定义
const SUB_FEATURES = {
  'lost-found': {
    title: '🔑 失物招领处',
    content: `
      <div class="subFeatureHeader">
        <button class="backBtn" onclick="goBack()">←</button>
        <strong>失物招领处</strong>
      </div>
      <button class="primaryBtn fullWidth" style="margin-bottom:16px;">📝 发布寻物 / 拾到信息</button>
      <div class="sectionHeader"><span>分类筛选</span></div>
      <div style="display:flex;gap:8px;padding:0 4px 12px;flex-wrap:wrap;">
        <button class="circleTab active">全部</button>
        <button class="circleTab">🔑 钥匙证件</button>
        <button class="circleTab">🐾 宠物</button>
        <button class="circleTab">📱 手机钱包</button>
        <button class="circleTab">📦 其他</button>
      </div>
      <div class="emptyHint">📭 功能建设中，敬请期待...</div>
    `,
  },
  'contacts': {
    title: '📞 便民通讯录',
    content: `
      <div class="subFeatureHeader">
        <button class="backBtn" onclick="goBack()">←</button>
        <strong>便民通讯录</strong>
      </div>
      <div class="sectionHeader"><span>推荐服务</span></div>
      <div class="menuList">
        <div class="menuItem">🔧 李师傅开锁 — 138xxxx5678 <span style="color:#ff6b35;">👍 3个邻居说靠谱</span></div>
        <div class="menuItem">🚰 王师傅疏通 — 139xxxx8901 <span style="color:#ff6b35;">👍 5个邻居说靠谱</span></div>
        <div class="menuItem">📺 小张家电维修 — 137xxxx2345 <span style="color:#ff6b35;">👍 2个邻居说靠谱</span></div>
        <div class="menuItem">🏃 老刘跑腿 — 136xxxx6789 <span style="color:#ff6b35;">👍 8个邻居说靠谱</span></div>
      </div>
      <div class="emptyHint">📭 更多服务陆续收录中...</div>
    `,
  },
  'report': {
    title: '📸 问题上报',
    content: `
      <div class="subFeatureHeader">
        <button class="backBtn" onclick="goBack()">←</button>
        <strong>有人管 · 问题上报</strong>
      </div>
      <button class="primaryBtn fullWidth" style="margin-bottom:16px;">📸 拍照上报问题</button>
      <div class="emptyHint">📭 功能建设中，敬请期待...</div>
    `,
  },
  'deals': {
    title: '🏷️ 小城捡便宜',
    content: `
      <div class="subFeatureHeader">
        <button class="backBtn" onclick="goBack()">←</button>
        <strong>小城捡便宜</strong>
      </div>
      <div class="emptyHint">📭 功能建设中，敬请期待...</div>
    `,
  },
  'market': {
    title: '🔄 闲置流转',
    content: `
      <div class="subFeatureHeader">
        <button class="backBtn" onclick="goBack()">←</button>
        <strong>闲置流转</strong>
      </div>
      <div class="emptyHint">📭 功能建设中，敬请期待...</div>
    `,
  },
  'jobs': {
    title: '💼 小城零工',
    content: `
      <div class="subFeatureHeader">
        <button class="backBtn" onclick="goBack()">←</button>
        <strong>小城零工</strong>
      </div>
      <div class="emptyHint">📭 功能建设中，敬请期待...</div>
    `,
  },
  'carpool': {
    title: '🚗 拼车信息台',
    content: `
      <div class="subFeatureHeader">
        <button class="backBtn" onclick="goBack()">←</button>
        <strong>拼车信息台</strong>
      </div>
      <div class="emptyHint">📭 功能建设中，敬请期待...</div>
    `,
  },
};
