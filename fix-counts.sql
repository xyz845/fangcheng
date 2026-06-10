-- 修复：点赞/评论计数更新权限
-- 请在 Supabase → SQL Editor 中粘贴运行

-- 1. 给 posts 表加上 UPDATE 权限
CREATE POLICY "允许更新帖子计数" ON posts
  FOR UPDATE USING (true);

-- 2. 重建 RPC 函数（加 SECURITY DEFINER 绕过权限问题）
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_comments(post_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
