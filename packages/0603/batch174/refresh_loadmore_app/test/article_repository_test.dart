import 'package:flutter_test/flutter_test.dart';

import 'package:refresh_loadmore_app/article_repository.dart';

void main() {
  group('ArticleRepository', () {
    test('fetchArticles returns correct number of articles', () async {
      final repo = ArticleRepository(delay: Duration.zero);
      final articles = await repo.fetchArticles(0, 20);
      expect(articles.length, 20);
      expect(articles[0].id, 0);
      expect(articles[19].id, 19);
    });

    test('fetchArticles uses correct startIndex', () async {
      final repo = ArticleRepository(delay: Duration.zero);
      final articles = await repo.fetchArticles(20, 20);
      expect(articles[0].id, 20);
      expect(articles[19].id, 39);
    });

    test('fetchArticles throws when shouldFail returns true', () async {
      final repo = ArticleRepository(
        delay: Duration.zero,
        shouldFail: () => true,
      );
      expect(() => repo.fetchArticles(0, 20), throwsA(isA<Exception>()));
    });

    test('fetchArticles does not throw when shouldFail returns false', () async {
      final repo = ArticleRepository(
        delay: Duration.zero,
        shouldFail: () => false,
      );
      final articles = await repo.fetchArticles(0, 20);
      expect(articles.length, 20);
    });
  });
}
