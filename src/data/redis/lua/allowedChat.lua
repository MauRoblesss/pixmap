-- Check if user is allowed to chat
-- Keys:
--   mutecKey: 'mutec:cid' hash of channel for country mutes
--   muteKey: 'mute:uid' key for user mute
--   isalKey: 'isal:ip' (proxycheck, blacklist, whitelist)
-- Args:
--   cc: two letter country code of user
-- Returns:
--   {
--     1: return status code
--       100: country muted
--       101: user permanently muted
--       102: got captcha
--       >0: isAllowed status code (see core/isAllowed)
--       0: success
--       <0: time left for mute in seconds * -1
--     2: if we have to update isAllowed (proxycheck)
--   }
local ret = {0, 0}
-- check country mute
if ARGV[1] ~= "nope" and redis.call('hget', KEYS[1], ARGV[1]) then
  ret[1] = 100
  return ret
end
-- check user mute
local ttl = redis.call('ttl', KEYS[2])
if ttl == -1 then
  ret[1] = 101
  return ret
end
if ttl > 0 then
  ret[1] = -ttl
  return ret
end
-- check if isAllowed
local ia = redis.call('get', KEYS[3])
if not ia then
  ret[2] = 1
elseif tonumber(ia) > 0 then
  ret[1] = tonumber(ia)
end
return ret
