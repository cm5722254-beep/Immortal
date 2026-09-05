# Julia High-Performance Bandwidth & CDN Cost Optimizer

function optimize_cdn_routing(r2_cost_per_gb::Float64, egress_gb::Float64, cache_hit_ratio::Float64)
    direct_bandwidth = egress_gb * (1.0 - cache_hit_ratio)
    total_cost = direct_bandwidth * r2_cost_per_gb
    println("[Julia Optimizer] Computed Egress Cost: \$", round(total_cost, digits=2), " for ", egress_gb, " GB")
    return total_cost
end

optimize_cdn_routing(0.015, 50000.0, 0.85)
