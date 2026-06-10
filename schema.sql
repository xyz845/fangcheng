-- ==========================================
-- 掌上方城 · 数据库建表脚本
-- 请在 Supabase → SQL Editor 中粘贴运行
-- ==========================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar TEXT DEFAULT '👤',
  geo_circle_id VARCHAR(50),
  geo_circle_name VARCHAR(100),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 圈子表
CREATE TABLE IF NOT EXISTS circles (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('geo', 'hobby', 'service')),
  emoji VARCHAR(10) DEFAULT '💬',
  description TEXT DEFAULT '',
  member_count INT DEFAULT 0,
  today_posts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 帖子表
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  circle_ids JSONB DEFAULT '[]'::jsonb,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  reposts_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 点赞表
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 5. 用户-圈子关联表
CREATE TABLE IF NOT EXISTS user_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  circle_id VARCHAR(10) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, circle_id)
);

-- 6. 索引
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_circle_ids ON posts USING gin(circle_ids);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_user ON post_likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_circles_user ON user_circles(user_id);

-- 7. 存储过程：点赞计数（Supabase REST 无法直接 +1/-1，用 RPC）
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- 8. 开启行级安全（RLS），允许客户端用 anon key 读写
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_circles ENABLE ROW LEVEL SECURITY;

-- users 策略
CREATE POLICY "允许注册和读取" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- circles 策略
CREATE POLICY "允许所有人读取圈子" ON circles
  FOR SELECT USING (true);
CREATE POLICY "允许插入圈子" ON circles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "允许更新圈子" ON circles
  FOR UPDATE USING (true);

-- posts 策略
CREATE POLICY "允许所有人读取帖子" ON posts
  FOR SELECT USING (true);
CREATE POLICY "登录用户可以发帖" ON posts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "用户可以删自己的帖" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- post_likes 策略
CREATE POLICY "允许所有人读取点赞" ON post_likes
  FOR SELECT USING (true);
CREATE POLICY "登录用户可以点赞" ON post_likes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "用户可以取消点赞" ON post_likes
  FOR DELETE USING (true);

-- user_circles 策略
CREATE POLICY "允许所有人读取加入记录" ON user_circles
  FOR SELECT USING (true);
CREATE POLICY "登录用户可以加入圈子" ON user_circles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "用户可以退出圈子" ON user_circles
  FOR DELETE USING (true);
