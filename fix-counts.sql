-- 修复：点赞/评论计数不持久化
-- 请在 Supabase → SQL Editor 中粘贴运行

-- 1. 给 posts 表加上 UPDATE 权限（核心修复！之前只有SELECT/INSERT没有UPDATE）
CREATE POLICY "允许更新帖子计数" ON posts
  FOR UPDATE USING (true);

-- 2. 重建 RPC 函数（SECURITY DEFINER 确保有权限更新 posts 表）
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_comments(post_id UUID)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
