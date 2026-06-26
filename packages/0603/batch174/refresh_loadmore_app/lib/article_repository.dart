class Article {
  final int id;
  final String title;
  final String summary;

  Article({required this.id, required this.title, required this.summary});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Article &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          title == other.title &&
          summary == other.summary;

  @override
  int get hashCode => id.hashCode ^ title.hashCode ^ summary.hashCode;
}

class ArticleRepository {
  final Duration delay;
  final bool Function()? shouldFail;

  ArticleRepository({
    this.delay = const Duration(milliseconds: 800),
    this.shouldFail,
  });

  List<Article> _generateMockData(int startIndex, int count) {
    return List.generate(count, (i) {
      final index = startIndex + i;
      return Article(
        id: index,
        title: 'Article #$index',
        summary: 'This is the summary of article #$index. '
            'It contains some brief description for demo purposes.',
      );
    });
  }

  Future<List<Article>> fetchArticles(int startIndex, int count) async {
    await Future.delayed(delay);
    if (shouldFail != null && shouldFail!()) {
      throw Exception('Network error');
    }
    return _generateMockData(startIndex, count);
  }
}
