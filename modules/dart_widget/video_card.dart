// Dart & Flutter Cross-Platform Companion UI Component

class DonghuaModel {
  final String id;
  final String title;
  final String posterUrl;
  final double rating;
  final int totalEpisodes;

  const DonghuaModel({
    required this.id,
    required this.title,
    required this.posterUrl,
    required this.rating,
    required this.totalEpisodes,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'posterUrl': posterUrl,
    'rating': rating,
    'totalEpisodes': totalEpisodes,
  };
}

class DonghuaWidgetPresenter {
  static void renderCard(DonghuaModel movie) {
    print('[Dart Flutter Module] Rendered Anime Card: ${movie.title} ⭐ ${movie.rating}/10');
  }
}
