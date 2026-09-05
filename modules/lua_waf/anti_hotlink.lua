-- Lua OpenResty / Nginx Web Application Firewall (WAF) & Anti-Hotlink Guard

local ngx = ngx or {}
local allowed_domains = {
    ["merdonghua.com"] = true,
    ["www.merdonghua.com"] = true,
    ["namianime.com"] = true,
    ["localhost"] = true
}

local function check_hotlink()
    local referer = ngx.var and ngx.var.http_referer or ""
    
    if referer == "" then
        -- Allow direct mobile app requests
        return true
    end

    local host = string.match(referer, "https?://([^/]+)")
    if host and allowed_domains[host] then
        return true
    end

    -- Block unauthorized hotlinking
    if ngx.exit and ngx.HTTP_FORBIDDEN then
        ngx.log(ngx.WARN, "[Lua WAF] Blocked unauthorized hotlink attempt from: ", referer)
        ngx.exit(ngx.HTTP_FORBIDDEN)
    end
    return false
end

-- Execute check
check_hotlink()
