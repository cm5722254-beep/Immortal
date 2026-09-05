package com.merdonghua.analytics

case class ViewingEvent(userId: String, movieId: String, durationSeconds: Long, timestamp: Long)

object ViewAnalyticsEngine {
  def calculatePopularityScore(views: List[ViewingEvent]): Map[String, Double] = {
    views.groupBy(_.movieId).map { case (movieId, events) =>
      val totalWatchTime = events.map(_.durationSeconds).sum
      val uniqueUsers = events.map(_.userId).distinct.size
      val score = (totalWatchTime * 0.7) + (uniqueUsers * 100 * 0.3)
      (movieId, score)
    }
  }

  def main(args: Array[String]): Unit = {
    println("[Scala Big Data] Video View Analytics Engine initialized.")
  }
}
