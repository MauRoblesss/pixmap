/*
 * OP CODES
 */

/*
 * we export code so that webpack can directly resolve them
 */
export const REG_CANVAS_OP = 0xA0;
export const REG_CHUNK_OP = 0xA1;
export const DEREG_CHUNK_OP = 0xA2;
export const REG_MCHUNKS_OP = 0xA3;
export const DEREG_MCHUNKS_OP = 0xA4;
export const CHANGE_ME_OP = 0xA6;
export const ONLINE_COUNTER_OP = 0xA7;
export const PING_OP = 0xB0;
export const PIXEL_UPDATE_OP = 0xC1;
export const COOLDOWN_OP = 0xC2;
export const PIXEL_RETURN_OP = 0xC3;
export const CHUNK_UPDATE_MB_OP = 0xC4;
export const PIXEL_UPDATE_MB_OP = 0xC5;
export const CAPTCHA_RETURN_OP = 0xC6;
