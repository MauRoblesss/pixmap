-- Get ranks of user
-- Currently only pixelcounts and rankings
-- Keys:
--   rankset: 'rank'
--   dailyset: 'rankd'
-- Args:
--   userId
-- Returns:
--   {
--     1: totalPixels
--     2: dailyPixels
--     3: totalRanking
--     4: dailyRanking
--   }
local ret = {0, 0, 0, 0}
-- get total pixels
local cnt = redis.call('zscore', KEYS[1], ARGV[1])
if cnt then
  ret[1] = cnt
  -- get total rank
  ret [3] = redis.call('zrevrank', KEYS[1], ARGV[1]) + 1
end
-- get daily pixels
local dcnt = redis.call('zscore', KEYS[2], ARGV[1])
if dcnt then
  ret[2] = dcnt
  -- get daily rank
  ret [4] = redis.call('zrevrank', KEYS[2], ARGV[1]) + 1
end
return ret
