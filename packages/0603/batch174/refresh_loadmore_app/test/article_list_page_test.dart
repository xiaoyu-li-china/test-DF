import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:refresh_loadmore_app/article_repository.dart';
import 'package:refresh_loadmore_app/main.dart';

class TestArticleRepository extends ArticleRepository {
  final int totalItems;
  bool _shouldFail = false;

  TestArticleRepository({
    this.totalItems = 100,
    Duration delay = Duration.zero,
  }) : super(delay: delay);

  void setShouldFail(bool value) => _shouldFail = value;

  @override
  Future<List<Article>> fetchArticles(int startIndex, int count) async {
    await Future.delayed(delay);
    if (_shouldFail) {
      throw Exception('Network error');
    }
    final remaining = totalItems - startIndex;
    final actualCount = remaining < count ? remaining : count;
    return List.generate(actualCount, (i) {
      final index = startIndex + i;
      return Article(
        id: index,
        title: 'Article #$index',
        summary: 'Summary of article #$index',
      );
    });
  }
}

void main() {
  late TestArticleRepository testRepo;

  setUp(() {
    testRepo = TestArticleRepository(delay: Duration.zero);
  });

  group('ArticleListPage state transitions', () {
    testWidgets('initial load shows loading then displays data',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: testRepo),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();

      expect(find.byType(ListView), findsOneWidget);
      expect(find.byType(Card), findsNWidgets(20));
      expect(find.text('Article #0'), findsOneWidget);
      expect(find.text('Article #19'), findsOneWidget);
    });

    testWidgets('pull-to-refresh reloads data from start', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: testRepo),
        ),
      );
      await tester.pumpAndSettle();

      await tester.drag(
        find.byType(ListView),
        const Offset(0, 100),
      );
      await tester.pumpAndSettle();

      expect(find.byType(Card), findsNWidgets(20));
      expect(find.text('Article #0'), findsOneWidget);
      expect(find.text('Article #19'), findsOneWidget);
    });

    testWidgets('scroll to bottom triggers load more', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: testRepo),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(Card), findsNWidgets(20));

      await tester.drag(
        find.byType(ListView),
        const Offset(0, -1000),
      );
      await tester.pumpAndSettle();

      expect(find.byType(Card), findsNWidgets(40));
      expect(find.text('Article #39'), findsOneWidget);
    });

    testWidgets('initial load error shows error state', (tester) async {
      testRepo.setShouldFail(true);

      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: testRepo),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('加载失败'), findsOneWidget);
      expect(find.text('点击重试'), findsOneWidget);
    });

    testWidgets('click retry button after initial error reloads data',
        (tester) async {
      testRepo.setShouldFail(true);

      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: testRepo),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('加载失败'), findsOneWidget);

      testRepo.setShouldFail(false);

      await tester.tap(find.text('点击重试'));
      await tester.pumpAndSettle();

      expect(find.byType(Card), findsNWidgets(20));
      expect(find.text('Article #0'), findsOneWidget);
    });

    testWidgets('load more error shows retry footer', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: testRepo),
        ),
      );
      await tester.pumpAndSettle();

      testRepo.setShouldFail(true);

      await tester.drag(
        find.byType(ListView),
        const Offset(0, -1000),
      );
      await tester.pumpAndSettle();

      expect(find.text('加载失败，点击重试'), findsOneWidget);
      expect(find.byType(Card), findsNWidgets(20));
    });

    testWidgets('click footer retry button reloads more data', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: testRepo),
        ),
      );
      await tester.pumpAndSettle();

      testRepo.setShouldFail(true);

      await tester.drag(
        find.byType(ListView),
        const Offset(0, -1000),
      );
      await tester.pumpAndSettle();

      expect(find.text('加载失败，点击重试'), findsOneWidget);

      testRepo.setShouldFail(false);

      await tester.tap(find.text('加载失败，点击重试'));
      await tester.pumpAndSettle();

      expect(find.byType(Card), findsNWidgets(40));
      expect(find.text('Article #39'), findsOneWidget);
    });

    testWidgets('stops loading when reaching max items', (tester) async {
      final limitedRepo = TestArticleRepository(
        totalItems: 50,
        delay: Duration.zero,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: limitedRepo),
        ),
      );
      await tester.pumpAndSettle();

      for (var i = 0; i < 5; i++) {
        await tester.drag(
          find.byType(ListView),
          const Offset(0, -1000),
        );
        await tester.pumpAndSettle();
      }

      expect(find.byType(Card), findsNWidgets(50));
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('empty state shows when no data', (tester) async {
      final emptyRepo = TestArticleRepository(
        totalItems: 0,
        delay: Duration.zero,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ArticleListPage(repository: emptyRepo),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('暂无数据'), findsOneWidget);
      expect(find.text('点击刷新'), findsOneWidget);
    });
  });
}
