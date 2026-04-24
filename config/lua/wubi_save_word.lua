-- 造词助手：按 Ctrl+Enter 将当前候选词保存到五笔扩展词库并上屏
-- 用法：正常用拼音打字，想保存时按 Ctrl+Enter 代替普通回车

local EXTRA_DICT = os.getenv("HOME") .. "/Library/Rime/wubi86_jidian_extra.dict.yaml"
local BUILD_DIR = os.getenv("HOME") .. "/Library/Rime/build/"
local wubi_reverse
local init_done = false

local function init()
    init_done = true
    local ok, err = pcall(function()
        wubi_reverse = ReverseDb(BUILD_DIR .. "wubi86_jidian.reverse.bin")
    end)
end

local function get_char_code(char)
    if not wubi_reverse then return nil end
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

local function calc_code(text)
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

local function word_exists(word)
    local f = io.open(EXTRA_DICT, "r")
    if not f then return false end
    for line in f:lines() do
        if line:match("^" .. word .. "\t") then
            f:close()
            return true
        end
    end
    f:close()
    return false
end

local function save_word(word, code)
    if word_exists(word) then return false end
    local f = io.open(EXTRA_DICT, "a")
    if not f then return false end
    f:write(word .. "\t" .. code .. "\n")
    f:close()
    return true
end

local kRejected = 0
local kAccepted = 1

local function processor(key_event, env)
    if key_event:repr() ~= "Control+Return" then
        return kRejected
    end

    if not init_done then init() end

    local context = env.engine.context
    if not context:is_composing() then return kRejected end

    local composition = context.composition
    if composition:empty() then return kRejected end

    local segment = composition:back()
    if not segment or segment.menu:empty() then return kRejected end

    local idx = segment.selected_index or 0
    local cand = segment.menu:candidate_at(idx) or segment.menu:candidate_at(0)
    if not cand then return kRejected end

    local word = cand.text
    if utf8.len(word) > 1 and wubi_reverse then
        local code = calc_code(word)
        if code then
            if save_word(word, code) then
                os.execute("/Library/Input\\ Methods/Squirrel.app/Contents/MacOS/Squirrel --reload > /dev/null 2>&1 &")
            end
        end
    end

    env.engine:commit_text(word)
    context:clear()
    return kAccepted
end

return processor
