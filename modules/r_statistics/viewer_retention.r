# R Viewer Retention & Statistical Modeling Script

calculate_dropoff_curve <- function(episode_lengths, watch_durations) {
  retention_rate <- (watch_durations / episode_lengths) * 100
  mean_retention <- mean(retention_rate)
  
  cat(sprintf("[R Stats] Average Audience Retention: %.2f%%\n", mean_retention))
  return(retention_rate)
}

episodes <- c(1400, 1400, 1400, 1400, 1400) # seconds
watches <- c(1350, 1200, 1400, 950, 1100)
calculate_dropoff_curve(episodes, watches)
