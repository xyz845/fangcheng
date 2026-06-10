-- ==========================================
-- 掌上方城 · 评论功能建表
-- 请在 Supabase → SQL Editor 中粘贴运行
-- ==========================================

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at);

-- 存储过程：评论计数
CREATE OR REPLACE FUNCTION increment_comments(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- RLS 策略
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人读取评论" ON comments
  FOR SELECT USING (true);
CREATE POLICY "登录用户可以发评论" ON comments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "用户可以删自己的评论" ON comments
  FOR DELETE USING (true);
