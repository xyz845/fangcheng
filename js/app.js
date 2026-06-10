/* ==========================================
   掌上方城 - 主应用逻辑
   ========================================== */

// ========== 全局状态 ==========
let currentUser = null;
let currentPage = 'following';
let currentCircleFilter = 'all';
let selectedCircles = []; // 发布时选中的圈子
let postImages = [];      // 发布时选中的图片
let currentSubFeature = null;
let selectedAvatar = '👤'; // 注册时选中的头像
let postsCache = [];       // 当前显示的帖子缓存（用于乐观更新）
let userLocation = null;   // 用户定位 {lat, lng}
let locationError = null;  // 定位失败原因

// 预设头像列表
const AVATAR_OPTIONS = [
  '👤', '👩', '👨', '👧', '👦', '👴', '👵', '😊',
  '🐱', '🐶', '🐼', '🐰', '🦊', '🐸', '🐵', '🐮',
  '🌸', '🌺', '🌻', '🌹', '🍀', '🌵', '🍎', '🍊',
  '⚽', '🏀', '🎵', '🎸', '📚', '🎨', '✈️', '🚗',
];

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  initNavigation();
  initPublish();
  initAuth();
  initMyPostsToggle();
  refreshAllData();
  checkLoginStatus();
});

// 刷新所有数据（Supabase 就绪后会用真实数据替换模拟数据）
async function refreshAllData() {
  await renderCircleQuickBar();
  await renderFeed('following');
  await renderCirclesPage('all');
  await renderMyCircles();
}

// 兼容：生成 UUID（用于 Supabase 主键）
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ========== 登录状态检查 ==========
function checkLoginStatus() {
  const saved = localStorage.getItem('fangcheng_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    updateProfileUI();
  }
}

// ========== 底部导航 ==========
function initNavigation() {
  document.querySelectorAll('.navBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page) switchTab(page);
    });
  });

  // 中间发布按钮
  document.getElementById('btnPublishCenter').addEventListener('click', () => {
    if (!currentUser) {
      showAuth();
      return;
    }
    openPublish();
  });
}

function switchTab(page) {
  // 关闭子页面
  document.querySelectorAll('.subPage').forEach(p => p.classList.remove('active'));
  currentSubFeature = null;

  // 切换底部导航高亮
  document.querySelectorAll('.navBtn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.navBtn[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  // 切换页面
  document.querySelectorAll('#pageContainer > .page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  currentPage = page;

  // 更新顶部标题
  const titles = {
    following: '掌上方城',
    nearby: '身边动态',
    hot: '热门推荐',
    circles: '发现圈子',
    profile: '我的',
  };
  document.getElementById('topBarTitle').textContent = titles[page] || '掌上方城';

  // 异步刷新内容
  if (page === 'following') renderFeed('following');
  if (page === 'hot') renderFeed('hot');
  if (page === 'nearby') { requestLocation(); renderFeed('nearby'); }
  if (page === 'circles') renderCirclesPage('all');
  if (page === 'profile') {
    updateProfileUI();
    renderMyCircles();
    const myPostsList = document.getElementById('myPostsList');
    if (myPostsList && myPostsList.style.display !== 'none') renderMyPosts();
  }
}

// ========== 动态列表渲染 ==========
// 全局 Feed 事件委托（只绑定一次，不随 renderFeed 重复绑定）
const feedDelegates = {};

function ensureFeedDelegate(containerId) {
  if (feedDelegates[containerId]) return; // 已绑定，跳过
  feedDelegates[containerId] = true;

  const container = document.getElementById(containerId);
  if (!container) return;

  // 一个事件监听器处理所有交互（事件委托）
  container.addEventListener('click', (e) => {
    // 删除按钮
    const delBtn = e.target.closest('.postDeleteBtn');
    if (delBtn) {
      const postId = delBtn.closest('.postCard').dataset.postId;
      handlePostAction(postId, 'delete');
      return;
    }

    // 点赞/评论/转发按钮
    const actionBtn = e.target.closest('.postAction');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const postId = actionBtn.closest('.postCard').dataset.postId;
      handlePostAction(postId, action, actionBtn);
      return;
    }

    // 圈子来源链接
    const circleSpan = e.target.closest('.postSource span');
    if (circleSpan) {
      const circleId = circleSpan.dataset.circleId;
      if (circleId) showCircleDetail(circleId);
      return;
    }

    // 图片点击
    const postImg = e.target.closest('.postImages img');
    if (postImg) {
      viewImage(postImg.src);
      return;
    }
  });

  // 评论输入框回车发送
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const input = e.target.closest('.commentInput');
      if (input) {
        const postId = input.closest('.commentSection').dataset.postId;
        submitComment(postId, input);
      }
    }
  });

  // 评论输入变化时切换发送按钮状态
  container.addEventListener('input', (e) => {
    const input = e.target.closest('.commentInput');
    if (input) {
      const submitBtn = input.parentElement.querySelector('.commentSubmit');
      if (submitBtn) submitBtn.disabled = !input.value.trim();
    }
  });

  // 评论发送按钮点击
  container.addEventListener('click', (e) => {
    const submitBtn = e.target.closest('.commentSubmit');
    if (submitBtn && !submitBtn.disabled) {
      const section = submitBtn.closest('.commentSection');
      const input = section.querySelector('.commentInput');
      const postId = section.dataset.postId;
      submitComment(postId, input);
    }
  });
}

async function renderFeed(type) {
  // 显示加载状态
  const containerId = type === 'following' ? 'feedFollowing'
    : type === 'hot' ? 'feedHot' : 'feedNearby';
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="emptyHint">⏳ 加载中...</div>';

  let posts;
  // Supabase 模式下从数据库加载
  if (supabaseReady) {
    const options = {};
    if (type === 'following' && currentCircleFilter !== 'all') {
      options.circleId = currentCircleFilter;
    }
    posts = await dbGetPosts(options);
    if (type === 'hot') posts.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
    if (type === 'nearby') {
      // 如果有位置，按距离排序
      if (userLocation) {
        posts.forEach(p => { if (p.lat) p._distance = getDistance(userLocation.lat, userLocation.lng, p.lat, p.lng); });
        posts.sort((a, b) => (a._distance || 9999) - (b._distance || 9999));
      } else {
        posts.sort(() => Math.random() - 0.5);
      }
    }
  } else {
    if (type === 'following') {
      posts = currentCircleFilter === 'all' ? [...MOCK_POSTS] : MOCK_POSTS.filter(p => p.circles.some(c => c.id === currentCircleFilter));
    } else if (type === 'hot') {
      posts = [...MOCK_HOT_POSTS];
    } else {
      posts = [...MOCK_POSTS].sort(() => Math.random() - 0.5);
      // 给模拟数据加模拟坐标
      posts.forEach((p, i) => {
        if (!p.lat) p.lat = 33.26 + (Math.random() - 0.5) * 0.05;
        if (!p.lng) p.lng = 113.00 + (Math.random() - 0.5) * 0.05;
      });
    }
  }

  // 存入缓存
  postsCache = posts || [];

  // 确保事件委托只绑一次
  ensureFeedDelegate(containerId);

  if (!posts || posts.length === 0) {
    const emptyMsg = type === 'nearby' && locationError
      ? '📍 ' + locationError
      : type === 'nearby' && !userLocation
      ? '📍 正在获取位置...'
      : '📭 还没有动态，快来发第一条吧！';
    container.innerHTML = '<div class="emptyHint">' + emptyMsg + '</div>';
    return;
  }

  // 使用 DocumentFragment 批量插入DOM，减少回流
  const fragment = document.createDocumentFragment();
  const temp = document.createElement('div');
  temp.innerHTML = posts.map(post => renderPostCard(post)).join('');
  while (temp.firstChild) {
    fragment.appendChild(temp.firstChild);
  }
  container.innerHTML = '';
  container.appendChild(fragment);
}

function renderPostCard(post) {
  const imageGrid = post.images && post.images.length > 0
    ? `<div class="postImages col${Math.min(post.images.length, 3)}">
         ${post.images.map(img => `<img src="${img}" alt="图片" loading="lazy">`).join('')}
       </div>`
    : '';

  const circlesHtml = post.circles.map(c =>
    `<span data-circle-id="${c.id}" style="cursor:pointer;color:#3498db;">来自「${c.name}」</span>`
  ).join(' ');

  const verifiedHtml = post.user.verifiedCircle
    ? `<span class="postVerifiedBadge">✅ 认证邻居 · ${post.user.verifiedCircle}</span>`
    : '';

  const dist = post._distance;
  const distHtml = dist != null && !isNaN(dist)
    ? `<span style="color:#ff6b35;font-size:11px;margin-left:6px;">📍 ${formatDistance(dist)}</span>`
    : '';

  // 自己发的帖子显示删除按钮
  const isOwn = currentUser && (post.user.name === currentUser.nickname);
  const deleteBtn = isOwn
    ? `<button class="postDeleteBtn" data-action="delete" title="删除">✕</button>`
    : '';

  return `
    <div class="postCard" data-post-id="${post.id}">
      ${deleteBtn}
      <div class="postHeader">
        <div class="postAvatar">${post.user.avatar}</div>
        <div class="postUserInfo">
          <div class="postNickname">${post.user.name} ${verifiedHtml} ${distHtml}</div>
          <div class="postMeta">
            ${post.user.badge ? `<span class="postBadge">${post.user.badge}</span>` : ''}
            <span class="postTime">${post.time}</span>
          </div>
        </div>
      </div>
      <div class="postBody">${escapeHtml(post.content)}</div>
      ${imageGrid}
      <div class="postSource">${circlesHtml}</div>
      <div class="postActions">
        <button class="postAction ${post.liked ? 'liked' : ''}" data-action="like">
          ${post.liked ? '❤️' : '🤍'} <span>${post.likes}</span>
        </button>
        <button class="postAction" data-action="comment">
          💬 <span>${post.comments}</span>
        </button>
        <button class="postAction" data-action="repost">
          🔄 <span>${post.reposts}</span>
        </button>
      </div>
      <div class="commentSection" style="display:none;" data-post-id="${post.id}">
        <div class="commentList"></div>
        <div class="commentInputRow">
          <input type="text" class="commentInput" placeholder="写评论..." maxlength="500">
          <button class="commentSubmit primaryBtn" disabled>发送</button>
        </div>
      </div>
    </div>
  `;
}

// 精准更新单个动态卡片（不重建整个列表）
function updatePostCardDOM(postId) {
  const post = MOCK_POSTS.find(p => p.id === postId);
  if (!post) return;

  // 找到所有页面中这个帖子的卡片（可能同时出现在关注和热门页）
  document.querySelectorAll(`.postCard[data-post-id="${postId}"]`).forEach(card => {
    // 更新点赞按钮
    const likeBtn = card.querySelector('[data-action="like"]');
    if (likeBtn) {
      likeBtn.className = `postAction ${post.liked ? 'liked' : ''}`;
      likeBtn.innerHTML = `${post.liked ? '❤️' : '🤍'} <span>${post.likes}</span>`;
    }
    // 更新转发数
    const repostBtn = card.querySelector('[data-action="repost"]');
    if (repostBtn) {
      repostBtn.innerHTML = `🔄 <span>${post.reposts}</span>`;
    }
    // 更新评论数
    const commentBtn = card.querySelector('[data-action="comment"]');
    if (commentBtn) {
      commentBtn.innerHTML = `💬 <span>${post.comments}</span>`;
    }
  });
}

async function handlePostAction(postId, action, btnElement) {
  if (!currentUser) { showAuth(); return; }

  // 从缓存中找到帖子
  const cachedPost = postsCache.find(p => p.id === postId);
  const mockPost = MOCK_POSTS.find(p => p.id === postId);
  const post = cachedPost || mockPost;
  if (!post) return;

  if (action === 'like') {
    // === 乐观更新：立刻改界面 ===
    const wasLiked = post.liked;
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    updatePostCardDOM(postId);

    // === 后台同步到数据库 ===
    if (supabaseReady) {
      try {
        const result = await dbToggleLike(postId);
        // 如果服务器返回了实际状态，以服务器为准修正
        if (result !== null && result !== post.liked) {
          post.liked = result;
          post.likes += result ? 1 : -1;
          updatePostCardDOM(postId);
        }
      } catch (e) {
        // 失败回滚
        post.liked = wasLiked;
        post.likes += wasLiked ? 1 : -1;
        updatePostCardDOM(postId);
        console.error('点赞失败:', e);
      }
    }
    // 同步更新 MOCK_POSTS
    if (mockPost && mockPost !== post) {
      mockPost.liked = post.liked;
      mockPost.likes = post.likes;
    }
    return;
  }

  if (action === 'comment') {
    // 展开/收起评论区
    const card = document.querySelector(`.postCard[data-post-id="${postId}"]`);
    if (!card) return;
    const section = card.querySelector('.commentSection');
    if (!section) return;
    const isVisible = section.style.display !== 'none';
    if (isVisible) {
      section.style.display = 'none';
    } else {
      section.style.display = 'block';
      loadComments(postId, section.querySelector('.commentList'));
    }
    return;
  }

  if (action === 'delete') {
    if (!confirm('确定删除这条动态吗？')) return;

    const card = document.querySelector(`.postCard[data-post-id="${postId}"]`);
    const wasInCache = postsCache.find(p => p.id === postId);

    // 立刻从缓存和DOM移除（无延迟）
    postsCache = postsCache.filter(p => p.id !== postId);
    if (card) card.style.opacity = '0';
    showToast('🗑️ 已删除');

    // 后台同步删除
    try {
      const ok = await dbDeletePost(postId);
      if (!ok && wasInCache) {
        // 恢复
        postsCache.push(wasInCache);
        postsCache.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        throw new Error('服务器删除失败');
      }
      // 同步清理 MOCK_POSTS
      const mockIdx = MOCK_POSTS.findIndex(p => p.id === postId);
      if (mockIdx >= 0) MOCK_POSTS.splice(mockIdx, 1);
      // 从界面移除
      if (card && card.parentElement) card.remove();
    } catch (e) {
      console.error('删除失败:', e);
      showToast('❌ 删除失败，已恢复');
      if (card) card.style.opacity = '1';
      // 刷新以恢复正确状态
      await renderFeed(currentPage === 'following' ? 'following' : currentPage === 'hot' ? 'hot' : 'following');
      await renderMyPosts();
    }

    // 更新空状态
    if (postsCache.length === 0) {
      const feedId = currentPage === 'following' ? 'feedFollowing' : currentPage === 'hot' ? 'feedHot' : 'feedNearby';
      const c = document.getElementById(feedId);
      if (c) c.innerHTML = '<div class="emptyHint">📭 还没有动态，快来发第一条吧！</div>';
    }
    // 更新我的动态列表
    if (card && card.parentElement) setTimeout(() => card.remove(), 150);
    await renderMyPosts();
    return;
  }

  if (action === 'repost') {
    // 乐观更新
    post.reposts++;
    updatePostCardDOM(postId);
    showToast('🔄 已转发到你的圈子');
    return;
  }
}

// ========== 评论功能 ==========
async function loadComments(postId, listEl) {
  listEl.innerHTML = '<div style="color:#aaa;font-size:12px;">加载中...</div>';
  const comments = await dbGetComments(postId);
  if (!comments || comments.length === 0) {
    listEl.innerHTML = '<div style="color:#aaa;font-size:12px;">暂无评论，来说两句吧</div>';
    return;
  }
  listEl.innerHTML = comments.map(c => `
    <div class="commentItem">
      <span class="commentAvatar">${c.user.avatar}</span>
      <div class="commentBody">
        <span class="commentUser">${c.user.name}</span>
        <span class="commentContent">${escapeHtml(c.content)}</span>
        <span class="commentTime">${c.time}</span>
      </div>
    </div>
  `).join('');
}

async function submitComment(postId, input) {
  const content = input.value.trim();
  if (!content) return;
  if (!currentUser) { showAuth(); return; }

  // 乐观添加
  const section = input.closest('.commentSection');
  const listEl = section.querySelector('.commentList');
  const tempComment = `
    <div class="commentItem">
      <span class="commentAvatar">${currentUser.avatar}</span>
      <div class="commentBody">
        <span class="commentUser">${currentUser.nickname}</span>
        <span class="commentContent">${escapeHtml(content)}</span>
        <span class="commentTime">刚刚</span>
      </div>
    </div>
  `;
  if (listEl.querySelector('.commentItem')) {
    listEl.insertAdjacentHTML('beforeend', tempComment);
  } else {
    listEl.innerHTML = tempComment;
  }
  input.value = '';
  input.parentElement.querySelector('.commentSubmit').disabled = true;

  // 后台同步
  try {
    await dbCreateComment(postId, content);
    // 更新评论计数
    const post = postsCache.find(p => p.id === postId);
    if (post) { post.comments = (post.comments || 0) + 1; updatePostCardDOM(postId); }
  } catch (e) {
    console.error('评论失败:', e);
  }
}

// ========== 圈子快捷栏 ==========
async function renderCircleQuickBar() {
  const bar = document.getElementById('circleQuickBar');
  const joinedCircleIds = await getJoinedCircleIds();

  let circles;
  if (supabaseReady) {
    const all = await dbGetCircles('all');
    circles = all.filter(c => joinedCircleIds.includes(c.id));
  } else {
    circles = MOCK_CIRCLES.filter(c => joinedCircleIds.includes(c.id));
  }
  if (circles.length === 0) {
    circles = MOCK_CIRCLES.slice(0, 3);
  }

  const buttons = [
    '<button class="circleQuickBtn active" data-circle="all">📋 全部</button>',
    ...circles.map(c => `<button class="circleQuickBtn" data-circle="${c.id}">${c.emoji} ${c.name}</button>`)
  ].join('');

  bar.innerHTML = buttons;

  bar.querySelectorAll('.circleQuickBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.circleQuickBtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCircleFilter = btn.dataset.circle;
      renderFeed('following');
    });
  });
}

// ========== 圈子发现页 ==========
async function renderCirclesPage(category) {
  const container = document.getElementById('circleList');
  let circles;
  if (supabaseReady) {
    circles = await dbGetCircles(category);
  } else {
    circles = category === 'all' ? MOCK_CIRCLES : MOCK_CIRCLES.filter(c => c.type === category);
  }

  // 搜索过滤
  const searchTerm = document.getElementById('circleSearchInput')?.value?.trim().toLowerCase();
  if (searchTerm) {
    circles = circles.filter(c =>
      c.name.toLowerCase().includes(searchTerm) || c.desc.toLowerCase().includes(searchTerm)
    );
  }

  const joinedIds = await getJoinedCircleIds();

  container.innerHTML = circles.map(c => `
    <div class="circleCard" data-circle-id="${c.id}" onclick="showCircleDetail('${c.id}')">
      <div class="circleCover">${c.emoji}</div>
      <div class="circleInfo">
        <div class="circleName">${c.name}</div>
        <div class="circleDesc">${c.desc}</div>
        <div class="circleStats">👥 ${formatNumber(c.members)} 成员 · 今日 ${c.todayPosts} 条新内容</div>
      </div>
      <button class="circleJoinBtn ${joinedIds.includes(c.id) ? 'joined' : ''}"
              onclick="event.stopPropagation(); toggleJoinCircle('${c.id}', this)">
        ${joinedIds.includes(c.id) ? '已加入' : '加入'}
      </button>
    </div>
  `).join('');

  // 分类标签事件
  document.querySelectorAll('#circleTabs .circleTab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#circleTabs .circleTab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCirclesPage(tab.dataset.cat);
    });
  });

  // 搜索事件
  const searchInput = document.getElementById('circleSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderCirclesPage(category));
  }
}

async function toggleJoinCircle(circleId, btn) {
  if (!currentUser) { showAuth(); return; }

  const joined = await getJoinedCircleIds();
  if (joined.includes(circleId)) {
    // 退出
    if (supabaseReady) await dbLeaveCircle(currentUser.id, circleId);
    joined.splice(joined.indexOf(circleId), 1);
    localStorage.setItem('fangcheng_joined_circles', JSON.stringify(joined));
    if (btn) { btn.textContent = '加入'; btn.classList.remove('joined'); }
    showToast('已退出圈子');
  } else {
    // 加入
    if (supabaseReady) await dbJoinCircle(currentUser.id, circleId);
    joined.push(circleId);
    localStorage.setItem('fangcheng_joined_circles', JSON.stringify(joined));
    if (btn) { btn.textContent = '已加入'; btn.classList.add('joined'); }
    showToast('🎉 成功加入圈子！');
  }
  await renderCircleQuickBar();
  await renderMyCircles();
}

async function getJoinedCircleIds() {
  // Supabase 模式优先
  if (supabaseReady && currentUser?.id) {
    const ids = await dbGetUserCircles(currentUser.id);
    if (ids.length > 0) return ids;
  }
  // 回退 localStorage
  try {
    return JSON.parse(localStorage.getItem('fangcheng_joined_circles') || '[]');
  } catch { return []; }
}

// ========== 圈子详情页 ==========
async function showCircleDetail(circleId) {
  let circle;
  let posts;

  if (supabaseReady) {
    const allCircles = await dbGetCircles('all');
    circle = allCircles.find(c => c.id === circleId);
    posts = await dbGetPosts({ circleId });
  } else {
    circle = MOCK_CIRCLES.find(c => c.id === circleId);
    posts = MOCK_POSTS.filter(p => p.circles.some(c => c.id === circleId));
  }

  if (!circle) return;

  const joinedIds = await getJoinedCircleIds();
  const isJoined = joinedIds.includes(circleId);

  const page = document.getElementById('page-circleDetail');
  page.innerHTML = `
    <div id="circleDetailContent">
      <div style="padding:12px 0;">
        <button class="backBtn" onclick="closeCircleDetail()">← 返回</button>
      </div>
      <div class="circleDetailHeader">
        <div class="circleDetailCover">${circle.emoji}</div>
        <div class="circleDetailName">${circle.name}</div>
        <div class="circleDetailDesc">${circle.desc}</div>
        <div style="color:#888;font-size:13px;">👥 ${formatNumber(circle.members)} 成员 · 今日 ${circle.todayPosts} 条新内容</div>
        <button class="primaryBtn" style="margin-top:12px;"
                onclick="toggleJoinCircle('${circle.id}', this)">
          ${isJoined ? '已加入' : '加入圈子'}
        </button>
      </div>
      <div class="sectionHeader">圈子动态</div>
      <div class="circleDetailFeed">
        ${posts.map(p => renderPostCard(p)).join('') || '<div class="emptyHint">📭 暂无动态</div>'}
      </div>
    </div>
  `;
  page.classList.add('active');
}

function closeCircleDetail() {
  document.getElementById('page-circleDetail').classList.remove('active');
  document.getElementById('page-circleDetail').innerHTML = '';
}

// ========== 发布功能 ==========
function initPublish() {
  document.getElementById('btnSubmitPost').addEventListener('click', submitPost);
  document.getElementById('btnAddImage').addEventListener('click', () => {
    document.getElementById('imageInput').click();
  });
  document.getElementById('imageInput').addEventListener('change', handleImageSelect);
  document.getElementById('btnSelectCircle').addEventListener('click', toggleCircleSelector);

  // 圈子选择器标签切换
  document.querySelectorAll('.selTab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.selTab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      await renderSelectorCircles(tab.dataset.type);
    });
  });
}

function openPublish() {
  selectedCircles = [];
  postImages = [];
  document.getElementById('postContent').value = '';
  document.getElementById('postImagePreview').innerHTML = '';
  document.getElementById('selectedCircleHint').textContent = '(必选)';
  document.getElementById('circleSelector').style.display = 'none';
  document.getElementById('publishModal').classList.add('show');
  renderSelectorCircles('geo');
  document.getElementById('postContent').focus();
}

function closePublish() {
  document.getElementById('publishModal').classList.remove('show');
}

function toggleCircleSelector() {
  const el = document.getElementById('circleSelector');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function renderSelectorCircles(type) {
  const container = document.getElementById('selectorCircleList');
  const joinedIds = await getJoinedCircleIds();
  // 显示该类型的所有圈子，不限于已加入的
  const circles = supabaseReady ? await dbGetCircles(type) : MOCK_CIRCLES.filter(c => c.type === type);

  container.innerHTML = circles.map(c => `
    <span class="selectorItem ${selectedCircles.some(sc => sc.id === c.id) ? 'selected' : ''}"
          data-circle-id="${c.id}" data-circle-name="${c.name}">
      ${c.emoji} ${c.name}
    </span>
  `).join('');

  container.querySelectorAll('.selectorItem').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.circleId;
      const name = item.dataset.circleName;
      const idx = selectedCircles.findIndex(sc => sc.id === id);
      if (idx >= 0) {
        selectedCircles.splice(idx, 1);
        item.classList.remove('selected');
      } else {
        if (selectedCircles.length >= 3) {
          showToast('最多选择3个圈子');
          return;
        }
        selectedCircles.push({ id, name });
        item.classList.add('selected');
      }
      updateSelectedCircleHint();
    });
  });
}

function updateSelectedCircleHint() {
  const hint = document.getElementById('selectedCircleHint');
  if (selectedCircles.length === 0) {
    hint.textContent = '(必选)';
  } else {
    hint.textContent = `已选 ${selectedCircles.length}/3: ${selectedCircles.map(c => c.name).join('、')}`;
  }
}

function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (postImages.length >= 9) {
      showToast('最多添加9张图片');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      postImages.push(ev.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderImagePreviews() {
  const container = document.getElementById('postImagePreview');
  container.innerHTML = postImages.map((img, i) => `
    <div class="imagePreviewItem">
      <img src="${img}" alt="预览图${i+1}">
      <button class="removeBtn" onclick="removeImage(${i})">✕</button>
    </div>
  `).join('');
}

function removeImage(index) {
  postImages.splice(index, 1);
  renderImagePreviews();
}

async function submitPost() {
  const content = document.getElementById('postContent').value.trim();
  if (!content) { showToast('请输入内容'); return; }
  if (selectedCircles.length === 0) { showToast('请至少选择一个圈子'); return; }

  // === 乐观更新：立刻构建帖子对象，加到列表顶部 ===
  const tempId = 'temp_' + Date.now();
  const optimisticPost = {
    id: tempId,
    user: {
      name: currentUser?.nickname || '我',
      avatar: currentUser?.avatar || '👤',
      badge: '',
      verifiedCircle: currentUser?.verified ? currentUser.geoCircleName : '',
    },
    circles: selectedCircles,
    content: content,
    images: postImages,
    time: '刚刚',
    likes: 0, comments: 0, reposts: 0,
    liked: false,
  };

  // 先关弹窗
  closePublish();

  // 立刻加到缓存和界面
  postsCache.unshift(optimisticPost);
  if (currentPage === 'following' || currentPage === 'nearby') {
    renderFeedFromCache(currentPage === 'following' ? 'feedFollowing' : 'feedNearby');
  }
  showToast('✅ 发布成功！');

  // === 后台写入数据库 ===
  try {
    const realPost = await dbCreatePost({
      content,
      circles: selectedCircles,
      images: postImages,
    });
    // 用真实数据替换临时帖子
    const idx = postsCache.findIndex(p => p.id === tempId);
    if (idx >= 0) {
      postsCache[idx] = { ...realPost, id: realPost.id || tempId };
      if (currentPage === 'following' || currentPage === 'nearby') {
        renderFeedFromCache(currentPage === 'following' ? 'feedFollowing' : 'feedNearby');
      }
    }
  } catch (e) {
    console.error('发布同步失败:', e);
    // 失败也不影响，临时帖子还在界面上
  }
}

// 从缓存渲染（不做网络请求）
function renderFeedFromCache(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  ensureFeedDelegate(containerId);
  if (postsCache.length === 0) {
    container.innerHTML = '<div class="emptyHint">📭 还没有动态，快来发第一条吧！</div>';
    return;
  }
  const fragment = document.createDocumentFragment();
  const temp = document.createElement('div');
  temp.innerHTML = postsCache.map(post => renderPostCard(post)).join('');
  while (temp.firstChild) fragment.appendChild(temp.firstChild);
  container.innerHTML = '';
  container.appendChild(fragment);
}

// ========== 认证功能 ==========
function initAuth() {
  document.getElementById('btnSendCode').addEventListener('click', () => {
    const phone = document.getElementById('phoneInput').value.trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      showToast('请输入正确的手机号');
      return;
    }
    // 模拟发送验证码
    showToast('📱 验证码已发送（模拟：123456）');
    document.getElementById('authStep1').style.display = 'none';
    document.getElementById('authStep2').style.display = 'block';
  });

  document.getElementById('btnVerifyCode').addEventListener('click', () => {
    const code = document.getElementById('codeInput').value.trim();
    if (code.length < 4) { showToast('请输入验证码'); return; }
    // 模拟验证
    document.getElementById('authStep2').style.display = 'none';
    document.getElementById('authStep3').style.display = 'block';
    // 加载地理圈选项（不设空选项，强制选择）
    const select = document.getElementById('geoCircleSelect');
    select.innerHTML = '<option value="" disabled selected>请务必选择你实际居住的小区...</option>' +
      MOCK_CIRCLES.filter(c => c.type === 'geo').map(c =>
        `<option value="${c.id}">${c.name}</option>`
      ).join('');
    // 渲染头像选择器
    renderAvatarPicker();
  });

  document.getElementById('btnCompleteProfile').addEventListener('click', async () => {
    const nickname = document.getElementById('nicknameInput').value.trim();
    const geoCircleId = document.getElementById('geoCircleSelect').value;

    if (!nickname) { showToast('请输入昵称'); return; }
    if (!geoCircleId) { showToast('请选择你居住的小区完成认证，这是必须的哦'); return; }

    const geoCircle = MOCK_CIRCLES.find(c => c.id === geoCircleId);
    const phone = document.getElementById('phoneInput').value.trim();

    const userData = {
      phone,
      nickname,
      avatar: selectedAvatar,
      geoCircleId,
      geoCircleName: geoCircle ? geoCircle.name : '',
      verified: true,
    };

    // Supabase 模式：写入真实数据库
    if (supabaseReady) {
      try {
        const created = await dbCreateUser(userData);
        currentUser = created;
      } catch (e) {
        console.error('注册失败:', e);
        // 如果手机号已存在，尝试查找已有用户
        showToast('该手机号已注册，正在登录...');
        return;
      }
    } else {
      // 本地模式
      currentUser = {
        id: generateId(),
        ...userData,
      };
    }

    // 自动加入对应的地理圈
    let joined = await getJoinedCircleIds();
    if (!joined.includes(geoCircleId)) {
      joined.push(geoCircleId);
      localStorage.setItem('fangcheng_joined_circles', JSON.stringify(joined));
      if (supabaseReady) await dbJoinCircle(currentUser.id, geoCircleId);
    }

    localStorage.setItem('fangcheng_user', JSON.stringify(currentUser));
    closeAuth();
    updateProfileUI();
    await renderCircleQuickBar();
    await renderMyCircles();
    showToast(`🎉 欢迎，${nickname}！`);
  });
}

function showAuth() {
  document.getElementById('authModal').classList.add('show');
  document.getElementById('authStep1').style.display = 'block';
  document.getElementById('authStep2').style.display = 'none';
  document.getElementById('authStep3').style.display = 'none';
}

function closeAuth() {
  document.getElementById('authModal').classList.remove('show');
}

function logout() {
  if (!confirm('确定退出登录吗？')) return;
  currentUser = null;
  localStorage.removeItem('fangcheng_user');
  postsCache = [];
  userLocation = null;
  // 重置界面
  document.getElementById('profileName').textContent = '未登录';
  document.getElementById('profileAvatar').textContent = '👤';
  document.getElementById('profileBio').textContent = '方城好邻居';
  document.getElementById('profileVerified').style.display = 'none';
  document.getElementById('profileStats').innerHTML = '<span>动态 <b>0</b></span><span>圈子 <b>0</b></span><span>获赞 <b>0</b></span>';
  document.getElementById('myCirclesList').innerHTML = '<div class="emptyHint" style="padding:12px;">登录后查看</div>';
  renderFeed('following');
  showToast('👋 已退出登录');
}

function updateProfileUI() {
  if (!currentUser) return;
  document.getElementById('profileName').textContent = currentUser.nickname;
  document.getElementById('profileAvatar').textContent = currentUser.avatar || '👤';
  document.getElementById('profileBio').textContent = '方城好邻居';

  // 显示认证信息
  const verifiedEl = document.getElementById('profileVerified');
  if (currentUser.verified && currentUser.geoCircleName) {
    verifiedEl.style.display = 'block';
    verifiedEl.innerHTML = `<span class="verifiedBadge">✅ 已认证 · ${currentUser.geoCircleName}</span>`;
  } else {
    verifiedEl.style.display = 'none';
  }

  document.getElementById('profileStats').innerHTML = `
    <span>动态 <b>${MOCK_POSTS.filter(p => p.user.name === currentUser.nickname).length}</b></span>
    <span>圈子 <b>${getJoinedCircleIds().length}</b></span>
    <span>获赞 <b>0</b></span>
  `;
}

// ========== 头像功能 ==========
function renderAvatarPicker() {
  const container = document.getElementById('avatarPicker');
  selectedAvatar = '👤';
  container.innerHTML = AVATAR_OPTIONS.map(emoji => `
    <div class="avatarOption ${emoji === selectedAvatar ? 'selected' : ''}"
         onclick="pickAvatar('${emoji}', this)">
      ${emoji}
    </div>
  `).join('');

  // 自定义头像上传按钮
  document.getElementById('btnCustomAvatar').onclick = () => {
    document.getElementById('avatarImageInput').click();
  };
  document.getElementById('avatarImageInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      selectedAvatar = ev.target.result; // base64图片
      // 清除emoji选中状态
      container.querySelectorAll('.avatarOption').forEach(o => o.classList.remove('selected'));
      showToast('📷 头像照片已设置');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
}

function pickAvatar(emoji, el) {
  selectedAvatar = emoji;
  document.querySelectorAll('.avatarOption').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function openAvatarEditor() {
  if (!currentUser) { showAuth(); return; }

  // 移除旧弹窗
  document.querySelectorAll('.avatarEditModal').forEach(m => m.remove());

  const modal = document.createElement('div');
  modal.className = 'avatarEditModal';
  modal.innerHTML = `
    <div class="avatarEditContent">
      <h3>修改头像</h3>
      <div class="avatarPicker" id="editAvatarPicker">
        ${AVATAR_OPTIONS.map(e => `
          <div class="avatarOption ${e === currentUser.avatar ? 'selected' : ''}"
               data-emoji="${e}">${e}</div>
        `).join('')}
      </div>
      <button class="textBtn" id="btnEditCustomAvatar">📷 上传照片</button>
      <input type="file" id="editAvatarImageInput" accept="image/*" hidden>
      <div class="avatarEditActions">
        <button onclick="this.closest('.avatarEditModal').remove()">取消</button>
        <button class="primaryBtn" id="btnSaveAvatar">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 选中事件
  modal.querySelectorAll('.avatarOption').forEach(opt => {
    opt.addEventListener('click', () => {
      modal.querySelectorAll('.avatarOption').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // 上传照片
  modal.querySelector('#btnEditCustomAvatar').addEventListener('click', () => {
    modal.querySelector('#editAvatarImageInput').click();
  });
  modal.querySelector('#editAvatarImageInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // 清除选中
      modal.querySelectorAll('.avatarOption').forEach(o => o.classList.remove('selected'));
      // 添加预览
      const preview = modal.querySelector('.avatarPreview');
      if (preview) preview.remove();
      const img = document.createElement('img');
      img.className = 'avatarPreview';
      img.src = ev.target.result;
      img.style.cssText = 'width:48px;height:48px;border-radius:50%;object-fit:cover;border:3px solid #ff6b35;';
      modal.querySelector('.avatarPicker').appendChild(img);
      img.dataset.custom = 'true';
      img.onclick = () => {
        modal.querySelectorAll('.avatarOption,.avatarPreview').forEach(o => o.classList.remove('selected'));
        img.classList.add('selected');
      };
    };
    reader.readAsDataURL(file);
  });

  // 保存
  modal.querySelector('#btnSaveAvatar').addEventListener('click', async () => {
    const customImg = modal.querySelector('.avatarPreview.selected');
    if (customImg) {
      currentUser.avatar = customImg.src;
    } else {
      const selectedEl = modal.querySelector('.avatarOption.selected');
      if (selectedEl) currentUser.avatar = selectedEl.dataset.emoji;
    }
    localStorage.setItem('fangcheng_user', JSON.stringify(currentUser));
    // 同步到 Supabase
    if (supabaseReady && currentUser.id) {
      await dbUpdateUserAvatar(currentUser.id, currentUser.avatar);
    }
    updateProfileUI();
    modal.remove();
    showToast('✅ 头像已更新');
  });

  // 点外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ========== 我的圈子 ==========
async function renderMyCircles() {
  const container = document.getElementById('myCirclesList');
  const joinedIds = await getJoinedCircleIds();
  let myCircles;
  if (supabaseReady) {
    const all = await dbGetCircles('all');
    myCircles = all.filter(c => joinedIds.includes(c.id));
  } else {
    myCircles = MOCK_CIRCLES.filter(c => joinedIds.includes(c.id));
  }

  if (myCircles.length === 0) {
    container.innerHTML = '<div class="emptyHint" style="padding:12px;">还没有加入圈子，去<a href="#" onclick="switchTab(\'circles\')">发现圈子</a>看看吧</div>';
    return;
  }

  container.innerHTML = myCircles.map(c => `
    <div class="miniCircleItem" onclick="showCircleDetail('${c.id}')">
      <div class="emoji">${c.emoji}</div>
      <div class="name">${c.name}</div>
    </div>
  `).join('');
}

// ========== 我的动态管理 ==========
async function renderMyPosts() {
  if (!currentUser) return;
  const container = document.getElementById('myPostsList');
  if (!container) return;

  // 从缓存中筛选当前用户的帖子，或者从 Supabase 加载
  let myPosts;
  if (supabaseReady) {
    const all = await dbGetPosts({});
    myPosts = all.filter(p => p.user.name === currentUser.nickname);
  } else {
    myPosts = MOCK_POSTS.filter(p => p.user.name === currentUser.nickname);
  }

  if (!myPosts || myPosts.length === 0) {
    container.innerHTML = '<div class="emptyHint" style="padding:12px;">你还没发过动态</div>';
    return;
  }

  // 用和 feed 一样的卡片渲染，事件委托已在 init 中绑定
  const fragment = document.createDocumentFragment();
  const temp = document.createElement('div');
  temp.innerHTML = myPosts.map(post => renderPostCard(post)).join('');
  while (temp.firstChild) fragment.appendChild(temp.firstChild);
  container.innerHTML = '';
  container.appendChild(fragment);

  // 更新统计数字
  document.getElementById('profileStats').innerHTML = `
    <span>动态 <b>${myPosts.length}</b></span>
    <span>圈子 <b>${(await getJoinedCircleIds()).length}</b></span>
    <span>获赞 <b>${myPosts.reduce((s, p) => s + (p.likes || 0), 0)}</b></span>
  `;
}

function initMyPostsToggle() {
  const btn = document.getElementById('btnMyPostsToggle');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const list = document.getElementById('myPostsList');
    if (list.style.display === 'none') {
      list.style.display = 'block';
      btn.textContent = '收起 ↑';
      ensureFeedDelegate('myPostsList'); // 注册事件委托
      await renderMyPosts();
    } else {
      list.style.display = 'none';
      btn.textContent = '展开 ↓';
    }
  });
}

// ========== 子功能页面 ==========
function showPage(feature) {
  currentSubFeature = feature;
  const data = SUB_FEATURES[feature];
  if (!data) return;

  const page = document.getElementById('page-subFeature');
  document.getElementById('subFeatureContent').innerHTML = data.content;
  page.classList.add('active');

  document.getElementById('topBarTitle').textContent = data.title;
}

function goBack() {
  document.getElementById('page-subFeature').classList.remove('active');
  currentSubFeature = null;
  const titles = {
    following: '掌上方城',
    nearby: '身边动态',
    hot: '热门推荐',
    circles: '发现圈子',
    profile: '我的',
  };
  document.getElementById('topBarTitle').textContent = titles[currentPage] || '掌上方城';
}

// ========== 定位功能 ==========
function requestLocation() {
  if (!navigator.geolocation) {
    locationError = '浏览器不支持定位';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      locationError = null;
      console.log('📍 定位成功:', userLocation);
      if (currentPage === 'nearby') renderFeed('nearby');
    },
    (err) => {
      locationError = '无法获取位置（' + (err.message || '请允许定位权限') + '）';
      console.warn('定位失败:', err.message);
      if (currentPage === 'nearby') renderFeed('nearby');
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

// Haversine 距离公式（返回公里数）
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km == null || isNaN(km)) return '';
  if (km < 1) return Math.round(km * 1000) + 'm';
  return km.toFixed(1) + 'km';
}

// ========== 工具函数 ==========
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatNumber(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function viewImage(src) {
  const viewer = document.createElement('div');
  viewer.className = 'imageViewer';
  viewer.innerHTML = `<img src="${src}" alt="查看图片">`;
  viewer.addEventListener('click', () => viewer.remove());
  document.body.appendChild(viewer);
}

// 点击弹窗外部关闭
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('show');
  }
});

// 搜索按钮
document.getElementById('btnSearch')?.addEventListener('click', () => {
  switchTab('circles');
  setTimeout(() => document.getElementById('circleSearchInput')?.focus(), 300);
});
