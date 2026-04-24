-- 拼音输入时自动计算并显示五笔编码
-- 对词库中没有收录的词组，也能通过拆字算出编码

local BUILD_DIR = os.getenv("HOME") .. "/Library/Rime/build/"
local wubi_reverse

local function init()
    wubi_reverse = ReverseDb(BUILD_DIR .. "wubi86_jidian.reverse.bin")
end

-- 查单字的五笔码，返回最短的那个
local function get_char_code(char)
    local result = wubi_reverse:lookup(char)
    if not result or result == "" then return nil end
    local shortest = nil
    for code in result:gmatch("%S+") do
        if not shortest or #code < #shortest then
            shortest = code
        end
    end
    return shortest
end

-- 按五笔造词规则计算词组编码
-- 2字词: 字1前2码 + 字2前2码
-- 3字词: 字1首码 + 字2首码 + 字3前2码
-- 4字及以上: 字1/2/3/末 各取首码
local function calc_wubi_code(text)
    local chars = {}
    for _, cp in utf8.codes(text) do
        table.insert(chars, utf8.char(cp))
    end
    local n = #chars
    if n == 0 then return nil end

    local codes = {}
    for _, c in ipairs(chars) do
        local code = get_char_code(c)
        if not code then return nil end
        table.insert(codes, code)
    end

    if n == 1 then
        return codes[1]
    elseif n == 2 then
        return codes[1]:sub(1, 2) .. codes[2]:sub(1, 2)
    elseif n == 3 then
        return codes[1]:sub(1, 1) .. codes[2]:sub(1, 1) .. codes[3]:sub(1, 2)
    else
        return codes[1]:sub(1, 1) .. codes[2]:sub(1, 1) .. codes[3]:sub(1, 1) .. codes[n]:sub(1, 1)
    end
end

local function filter(input, env)
    if not wubi_reverse then init() end
    for cand in input:iter() do
        -- 只在没有编码提示时才补充（避免覆盖已有的五笔码）
        if cand.comment == "" then
            local code = calc_wubi_code(cand.text)
            if code then
                cand.comment = "[" .. code .. "]"
            end
        end
        yield(cand)
    end
end

return filter
