-- Get multiple ranks from sorted set
--  Keys:
--    set: sorted set
--  Args:
--    [member,...] dynamic amount of members to look for
--  return:
--    table with the ranks, 0 for an item with no rank
local ret = {}
for c = 1,#ARGV do
  local rank = redis.call('zrevrank', KEYS[1], ARGV[c])
  if not rank then
    ret[c] = 0
  else
    ret[c] = rank + 1
  end
end
return ret
