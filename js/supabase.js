/* ==========================================
   掌上方城 - Supabase 后端（纯 REST API，无需加载SDK）
   ========================================== */

const SB_URL = 'https://rlwduddvqctktvszvgan.supabase.co/rest/v1';
const SB_KEY = 'sb_publishable_rogSn372k3ezKHgqiyqaqg_yD68W4_v';
let supabaseReady = true; // 直接可用，不需要等SDK加载

// ========== HTTP 请求封装 ==========
function sbHeaders() {
  return {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function sbGet(path) {
  const res = await fetch(SB_URL + path, { headers: sbHeaders() });
  if (!res.ok) {
    console.error('SB GET 失败:', path, res.status);
    return [];
  }
  return await res.json();
}

async function sbPost(path, body) {
  const res = await fetch(SB_URL + path, {
    method: 'POST',
    headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('SB POST 失败:', path, res.status, err);
    throw new Error(err);
  }
  return await res.json();
}

async function sbPatch(path, body) {
  const res = await fetch(SB_URL + path, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function sbDelete(path) {
  const res = await fetch(SB_URL + path, {
    method: 'DELETE',
    headers: sbHeaders(),
  });
  return res.ok;
}

async function sbRpc(fn, params) {
  const res = await fetch(SB_URL + '/rpc/' + fn, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(params || {}),
  });
  return res.ok;
}

// ========== 初始化（直接可用，无需异步加载） ==========
function initSupabase() {
  console.log('✅ Supabase REST API 已就绪');
}

// ========== 用户 ==========
async function dbGetUser(userId) {
  const data = await sbGet('/users?id=eq.' + encodeURIComponent(userId));
  return data[0] || null;
}

async function dbGetUserByPhone(phone) {
  const data = await sbGet('/users?phone=eq.' + encodeURIComponent(phone));
  if (!data[0]) return null;
  const u = data[0];
  return {
    id: u.id,
    nickname: u.nickname,
    avatar: u.avatar,
    geoCircleId: u.geo_circle_id,
    geoCircleName: u.geo_circle_name,
    verified: u.verified,
    phone: u.phone,
  };
}

async function dbCreateUser(user) {
  const data = await sbPost('/users', {
    phone: user.phone,
    nickname: user.nickname,
    avatar: user.avatar,
    geo_circle_id: user.geoCircleId,
    geo_circle_name: user.geoCircleName,
    verified: true,
  });
  const u = data[0];
  return {
    id: u.id,
    nickname: u.nickname,
    avatar: u.avatar,
    geoCircleId: u.geo_circle_id,
    geoCircleName: u.geo_circle_name,
    verified: u.verified,
    phone: u.phone,
  };
}

async function dbUpdateUserAvatar(userId, avatar) {
  await sbPatch('/users?id=eq.' + encodeURIComponent(userId), { avatar });
}

// ========== 圈子 ==========
async function dbGetCircles(type) {
  let path = '/circles?order=member_count.desc';
  if (type && type !== 'all') path += '&type=eq.' + type;
  const data = await sbGet(path);
  return data.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    emoji: c.emoji,
    desc: c.description,
    members: c.member_count,
    todayPosts: c.today_posts,
  }));
}

async function dbJoinCircle(userId, circleId) {
  await sbPost('/user_circles', { user_id: userId, circle_id: circleId });
}

async function dbLeaveCircle(userId, circleId) {
  await sbDelete('/user_circles?user_id=eq.' + encodeURIComponent(userId) + '&circle_id=eq.' + circleId);
}

async function dbGetUserCircles(userId) {
  const data = await sbGet('/user_circles?select=circle_id&user_id=eq.' + encodeURIComponent(userId));
  return data.map(r => r.circle_id);
}

// ========== 帖子（带缓存） ==========
const postsCacheStore = { data: null, time: 0, filter: '' };
const CACHE_TTL = 30000; // 30秒缓存

async function dbGetPosts(options) {
  const filterKey = (options?.circleId || 'all');
  const now = Date.now();

  // 缓存命中：30秒内相同条件直接返回
  if (postsCacheStore.data && postsCacheStore.filter === filterKey && (now - postsCacheStore.time) < CACHE_TTL) {
    return postsCacheStore.data;
  }

  let path = '/posts?select=*,user:users(id,nickname,avatar,geo_circle_name)&order=created_at.desc&limit=50';
  if (options && options.circleId && options.circleId !== 'all') {
    path += '&circle_ids=cs.%5B%22' + options.circleId + '%22%5D';
  }
  const data = await sbGet(path);

  // 查询当前用户点赞状态（用 in 操作符，URL 更短）
  let likedPostIds = new Set();
  if (currentUser?.id && data.length > 0) {
    const ids = data.map(p => p.id);
    // 分批次查询，每批30个，避免URL过长
    for (let i = 0; i < ids.length; i += 30) {
      const batch = ids.slice(i, i + 30);
      const likes = await sbGet('/post_likes?select=post_id&user_id=eq.' + currentUser.id + '&post_id=in.(' + batch.join(',') + ')');
      likes.forEach(l => likedPostIds.add(l.post_id));
    }
  }

  const result = data.map(p => ({
    id: p.id,
    user: {
      name: p.user?.nickname || '匿名',
      avatar: p.user?.avatar || '👤',
      badge: '',
      verifiedCircle: p.user?.geo_circle_name || '',
    },
    circles: Array.isArray(p.circle_ids) ? p.circle_ids.map(c => (typeof c === 'string' ? { id: c, name: c } : { id: c.id, name: c.name })) : [],
    content: p.content,
    images: p.images || [],
    time: timeAgo(p.created_at),
    likes: p.likes_count || 0,
    comments: p.comments_count || 0,
    reposts: p.reposts_count || 0,
    liked: likedPostIds.has(p.id),
  }));

  // 存入缓存
  postsCacheStore.data = result;
  postsCacheStore.time = now;
  postsCacheStore.filter = filterKey;
  return result;
}

// 清除帖子缓存（点赞、发布、删除后调用）
function clearPostsCache() {
  postsCacheStore.data = null;
  postsCacheStore.time = 0;
}

async function dbCreatePost(post) {
  if (!currentUser?.id) {
    const newPost = {
      id: 'local_' + Date.now(),
      user: { name: currentUser?.nickname || '我', avatar: currentUser?.avatar || '👤', badge: '', verifiedCircle: currentUser?.verified ? currentUser.geoCircleName : '' },
      circles: post.circles,
      content: post.content,
      images: post.images || [],
      time: '刚刚',
      likes: 0, comments: 0, reposts: 0,
      liked: false,
    };
    MOCK_POSTS.unshift(newPost);
    return newPost;
  }
  const data = await sbPost('/posts', {
    user_id: currentUser.id,
    content: post.content,
    images: post.images || [],
    circle_ids: post.circles,
    likes_count: 0,
    comments_count: 0,
    reposts_count: 0,
  });
  const p = data[0];
  return {
    id: p.id,
    user: { name: currentUser.nickname, avatar: currentUser.avatar, badge: '', verifiedCircle: currentUser.geoCircleName || '' },
    circles: p.circle_ids || [],
    content: p.content,
    images: p.images || [],
    time: '刚刚',
    likes: 0, comments: 0, reposts: 0,
    liked: false,
  };
}

async function dbToggleLike(postId) {
  if (!currentUser?.id) return null;
  // 检查是否已点赞
  const existing = await sbGet('/post_likes?post_id=eq.' + postId + '&user_id=eq.' + currentUser.id);
  if (existing.length > 0) {
    await sbDelete('/post_likes?id=eq.' + existing[0].id);
    await sbRpc('decrement_likes', { post_id: postId });
    return false;
  } else {
    await sbPost('/post_likes', { post_id: postId, user_id: currentUser.id });
    await sbRpc('increment_likes', { post_id: postId });
    return true;
  }
}

// ========== 删除帖子 ==========
async function dbDeletePost(postId) {
  if (!supabaseReady) {
    const idx = MOCK_POSTS.findIndex(p => p.id === postId);
    if (idx >= 0) MOCK_POSTS.splice(idx, 1);
    return true;
  }
  return await sbDelete('/posts?id=eq.' + encodeURIComponent(postId));
}

// ========== 评论 ==========
let _commentsTableExists = null; // 缓存表是否存在

async function dbGetComments(postId) {
  if (supabaseReady && _commentsTableExists !== false) {
    try {
      const data = await sbGet('/comments?select=*,user:users(nickname,avatar)&post_id=eq.' + postId + '&order=created_at.asc');
      _commentsTableExists = true;
      return (data || []).map(c => ({
        id: c.id,
        user: { name: c.user?.nickname || '匿名', avatar: c.user?.avatar || '👤' },
        content: c.content,
        time: timeAgo(c.created_at),
      }));
    } catch (e) {
      _commentsTableExists = false;
    }
  }
  // 回退本地（每人各自存储，不同步）
  return (MOCK_COMMENTS[postId] || []).slice(-50);
}

async function dbCreateComment(postId, content) {
  if (supabaseReady && _commentsTableExists !== false) {
    try {
      const data = await sbPost('/comments', { post_id: postId, user_id: currentUser.id, content });
      _commentsTableExists = true;
      try { await sbRpc('increment_comments', { post_id: postId }); } catch {}
      return { id: data[0]?.id, user: { name: currentUser.nickname, avatar: currentUser.avatar }, content, time: '刚刚' };
    } catch (e) {
      _commentsTableExists = false;
    }
  }
  // 回退：存本地内存（仅自己可见）
  if (!MOCK_COMMENTS[postId]) MOCK_COMMENTS[postId] = [];
  const c = { id: 'c_' + Date.now(), user: { name: currentUser?.nickname || '我', avatar: currentUser?.avatar || '👤' }, content, time: '刚刚' };
  MOCK_COMMENTS[postId].push(c);
  const mockPost = MOCK_POSTS.find(p => p.id === postId);
  if (mockPost) mockPost.comments = (mockPost.comments || 0) + 1;
  return c;
}
function timeAgo(dateStr) {
  if (!dateStr) return '刚刚';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 604800) return Math.floor(diff / 86400) + '天前';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
