-- Checking requirements for placing pixels, calculating cooldown
-- of user and incrementing pixel counts within redis itself.
-- Does not set pixels directly. Pixels are set in batches
-- in RedisCanvas.js
-- Keys:
--   isAllowed: 'isal:ip' (proxycheck, blacklist, whitelist)
--   isHuman 'human:ip' captcha needed when expired,
--     'nope' if no captcha should be checked
--   ipCD: 'cd:canvasId:ip:ip'
--   uCD: 'cd:canvasId:id:userId'
--     'nope' if not logged in
--   chunk: 'ch:canvasId:i:j'
--   rankset: 'rank' sorted set of pixelcount
--   dailyset: 'rankd' sorted set of daily pixelcount
--     'nope' if not increasing ranks
--   countryset: sorted set for country stats
--   prevTop: sorted set of yesterdays top 10
-- Args:
--   clrIgnore: integer number of what colors are considered unset
--   bcd: number baseCooldown (fixed to cdFactor and 0 if admin)
--   pcd: number set pixel cooldown  (fixed to cdFactor and 0 if admin)
--   cds: max cooldown of canvas
--   cdIfNull: cooldown to use when no cooldown is stored
--   userId: '0' if not logged in
--   cc country code
--   req: requirements of canvas ('nope', unsigned integer or 'top')
--   off1, chunk offset of first pixel
--   off2, chunk offset of second pixel
--   ..., infinite pixels possible
-- Returns:
--   {
--     1: pixel return status code (check ui/placePixel.js)
--     2: amount of successfully set pixels
--     3: total cooldown of user
--     4: added cooldown of last pixel
--     5: if we have to update isAllowed( proxycheck)
--   }
local ret = {0, 0, 0, 0, 0}
-- check if captcha is needed
if KEYS[2] ~= "nope" and not redis.call('get', KEYS[2]) then
  -- captcha
  ret[1] = 10
  return ret
end
-- check if isAllowed
local ia = redis.call('get', KEYS[1])
if not ia then
  ret[5] = 1
else
  ia = tonumber(ia)
  if ia > 0 then
    if ia == 1 then
      -- proxy
      ret[1] = 11
    elseif ia == 2 then
      -- banned
      ret[1] = 14
    elseif ia == 3 then
      -- range banned
      ret[1] = 15
    end
    return ret
  end
end
-- check if requirements for canvas met
if ARGV[8] ~= "nope" then
  if ARGV[6] == "0" then
    -- not logged in
    ret[1] = 6
    return ret;
  end
  if ARGV[8] == "top" then
    local pr = redis.call('zrank', KEYS[9], ARGV[6])
    if not pr or pr > 9 then
      -- not in yesterdays top 10
      ret[1] = 12;
      return ret;
    end
  else
    local req = tonumber(ARGV[8])
    if req > 0 then
      local sc = tonumber(redis.call('zscore', KEYS[6], ARGV[6]))
      if not sc or sc < req then
        -- not enough pxls placed
        ret[1] = 7;
        return ret
      end
    end
  end
end
-- get cooldown of user
local cd = redis.call('pttl', KEYS[3])
if cd < 0 then
  cd = tonumber(ARGV[5])
end
if KEYS[4] ~= "nope" then
  local icd = redis.call('pttl', KEYS[4])
  if icd > cd then
    cd = icd
  end
end
-- set pixels
local pxlcd = 0
local pxlcnt = 0
local cli = tonumber(ARGV[1])
local bcd = tonumber(ARGV[2])
local pcd = tonumber(ARGV[3])
local cds = tonumber(ARGV[4])
for c = 10,#ARGV do
  local off = tonumber(ARGV[c]) * 8
  -- get color of pixel on canvas
  local sclr = redis.call('bitfield', KEYS[5], 'get', 'u8', off)
  sclr = sclr[1]
  -- check if protected (protected is last bit in u8)
  if sclr >= 128 then
    -- pixel protected
    ret[1] = 8
    break
  end
  -- calculate cooldown of pixel
  pxlcd = bcd
  if sclr >= cli then
    pxlcd = pcd
  end
  cd = cd + pxlcd
  if cd > cds then
    -- pixelstack used up
    -- report difference as last cd
    cd = cd - pxlcd
    pxlcd = cds - cd - pxlcd
    ret[1] = 9
    break
  end
  pxlcnt = pxlcnt + 1
end

if pxlcnt > 0 then
  -- set cooldown
  if cd > 0 then
    redis.call('set', KEYS[3], '', 'px', cd)
    if KEYS[4] ~= "nope" then
      redis.call('set', KEYS[4], '', 'px', cd)
    end
  end
  -- increment pixelcount
  if KEYS[7] ~= 'nope' then
    redis.call('zincrby', KEYS[6], pxlcnt, ARGV[6])
    redis.call('zincrby', KEYS[7], pxlcnt, ARGV[6])
    -- increase country stats only by registered users
    if ARGV[7] ~= 'xx' then
      redis.call('zincrby', KEYS[8], pxlcnt, ARGV[7])
    end
    -- color 
    if ARGV[9] ~= 'naa' then
      redis.call('zincrby', KEYS[10], pxlcnt, ARGV[9])
    end 
  end
end

ret[2] = pxlcnt
ret[3] = cd
ret[4] = pxlcd
return ret
